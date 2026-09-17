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
- login/signup API
- contact form submission backend

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
