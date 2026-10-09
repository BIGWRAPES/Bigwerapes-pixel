const message = document.getElementById('businessMessage');
const profile = document.getElementById('businessProfile');
const shareButton = document.getElementById('shareButton');
const copyLinkButton = document.getElementById('copyLinkButton');
const productViewer = document.getElementById('productViewer');
const productViewerImage = document.getElementById('productViewerImage');
const productViewerClose = document.getElementById('productViewerClose');
const productViewerPrevious = document.getElementById('productViewerPrevious');
const productViewerNext = document.getElementById('productViewerNext');
let activeProductImages = [];
let activeProductImageIndex = 0;

function showError(text) {
  message.textContent = text;
  message.className = 'alert alert-warning';
  message.hidden = false;
}

function imageUrl(supabase, path) {
  if (!path) return '';
  return supabase.storage.from('business-images').getPublicUrl(path).data.publicUrl;
}

function contactAnchor(label, href, value, external = false) {
  const contactValue = typeof value === 'string' ? value.trim() : '';
  if (!contactValue) return null;
  const link = document.createElement('a');
  link.textContent = `${label}: ${contactValue}`;
  link.href = href;
  if (external) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  return link;
}

function getWhatsAppUrl(business) {
  const phoneNumber = String(business.whatsapp_number || '').replace(/\D/g, '');
  if (!phoneNumber) return '';
  return `https://wa.me/${phoneNumber}`;
}

function getInstagramUrl(value) {
  if (!value) return '';
  const input = value.trim();
  if (/^https:\/\//i.test(input)) {
    try {
      const url = new URL(input);
      return ['instagram.com', 'www.instagram.com'].includes(url.hostname) ? url.href : '';
    } catch {
      return '';
    }
  }
  const handle = input.replace(/^@/, '');
  return /^[a-zA-Z0-9._]+$/.test(handle) ? `https://www.instagram.com/${encodeURIComponent(handle)}/` : '';
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
}

function renderBusiness(business, supabase) {
  document.title = `${business.business_name} - BigWrapes Pixel`;
  document.querySelector('meta[name="description"]').content =
    `${business.business_name} - ${business.category}. ${business.description || 'Discover this student-run business on BigWrapes Pixel.'}`.slice(0, 160);
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = document.querySelector('meta[name="description"]').content;

  document.getElementById('businessName').textContent = business.business_name;
  document.getElementById('businessCategory').textContent = business.category || '';
  document.getElementById('businessDescription').textContent = business.description || '';

  const cover = document.getElementById('businessCover');
  const coverUrl = business.image_path
    ? imageUrl(supabase, business.image_path)
    : business.cover_image_url || business.logo_url || '';
  if (coverUrl) {
    cover.src = coverUrl;
    cover.alt = `${business.business_name} cover`;
    cover.hidden = false;
  }

  const publicProducts = Array.isArray(business.products) && business.products.length
    ? business.products
    : [];

  const legacyProductImages = Array.isArray(business.business_product_images) && business.business_product_images.length
    ? business.business_product_images
    : [];

  const productItems = [];
  if (publicProducts.length) {
    publicProducts.forEach((product) => {
      const images = Array.isArray(product.business_product_images) ? product.business_product_images : [];
      const title = product.name || business.business_name;
      productItems.push({
        title,
        description: product.description || '',
        price: formatPrice(product.price),
        images: images
          .map((photo) => ({
            src: imageUrl(supabase, photo.image_path),
            alt: `${title} product`
          }))
          .filter((item) => item.src)
      });
    });
  }

  if (legacyProductImages.length) {
    productItems.push({
      title: 'Product photos',
      description: '',
      price: '',
      images: legacyProductImages
        .map((photo) => ({
          src: imageUrl(supabase, photo.image_path),
          alt: `${business.business_name} product`
        }))
        .filter((item) => item.src)
    });
  }

  const productGrid = document.getElementById('businessProducts');
  productGrid.replaceChildren();
  productItems.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'business-product-card';
    const title = document.createElement('h3');
    title.className = 'business-product-title';
    title.textContent = item.title;
    card.append(title);

    if (item.description) {
      const description = document.createElement('p');
      description.className = 'business-product-description';
      description.textContent = item.description;
      card.append(description);
    }

    if (item.price) {
      const price = document.createElement('p');
      price.className = 'business-product-price';
      price.textContent = item.price;
      card.append(price);
    }

    const viewButton = document.createElement('button');
    viewButton.className = 'btn btn-outline-primary business-product-view';
    viewButton.type = 'button';
    viewButton.textContent = item.images.length ? 'View item' : 'No photos available';
    viewButton.disabled = item.images.length === 0;
    if (item.images.length) {
      viewButton.setAttribute('aria-label', `View photos for ${item.title}`);
      viewButton.addEventListener('click', () => openProductViewer(item.images, 0));
    }
    card.append(viewButton);
    productGrid.append(card);
  });
  document.getElementById('productsSection').hidden = productGrid.childElementCount === 0;

  const contacts = document.getElementById('businessContacts');
  const location = business.location ? document.createElement('span') : null;
  if (location) location.textContent = `Location: ${business.location}`;
  const entries = [
    location,
    contactAnchor('Phone', `tel:${(business.phone || '').replace(/[^+\d]/g, '')}`, business.phone),
    contactAnchor('Email', `mailto:${(business.email || '').trim()}`, business.email),
    contactAnchor('Instagram', getInstagramUrl(business.instagram), business.instagram, true)
  ].filter(Boolean);
  entries.forEach((entry) => contacts.append(entry));
  document.getElementById('contactSection').hidden = contacts.childElementCount === 0;

  const whatsappUrl = getWhatsAppUrl(business);
  const whatsappButton = document.getElementById('whatsappButton');
  if (whatsappUrl) {
    whatsappButton.href = whatsappUrl;
    whatsappButton.hidden = false;
  }

  message.hidden = true;
  profile.hidden = false;
}

function updateProductViewer() {
  const image = activeProductImages[activeProductImageIndex];
  productViewerImage.src = image.src;
  productViewerImage.alt = image.alt;
  const multipleImages = activeProductImages.length > 1;
  productViewerPrevious.hidden = !multipleImages;
  productViewerNext.hidden = !multipleImages;
}

function openProductViewer(images, index) {
  activeProductImages = images;
  activeProductImageIndex = index;
  updateProductViewer();
  productViewer.showModal();
}

productViewerClose.addEventListener('click', () => productViewer.close());
productViewerPrevious.addEventListener('click', () => {
  activeProductImageIndex = (activeProductImageIndex - 1 + activeProductImages.length) % activeProductImages.length;
  updateProductViewer();
});
productViewerNext.addEventListener('click', () => {
  activeProductImageIndex = (activeProductImageIndex + 1) % activeProductImages.length;
  updateProductViewer();
});
productViewer.addEventListener('click', (event) => {
  if (event.target === productViewer) productViewer.close();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && productViewer.open) {
    event.preventDefault();
    productViewer.close();
  }
});

async function loadBusiness() {
  const slug = new URLSearchParams(window.location.search).get('slug')?.trim();
  if (!slug) throw new Error('This business link is missing its slug. Return to the directory and choose a business.');

  let supabase;
  let queryError;
  try {
    supabase = await window.supabaseReady;
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        id,
        business_name,
        business_slug,
        category,
        description,
        image_path,
        whatsapp_number,
        phone,
        email,
        location,
        instagram,
        business_product_images(image_path),
        products(id, name, description, price, business_product_images(image_path))
      `)
      .eq('business_slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      renderBusiness(data, supabase);
      return;
    }
  } catch (error) {
    queryError = error;
  }

  const response = await fetch('assets/data/businesses.json');
  if (!response.ok) throw queryError || new Error('Unable to load this business profile.');
  const businesses = await response.json();
  const business = businesses.find((item) => item.business_slug === slug);
  if (business) {
    renderBusiness(business, null);
    return;
  }
  if (queryError) throw queryError;
  throw new Error('This business profile could not be found.');
}

shareButton.addEventListener('click', async () => {
  const shareData = { title: document.title, url: window.location.href };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  await copyProfileLink();
});

async function copyProfileLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copyLinkButton.innerHTML = '<i class="bi bi-check2" aria-hidden="true"></i> Link copied';
  } catch {
    showError('Could not copy the link. Copy the page address from your browser.');
  }
}

copyLinkButton.addEventListener('click', copyProfileLink);

loadBusiness().catch((error) => showError(error.message || 'Unable to load this business profile.'));