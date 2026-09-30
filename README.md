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

New submitted businesses are stored in Supabase and shown alongside the existing manually maintained entries in `assets/data/businesses.json`. Each business has one cover image and up to 15 product images. Owners can add photos later and delete a specific product photo from the signed-in business page. The product-image migration enforces the 15-photo maximum in SQL as well as in the browser. The `businesses` table and product photos are publicly readable, while business edits and product-image changes are limited by Supabase policies to the authenticated owner.

## Deploy to GitHub Pages
1. Push this folder to a GitHub repository.
2. In the repo, enable GitHub Pages.
3. Select the root branch or docs folder as the publishing source.
4. Publish and visit the GitHub Pages URL.

## Manual business editing
To add or update business cards, edit the file at `assets/data/businesses.json`.

Each item looks like this:

```json
{
  "id": 1,
  "business_name": "Your Business Name",
  "category": "Digital Services",
  "owner_name": "Owner Name",
  "description": "Short business description",
  "phone": "+234 800 000 0000",
  "whatsapp_link": "https://wa.me/2348000000000",
  "email": "hello@yourbusiness.com",
  "location": "Abuja, Nigeria",
  "rating": 4.9,
  "review_count": 12,
  "logo_url": "assets/img/portfolio/portfolio-3.webp",
  "cover_image_url": "assets/img/about/wall45.jpg",
  "portfolio": [
    { "title": "Project One", "image": "assets/img/portfolio/portfolio-1.webp" }
  ]
}
```

To add a new business, copy one object and replace the values.

## Important note
This static version is meant to keep the website visible online without the paid hosting/database requirement. Any feature that depends on server-side logic will need a future backend or external API service.
