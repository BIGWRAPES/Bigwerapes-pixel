# Nexa Duplicate for GitHub Pages

This folder is a static-only version of the site intended for GitHub Pages deployment.

## Included
- HTML pages
- CSS styling
- JavaScript front-end behavior
- Sample business JSON retained for reference (not displayed)

## Not included
- PHP backend
- MySQL database
- admin dashboard actions
- contact form submission backend

## Supabase setup for accounts and business listings
The student and entrepreneur signup pages, login, password reset, business submissions, and business image uploads use Supabase. The browser only uses the Supabase project URL and public anon key; never put a service-role key in this repository.

1. Install project dependencies with `npm install` (the Supabase client is listed in `package.json`).
2. In the Supabase dashboard, open **Project Settings > API** and copy the project URL and public anon key into `assets/js/supabase-config.js`.
3. In the Supabase SQL Editor, run `supabase/schema.sql` once if the original auth/business schema has not been installed yet. For product photos, run the additional migration `supabase/product-images-migration.sql` after the original schema. Do not rerun the original schema just to add product photos.
4. In **Authentication > URL Configuration**, set the Site URL to the deployed site root, for example `https://bigwrapes.github.io/Bigwerapes-pixel/`, and add that URL plus `https://bigwrapes.github.io/Bigwerapes-pixel/login.html` to Redirect URLs.
5. Enable email confirmations in Supabase Auth if you want new users to verify their email. Confirmation and password recovery return to `login.html`.
6. Deploy the updated files and test student signup, email confirmation, login, business image upload, and sign-out.

The site is static, so the Supabase SDK is loaded as a browser ES module from `esm.sh`; this lets GitHub Pages run the integration without a server build step. The npm dependency is also installed for local development and future bundling. Open the site through a local web server rather than `file://` so browser modules and relative URLs work correctly.

### Google sign-in and sign-up

Google OAuth buttons on the login, user signup, and entrepreneur signup pages return to `login.html`. In **Supabase > Authentication > URL Configuration**, allow `https://bigwrapes.github.io/Bigwerapes-pixel/login.html` as a redirect URL. For local testing, also allow the exact local callback URL, such as `http://127.0.0.1:8765/login.html`. Enable Google under **Authentication > Providers** and configure its Client ID and Client Secret there; never put the Google Client Secret in browser code. In Google Cloud Console, add the Supabase project's callback URL, `https://ohgzwgeitxigiunxptla.supabase.co/auth/v1/callback`, as an authorized redirect URI. First-time OAuth users complete any missing profile fields after returning to `login.html`; the signup page they started from supplies the user or entrepreneur account type.

New submitted businesses are stored in Supabase and are the only listings shown in the public directory and business profiles. The sample entries in `assets/data/businesses.json` remain in the repository for reference, but their directory loader and profile fallback are disabled. The submission form saves the owner's public name, avatar URL, and bio in `business_owner_public_profiles`; public owner cards link to `owner-profile.html?owner_id=...`, which loads that profile and its businesses. Each business has one cover image and up to 15 product images. Owners can add photos later and delete a specific product photo from the signed-in business page. The product-image migration enforces the 15-photo maximum in SQL as well as in the browser. The `businesses` table and product photos are publicly readable, while business edits and product-image changes are limited by Supabase policies to the authenticated owner.

Regular user accounts keep the existing `student` value in `profiles.account_type` for compatibility, but are labeled **User** in the signup flow and are directed to the business directory after sign-in. Entrepreneur accounts are directed to the business management page, which checks the signed-in user's profile account type before loading dashboard functionality.

## BIGWRAPES AI Business Assistant (Cloudflare Workers AI adapter)

The assistant UI is on the separate `ai-assistant.html` page. The entrepreneur business-management page links to it; the page independently checks the Supabase session and entrepreneur account type. The Edge Function repeats those checks and rejects unauthenticated and non-entrepreneur callers, so the page guard is not the only authorization control. It supports product descriptions, social captions, WhatsApp messages, and business-description improvements. Generated text stays editable. Users can copy the result or send product/business-description drafts back to the dashboard, where existing text requires confirmation before replacement. Draft transfer uses tab-scoped `sessionStorage`, is bound to the authenticated user, and is never submitted automatically.

The server-side provider adapter in `supabase/functions/ai-business-assistant/provider.ts` targets Cloudflare Workers AI and returns no provider until both server environment values are configured. The Edge Function therefore returns an explicit `503` if the provider is not configured; it does not pretend generation worked. Do not put provider credentials in browser files, public environment variables, or committed files. Send only the content the user enters for the requested draft; never send passwords, session/access tokens, or unrelated profile fields.

### Provider choice and terms

Gemini has been ruled out for this student-facing site: Google's [terms](https://ai.google.dev/gemini-api/terms) disallow API clients directed to or likely to be accessed by under-18s, require paid service for users in the EEA, Switzerland, or UK, and allow unpaid-tier prompts/outputs to be used to improve products and potentially reviewed by people. This site does not impose the age and region restrictions needed for Gemini.

The recommended candidate is [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/) using the currently listed text model `@cf/qwen/qwen3-30b-a3b-fp8`. Cloudflare documents a free-plan allowance of 10,000 Neurons per account per UTC day. This allowance is shared across requests and models, can be exhausted, and is not unlimited. On the free plan, requests fail when the allocation is exceeded; on a paid Workers plan, usage above the allowance is currently billed at $0.011 per 1,000 Neurons. Keep the account on the free plan if avoiding charges is required, and monitor usage.

Cloudflare says Workers AI inputs and outputs are customer content, are not exposed to other Cloudflare customers, and are not used to train/improve models or services; they may be stored if combined with a separate Cloudflare storage service. Cloudflare's general agreement grants processing rights as necessary to provide the service and makes the customer responsible for rights, permissions, and legal compliance. The adapter does not use Cloudflare storage. Review the applicable [data-usage terms](https://developers.cloudflare.com/workers-ai/platform/data-usage/), [Cloudflare service agreement](https://www.cloudflare.com/terms/), and the model's license before production use. The official material reviewed did not surface Gemini's explicit under-18 restriction for Workers AI; that is not legal advice or a blanket compliance determination. No provider credential is configured, and no live AI request has been made.

### Backend security design

The Edge Function verifies the bearer access token with Supabase Auth, reads only `profiles.account_type`, and requires `entrepreneur`. It accepts only four action names and validates non-empty, bounded text fields (maximum body 8 KiB; field caps are in `index.ts`). It never uses an admin/service-role key. The provider adapter is server-side, uses an account-scoped Cloudflare token, bounds provider responses, and receives a timeout `AbortSignal`; the function maps failures to safe client messages and does not log prompts, provider responses, or credentials. Generated text is returned to the browser only, not stored in the database. CORS is not an authorization mechanism; the verified caller and account checks are.

The rate-limit SQL uses a per-user row lock to serialize concurrent requests, then counts an event ledger inside the trailing one-hour interval (maximum 10). The quota RPC rechecks the entrepreneur profile even if called directly, derives identity from `auth.uid()`, uses `SECURITY DEFINER` with an empty search path, has RLS enabled on private tables, revokes direct table access, and grants function execution only to `authenticated`. If upgrading from the earlier fixed-window migration, the SQL conservatively seeds recent old counts. This is a code review, not a substitute for testing against a local PostgreSQL/Supabase instance.

### Local validation (does not change the live project)

Install Deno, Supabase CLI, and PostgreSQL's `psql` client. From the repository root, run:

```powershell
deno check supabase/functions/ai-business-assistant/index.ts
deno check supabase/functions/ai-business-assistant/provider.ts
supabase start
psql "<LOCAL_SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f supabase/ai-assistant-rate-limit.sql
```

Use only the local database URL printed by `supabase start`; do not substitute a production connection string. Verify grants and RLS in that local database:

```sql
select
  has_function_privilege('anon', 'public.consume_ai_generation_quota()', 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', 'public.consume_ai_generation_quota()', 'EXECUTE') as authenticated_can_execute,
  has_table_privilege('anon', 'public.ai_generation_requests', 'SELECT') as anon_can_read_ledger,
  has_table_privilege('authenticated', 'public.ai_generation_requests', 'SELECT') as user_can_read_ledger;

select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('ai_generation_limits', 'ai_generation_requests');
```

Expected values are `false, true, false, false` and RLS enabled for both tables. In a disposable local project with test users, verify 10 successful quota calls, denial on the 11th, expiry of a request after one hour, independent user quotas, concurrent requests, direct calls by students, and anonymous calls. This migration has not been executed here or against a live project. Review and back up before manually applying it anywhere else.

For local AI testing, create a private environment file **outside the repository** (for example `C:\Users\<YOU>\.config\bigwrapes-ai\provider.env`) containing:

```text
CLOUDFLARE_ACCOUNT_ID=<your Cloudflare account ID>
CLOUDFLARE_API_TOKEN=<your scoped Workers AI token>
```

Create a Cloudflare API token limited to the Workers AI permissions in Cloudflare's [REST API setup guide](https://developers.cloudflare.com/workers-ai/get-started/rest-api/). Do not paste a real token into chat, source files, or command line. Store it locally using the Supabase CLI:

```powershell
supabase start
supabase functions serve ai-business-assistant --env-file "<PRIVATE_ENV_FILE>"
```

For the remote project, only after reviewing terms, verifying the free account/budget settings, testing locally, and receiving explicit approval, configure the secrets and deploy manually:

```powershell
supabase secrets set --env-file "<PRIVATE_ENV_FILE>" --project-ref <PROJECT_REF>
supabase functions deploy ai-business-assistant --project-ref <PROJECT_REF>
```

Use an environment file containing only Edge Function values; never include `VITE_*`, `PUBLIC_*`, or browser configuration. Verify `<PRIVATE_ENV_FILE>` is outside the repository or ignored and never run commands with literal token values. Neither command has been run.

### Manual test plan

1. With a local/deployed test environment and a configured Workers AI test token, an authenticated entrepreneur should generate each of the four action types.
2. A logged-out request must return `401`; a signed-in student must receive `403`, including when calling the function endpoint or quota RPC directly.
3. Test malformed JSON, empty text, unsupported actions, over-length fields, and bodies over 8 KiB. They must be rejected without contacting the provider.
4. Make the mock provider return timeout, `429`, invalid JSON, an error body containing sensitive details, and empty output. The client should receive only safe messages; secrets and prompts must not be logged or returned.
5. Test ten allowed requests and an eleventh denied request within the same trailing hour, a request after the oldest event expires, parallel requests, and separate users.
6. On the page, confirm generated text is editable/copyable and no output is written automatically to the database.
7. Real AI generation remains untested and unavailable until a provider is selected, reviewed for age/geography/privacy, implemented, and configured.

Beginner glossary: the **model** produces text; the **API** is how the server asks it for text; the **Edge Function** authenticates and validates the request without exposing credentials; the **API key** is the provider credential stored only on that server boundary. The app's Supabase publishable key is designed to be public and is not an AI provider key.

## Business pictures and account deletion

On the signed-in business page, each business has controls to change or delete its cover picture. Replacements upload a new file first, switch `businesses.image_path` only after upload succeeds, and then try to remove the old file. Removing a picture clears `image_path` and displays the site default image. Both operations use the existing `business-images` bucket and the authenticated owner's Storage policies.

The Danger Zone calls the `delete-account` Supabase Edge Function. The function verifies the caller's access token, recursively removes files under that user's `business-images/<user-id>/` folder through Storage, deletes product-image rows for that user's businesses and their public owner profile, then deletes the Supabase Auth user. Existing foreign-key cascades remove the profile and businesses. Each step is retryable while the Auth user remains. The function reads Supabase's server-injected `SUPABASE_SECRET_KEYS` and `SUPABASE_PUBLISHABLE_KEYS` default keys (with legacy-key fallbacks); privileged keys stay in the Edge Function environment and are never sent to the browser.

Before deploying, inspect the **live** Supabase project rather than assuming the checked-in SQL matches it. Confirm the bucket and policies, `businesses.image_path` and `owner_id`, the `business_owner_public_profiles.owner_id` table/column, and the live foreign keys/cascades. The repository contains no separate application-data table; if the live project has additional user-related tables, add their explicit cleanup to `supabase/functions/delete-account/index.ts` before deployment. Deploy with the Supabase CLI using `supabase functions deploy delete-account`, and configure the service-role secret in the Supabase Edge Function environment. Never put that key in this repository or browser code.

## Deploy to GitHub Pages
1. Push this folder to a GitHub repository.
2. In the repo, enable GitHub Pages.
3. Select the root branch or docs folder as the publishing source.
4. Publish and visit the GitHub Pages URL.

## Business listings
Only listings saved in Supabase are loaded by the public directory and business profiles. Add listings through the signed-in entrepreneur form. The sample entries in `assets/data/businesses.json` are not used by the site.

## Important note
This static version is meant to keep the website visible online without the paid hosting/database requirement. Any feature that depends on server-side logic will need a future backend or external API service.
