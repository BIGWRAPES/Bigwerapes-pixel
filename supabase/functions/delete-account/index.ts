import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const bucketName = 'business-images';
const storagePageSize = 100;

function getDefaultApiKey(keysJson: string | undefined, variableName: string) {
  if (!keysJson) return undefined;

  let keys: unknown;
  try {
    keys = JSON.parse(keysJson);
  } catch {
    throw new Error(`${variableName} is not valid JSON.`);
  }

  if (!keys || typeof keys !== 'object' || Array.isArray(keys)) {
    throw new Error(`${variableName} must be a JSON object.`);
  }

  const defaultKey = (keys as Record<string, unknown>).default;
  if (typeof defaultKey !== 'string' || !defaultKey) {
    throw new Error(`${variableName} does not contain a default key.`);
  }
  return defaultKey;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function listUserStorageFiles(adminClient: ReturnType<typeof createClient>, userId: string) {
  const files: string[] = [];
  const folders = [userId];

  while (folders.length > 0) {
    const folder = folders.pop();
    if (!folder) continue;
    let offset = 0;

    while (true) {
      const { data, error } = await adminClient.storage
        .from(bucketName)
        .list(folder, {
          limit: storagePageSize,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        });
      if (error) throw error;
      if (!data?.length) break;

      for (const entry of data) {
        const path = `${folder}/${entry.name}`;
        if (entry.id === null) folders.push(path);
        else files.push(path);
      }

      offset += data.length;
      if (data.length < storagePageSize) break;
    }
  }

  return files;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const authorization = request.headers.get('Authorization');
    const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) return jsonResponse({ error: 'Authentication is required.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const publishableKey = getDefaultApiKey(
      Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'),
      'SUPABASE_PUBLISHABLE_KEYS',
    ) ?? Deno.env.get('SUPABASE_ANON_KEY');
    const secretKey = getDefaultApiKey(
      Deno.env.get('SUPABASE_SECRET_KEYS'),
      'SUPABASE_SECRET_KEYS',
    ) ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !publishableKey || !secretKey) {
      throw new Error('Required Supabase function secrets are not configured.');
    }

    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
    if (authError) {
      const status = authError.status === 401 ? 401 : 502;
      return jsonResponse({ error: `Unable to verify caller authentication: ${authError.message}` }, status);
    }
    if (!user) return jsonResponse({ error: 'The session is invalid or expired.' }, 401);

    const adminClient = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let currentStep = 'listing the caller’s Storage files';
    try {
      const storageFiles = await listUserStorageFiles(adminClient, user.id);

      currentStep = 'removing the caller’s Storage files';
      for (let index = 0; index < storageFiles.length; index += storagePageSize) {
        const batch = storageFiles.slice(index, index + storagePageSize);
        const { error } = await adminClient.storage.from(bucketName).remove(batch);
        if (error) throw error;
      }

      currentStep = 'finding the caller’s businesses';
      const businessIds: string[] = [];
      for (let offset = 0; ; offset += storagePageSize) {
        const { data, error } = await adminClient
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .range(offset, offset + storagePageSize - 1);
        if (error) throw error;
        if (!data?.length) break;

        businessIds.push(...data.map((business) => business.id));
        if (data.length < storagePageSize) break;
      }

      for (let index = 0; index < businessIds.length; index += storagePageSize) {
        const businessIdBatch = businessIds.slice(index, index + storagePageSize);
        currentStep = 'removing the caller’s product-image records';
        const { error: productImagesError } = await adminClient
          .from('business_product_images')
          .delete()
          .in('business_id', businessIdBatch);
        if (productImagesError) throw productImagesError;
      }

      currentStep = 'removing the caller’s public owner profile';
      const { error: ownerProfileError } = await adminClient
        .from('business_owner_public_profiles')
        .delete()
        .eq('owner_id', user.id);
      if (ownerProfileError) throw ownerProfileError;

      currentStep = 'removing the caller’s business records';
      const { error: deleteBusinessesError } = await adminClient
        .from('businesses')
        .delete()
        .eq('owner_id', user.id);
      if (deleteBusinessesError) throw deleteBusinessesError;

      currentStep = 'deleting the caller’s Auth user';
      const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);
      if (deleteUserError) throw deleteUserError;

      return jsonResponse({ success: true });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'An unexpected error occurred.';
      throw new Error(`Failed while ${currentStep}: ${detail}`);
    }
  } catch (error) {
    console.error('Account deletion failed:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return jsonResponse({ error: `Account deletion failed. The operation can be retried. ${message}` }, 500);
  }
});
