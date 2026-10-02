const message = document.getElementById('businessMessage');
const profile = document.getElementById('businessProfile');
const shareButton = document.getElementById('shareButton');
const copyLinkButton = document.getElementById('copyLinkButton');

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
  if (!value) return null;
  const link = document.createElement('a');
  link.textContent = `${label}: ${value}`;
  link.href = href;
  if (external) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  return link;
}

function getWhatsAppUrl(business) {
  if (business.whatsapp_link) {
    try {
      const url = new URL(business.whatsapp_link);
      if (url.protocol === 'https:' && ['wa.me', 'api.whatsapp.com', 'web.whatsapp.com'].includes(url.hostname)) {
        return url.href;
      }
    } catch {
      // Fall back to the stored phone number below.
    }
  }

  const phoneNumber = (business.whatsapp_number || '').replace(/\D/g, '');
  if (!phoneNumber) return '';
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent('Hello, I found your business on BigWrapes Pixel.')}`;
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

  const products = business.business_product_images?.length
    ? business.business_product_images.map((photo) => ({ src: imageUrl(supabase, photo.image_path), alt: `${business.business_name} product` }))
    : (business.portfolio || []).map((item) => ({ src: item.image, alt: item.title || `${business.business_name} product` }));
  const productGrid = document.getElementById('businessProducts');
  products.filter((item) => item.src).forEach((item) => {
    const image = document.createElement('img');
    image.src = item.src;
    image.alt = item.alt;
    image.loading = 'lazy';
    productGrid.append(image);
  });
  document.getElementById('productsSection').hidden = productGrid.childElementCount === 0;

  const contacts = document.getElementById('businessContacts');
  const location = business.location ? document.createElement('span') : null;
  if (location) location.textContent = `Location: ${business.location}`;
  const entries = [
    location,
    contactAnchor('Phone', `tel:${(business.phone || '').replace(/[^+\d]/g, '')}`, business.phone),
    contactAnchor('Email', `mailto:${business.email || ''}`, business.email),
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

async function loadBusiness() {
  const slug = new URLSearchParams(window.location.search).get('slug')?.trim();
  if (!slug) throw new Error('This business link is missing its slug. Return to the directory and choose a business.');

  let supabase;
  let queryError;
  try {
    supabase = await window.supabaseReady;
    const { data, error } = await supabase
      .from('businesses')
      .select('id, business_name, business_slug, category, description, image_path, whatsapp_number, whatsapp_link, phone, email, location, instagram, business_product_images(image_path)')
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