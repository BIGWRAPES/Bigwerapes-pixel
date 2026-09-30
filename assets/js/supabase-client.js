import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config.js';

const configurationIsMissing =
  SUPABASE_URL.includes('YOUR_PROJECT_ID') ||
  SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');

if (configurationIsMissing) {
  window.supabaseReady = Promise.reject(
    new Error('Add your Supabase project URL and anon key in assets/js/supabase-config.js.')
  );
} else {
  window.supabaseReady = Promise.resolve(createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
}

window.supabaseReady.catch((error) => {
  console.warn(error.message);
});