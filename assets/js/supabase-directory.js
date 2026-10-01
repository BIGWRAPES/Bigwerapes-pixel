const directory = document.querySelector('.portfolio-grid');

function appendBusinessCard(business, imageUrl) {
  const column = document.createElement('div');
  column.className = 'col-lg-4 col-md-6 portfolio-item isotope-item';

  const card = document.createElement('article');
  card.className = 'portfolio-card';
  const image = document.createElement('img');
  image.className = 'img-fluid';
  image.src = imageUrl || 'assets/img/portfolio/portfolio-3.webp';
  image.alt = `${business.business_name} business image`;
  image.loading = 'lazy';

  const content = document.createElement('div');
  content.className = 'content';
  const title = document.createElement('h3');
  title.textContent = business.business_name;
  const category = document.createElement('p');
  category.textContent = business.category;
  const description = document.createElement('p');
  description.textContent = business.description;

  const ownerProfile = business.ownerProfile;
  const ownerLink = document.createElement(ownerProfile ? 'a' : 'span');
  ownerLink.className = 'business-owner-link';
  if (ownerProfile) {
    ownerLink.href = `owner-profile.html?owner_id=${encodeURIComponent(business.owner_id)}`;
  }
  ownerLink.textContent = ownerProfile?.owner_name || 'Student business owner';
  if (ownerProfile?.owner_avatar_url) {
    const ownerAvatar = document.createElement('img');
    ownerAvatar.src = ownerProfile.owner_avatar_url;
    ownerAvatar.alt = '';
    ownerAvatar.loading = 'lazy';
    ownerAvatar.width = 36;
    ownerAvatar.height = 36;
    ownerAvatar.style.cssText = 'width:36px;height:36px;object-fit:cover;border-radius:50%;margin-right:8px;';
    ownerLink.prepend(ownerAvatar);
  }

  content.append(title, category, ownerLink, description);
  if (business.business_product_images?.length) {
    const productGallery = document.createElement('div');
    productGallery.className = 'business-product-thumbnails';
    productGallery.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:8px;margin-top:12px;';
    business.business_product_images.forEach((photo, index) => {
      const productImage = document.createElement('img');
      productImage.src = photo.publicUrl;
      productImage.alt = `Product ${index + 1} from ${business.business_name}`;
      productImage.loading = 'lazy';
      productImage.style.cssText = 'width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;';
      productGallery.append(productImage);
    });
    content.append(productGallery);
  }
  card.append(image, content);
  column.append(card);
  directory.append(column);
}

if (directory) {
  const staticDirectoryReady = directory.dataset.staticLoaded === 'true'
    ? Promise.resolve()
    : new Promise((resolve) => directory.addEventListener('static-businesses-loaded', resolve, { once: true }));

  Promise.all([window.supabaseReady, staticDirectoryReady])
    .then(([supabase]) =>
      supabase
        .from('businesses')
        .select('id, owner_id, business_name, category, description, image_path, created_at, business_product_images(image_path)')
        .order('created_at', { ascending: false })
    )
    .then(({ data, error }) => {
      if (error) throw error;
      if (!data.length) return;

      return window.supabaseReady.then((supabase) => {
        const ownerIds = [...new Set(data.map((business) => business.owner_id).filter(Boolean))];
        return supabase
          .from('business_owner_public_profiles')
          .select('owner_id, owner_name, owner_avatar_url, owner_bio')
          .in('owner_id', ownerIds)
          .then(({ data: ownerProfiles, error: profileError }) => {
            if (profileError) throw profileError;
            const profilesByOwnerId = new Map(ownerProfiles.map((profile) => [profile.owner_id, profile]));

            data.forEach((business) => {
              const imageUrl = business.image_path
                ? supabase.storage.from('business-images').getPublicUrl(business.image_path).data.publicUrl
                : '';
              business.ownerProfile = profilesByOwnerId.get(business.owner_id);
              business.business_product_images = (business.business_product_images || []).map((photo) => ({
                publicUrl: supabase.storage.from('business-images').getPublicUrl(photo.image_path).data.publicUrl
              }));
              appendBusinessCard(business, imageUrl);
            });
          });
      });
    })
    .catch((error) => {
      console.info('Supabase business listings are unavailable:', error.message);
    });
}
