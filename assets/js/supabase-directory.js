const directory = document.querySelector('.portfolio-grid');
const searchInput = document.getElementById('directorySearchInput');
const searchButton = document.getElementById('directorySearchButton');
const searchStatus = document.getElementById('directorySearchStatus');
const defaultBusinessImage = 'assets/img/portfolio/portfolio-3.webp';

function getPublicStorageUrl(supabase, path) {
  if (!path) return defaultBusinessImage;
  const { data, error } = supabase.storage.from('business-images').getPublicUrl(path);
  if (error || !data?.publicUrl) return defaultBusinessImage;
  return data.publicUrl;
}

function appendBusinessCard(business, imageUrl) {
  const column = document.createElement('div');
  column.className = 'col-6 col-md-4 col-xl-3 portfolio-item isotope-item';

  const card = document.createElement('article');
  card.className = 'portfolio-card';
  const image = document.createElement('img');
  image.className = 'img-fluid';
  image.src = imageUrl || defaultBusinessImage;
  image.alt = `${business.business_name} business image`;
  image.loading = 'lazy';
  const imageContainer = document.createElement('div');
  imageContainer.className = 'image-container';
  imageContainer.append(image);

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
  if (business.business_slug) {
    const profileLink = document.createElement('a');
    profileLink.className = 'btn btn-primary btn-sm mt-3';
    profileLink.href = `business.html?slug=${encodeURIComponent(business.business_slug)}`;
    profileLink.textContent = 'View Business';
    content.append(profileLink);
  }
  if (business.business_product_images?.length) {
    const productGallery = document.createElement('div');
    productGallery.className = 'business-product-thumbnails';
    productGallery.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:8px;margin-top:12px;';
    business.business_product_images.slice(0, 2).forEach((photo, index) => {
      const productImage = document.createElement('img');
      productImage.src = photo.publicUrl;
      productImage.alt = `Product ${index + 1} from ${business.business_name}`;
      productImage.loading = 'lazy';
      productImage.style.cssText = 'width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;';
      productGallery.append(productImage);
    });
    content.append(productGallery);
  }
  card.append(imageContainer, content);
  column.append(card);
  directory.append(column);
}

function createSearchResultCard(row, supabase) {
  const isProductResult = row.result_type === 'product';
  const container = document.createElement('div');
  container.className = 'col-6 col-md-4 col-xl-3 portfolio-item isotope-item';

  const card = document.createElement('article');
  card.className = 'portfolio-card';

  const image = document.createElement('img');
  image.className = 'img-fluid';
  image.loading = 'lazy';
  const imagePath = isProductResult
    ? (row.product_image_path || row.business_image_path || row.image_path)
    : (row.business_image_path || row.image_path);
  image.src = imagePath ? getPublicStorageUrl(supabase, imagePath) : defaultBusinessImage;
  image.alt = isProductResult ? (row.product_name || 'Product image') : (row.business_name || 'Business image');

  const imageContainer = document.createElement('div');
  imageContainer.className = 'image-container';
  imageContainer.append(image);

  const content = document.createElement('div');
  content.className = 'content';

  const title = document.createElement('h3');
  title.textContent = isProductResult ? (row.product_name || row.business_name || 'Product') : (row.business_name || 'Business');

  const meta = document.createElement('p');
  meta.textContent = isProductResult
    ? `${row.business_name || 'Business'} • Product`
    : (row.category || 'Student business');

  const summary = document.createElement('p');
  summary.textContent = isProductResult
    ? (row.product_description || row.description || 'Search match from a local business listing.')
    : (row.description || 'Student business listing.');

  const ownerLink = document.createElement(row.owner_id ? 'a' : 'span');
  ownerLink.className = 'business-owner-link';
  if (row.owner_id) {
    ownerLink.href = `owner-profile.html?owner_id=${encodeURIComponent(row.owner_id)}`;
  }
  ownerLink.textContent = row.owner_name || 'Business owner';

  const action = document.createElement('a');
  action.className = 'btn btn-primary btn-sm mt-3';
  action.href = row.business_slug ? `business.html?slug=${encodeURIComponent(row.business_slug)}` : 'businesses.html';
  action.textContent = isProductResult ? 'View Business' : 'View Business';

  if (isProductResult && row.product_price !== null && row.product_price !== undefined && row.product_price !== '') {
    const price = document.createElement('p');
    price.style.marginTop = '0.5rem';
    const numericValue = Number(row.product_price);
    const formattedPrice = Number.isFinite(numericValue)
      ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(numericValue)
      : row.product_price;
    price.textContent = formattedPrice;
    content.append(title, meta, ownerLink, summary, price, action);
  } else {
    content.append(title, meta, ownerLink, summary, action);
  }

  card.append(imageContainer, content);
  container.append(card);
  return container;
}

async function runDirectorySearch() {
  if (!directory || !searchInput || !searchButton || !searchStatus) return;

  const term = searchInput.value.trim();
  if (!term) {
    searchStatus.textContent = 'Search businesses and products.';
    return;
  }

  searchStatus.textContent = 'Searching...';
  const supabase = await window.supabaseReady;
  const { data, error } = await supabase.rpc('search_marketplace_directory', {
    search_text: term,
    result_limit: 20
  });

  if (error) {
    searchStatus.textContent = 'Search is unavailable right now.';
    console.error('Directory search failed:', error);
    return;
  }

  const results = Array.isArray(data) ? data : [];
  directory.innerHTML = '';

  if (!results.length) {
    directory.innerHTML = `
      <div class="col-12 text-center" style="padding: 2rem 0; color: var(--text-secondary, #999);">
        <i class="bi bi-search" style="font-size: 2rem; display:block; margin-bottom: 0.75rem;"></i>
        <p>No businesses or products match “${term}”.</p>
      </div>
    `;
    searchStatus.textContent = 'No matches found.';
    return;
  }

  results.forEach((row) => {
    const searchCard = createSearchResultCard(row, supabase);
    if (searchCard) directory.append(searchCard);
  });

  searchStatus.textContent = `Showing ${results.length} match${results.length === 1 ? '' : 'es'} for “${term}”.`;
}

if (searchInput && searchButton) {
  searchButton.addEventListener('click', runDirectorySearch);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runDirectorySearch();
    }
  });
}

if (directory) {
  const staticDirectoryReady = directory.dataset.staticLoaded === 'true'
    ? Promise.resolve()
    : new Promise((resolve) => directory.addEventListener('static-businesses-loaded', resolve, { once: true }));

  Promise.all([window.supabaseReady, staticDirectoryReady])
    .then(([supabase]) =>
      supabase
        .from('businesses')
        .select('id, owner_id, business_name, business_slug, category, description, image_path, created_at, business_product_images(image_path)')
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
