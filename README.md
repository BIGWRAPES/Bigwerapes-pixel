# Nexa Duplicate for GitHub Pages

This folder is a static-only version of the site intended for GitHub Pages deployment.

## Included
- HTML pages
- CSS styling
- JavaScript front-end behavior
- Local JSON data for the businesses directory

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

New submitted businesses are stored in Supabase and shown alongside the existing manually maintained entries in `assets/data/businesses.json`. The submission form saves the owner's public name, avatar URL, and bio in `business_owner_public_profiles`; public owner cards link to `owner-profile.html?owner_id=...`, which loads that profile and its businesses. Each business has one cover image and up to 15 product images. Owners can add photos later and delete a specific product photo from the signed-in business page. The product-image migration enforces the 15-photo maximum in SQL as well as in the browser. The `businesses` table and product photos are publicly readable, while business edits and product-image changes are limited by Supabase policies to the authenticated owner.

Regular user accounts keep the existing `student` value in `profiles.account_type` for compatibility, but are labeled **User** in the signup flow and are directed to the business directory after sign-in. Entrepreneur accounts are directed to the business management page, which checks the signed-in user's profile account type before loading dashboard functionality.

## Business pictures and account deletion

On the signed-in business page, each business has controls to change or delete its cover picture. Replacements upload a new file first, switch `businesses.image_path` only after upload succeeds, and then try to remove the old file. Removing a picture clears `image_path` and displays the site default image. Both operations use the existing `business-images` bucket and the authenticated owner's Storage policies.

The Danger Zone calls the `delete-account` Supabase Edge Function. The function verifies the caller's access token, recursively removes files under that user's `business-images/<user-id>/` folder through Storage, deletes product-image rows for that user's businesses and their public owner profile, then deletes the Supabase Auth user. Existing foreign-key cascades remove the profile and businesses. Each step is retryable while the Auth user remains. The function reads Supabase's server-injected `SUPABASE_SECRET_KEYS` and `SUPABASE_PUBLISHABLE_KEYS` default keys (with legacy-key fallbacks); privileged keys stay in the Edge Function environment and are never sent to the browser.

Before deploying, inspect the **live** Supabase project rather than assuming the checked-in SQL matches it. Confirm the bucket and policies, `businesses.image_path` and `owner_id`, the `business_owner_public_profiles.owner_id` table/column, and the live foreign keys/cascades. The repository contains no separate application-data table; if the live project has additional user-related tables, add their explicit cleanup to `supabase/functions/delete-account/index.ts` before deployment. Deploy with the Supabase CLI using `supabase functions deploy delete-account`, and configure the service-role secret in the Supabase Edge Function environment. Never put that key in this repository or browser code.

## Deploy to GitHub Pages
1. Push this folder to a GitHub repository.
2. In the repo, enable GitHub Pages.
3. Select the root branch or docs folder as the publishing source.
4. Publish and visit the GitHub Pages URL.

## Manual business editing
To add or update business cards, edit the file at `assets/data/businesses.json`.

The file is a JSON array. Add a comma after the current last business object, then paste a new object before the closing `]`. Replace the example values with the real business details. Use an unused numeric `id` and a unique lowercase `business_slug`.

```json
{
  "id": 4,
  "business_name": "Your Business Name",
  "business_slug": "your-business-name",
  "description": "Describe the products or services this student business offers.",
  "category": "Digital Services",
  "logo_url": "assets/img/portfolio/portfolio-3.webp",
  "cover_image_url": "assets/img/about/wall45.jpg",
  "owner_name": "Student Owner",
  "owner_avatar_url": "assets/img/person/person-1.jpg",
  "owner_bio": "A short introduction to the student business owner.",
  "phone": "+234 800 000 0000",
  "whatsapp_number": "+2348000000000",
  "whatsapp_link": "https://wa.me/2348000000000",
  "email": "owner@example.com",
  "website_url": "https://example.com",
  "location": "Abuja, Nigeria",
  "rating": 0,
  "review_count": 0,
  "is_verified": false,
  "portfolio": [
    {
      "title": "Product or Service One",
      "image": "assets/img/portfolio/portfolio-1.webp"
    }
  ]
}
```

Keep the surrounding square brackets and put commas between objects, but not after the final object. The example above is a template only; it will appear on the site only after you add the object to `assets/data/businesses.json`. New accounts submitted through the signed-in form are stored in Supabase instead of this local file.

## Important note
This static version is meant to keep the website visible online without the paid hosting/database requirement. Any feature that depends on server-side logic will need a future backend or external API service.
