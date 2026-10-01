const message = document.getElementById('ownerPageMessage');
const profileSection = document.getElementById('ownerProfile');
const businessesContainer = document.getElementById('ownerBusinesses');
const bucketName = 'business-images';

function showMessage(text, type = 'danger') {
  message.textContent = text;
  message.className = `alert alert-${type}`;
  message.hidden = false;
}

function publicImageUrl(supabase, path) {
  if (!path) return '';
  return supabase.storage.from(bucketName).getPublicUrl(path).data.publicUrl;
}

function renderBusiness(supabase, business) {
  const article = document.createElement('article');
  article.className = 'owner-business';

  const cover = document.createElement('img');
  cover.className = 'business-cover';
  cover.src = publicImageUrl(supabase, business.image_path) || 'assets/img/portfolio/portfolio-3.webp';
  cover.alt = `${business.business_name} cover`;
  cover.loading = 'lazy';

  const details = document.createElement('div');
  const title = document.createElement('h3');
  title.className = 'h4';
  title.textContent = business.business_name;
  const category = document.createElement('p');
  category.className = 'mb-2';
  category.textContent = business.category;
  const description = document.createElement('p');
  description.textContent = business.description || '';
  details.append(title, category, description);

  const photos = business.business_product_images || [];
  if (photos.length) {
    const gallery = document.createElement('div');
    gallery.className = 'product-gallery';
    photos.forEach((photo, index) => {
      const image = document.createElement('img');
      image.src = publicImageUrl(supabase, photo.image_path);
      image.alt = `${business.business_name} product ${index + 1}`;
      image.loading = 'lazy';
      gallery.append(image);
    });
    details.append(gallery);
  }

  article.append(cover, details);
  businessesContainer.append(article);
}

async function loadOwnerProfile() {
  const ownerId = new URLSearchParams(window.location.search).get('owner_id');
  if (!ownerId) throw new Error('This owner profile link is missing its owner ID.');

  const supabase = await window.supabaseReady;
  const { data: profile, error: profileError } = await supabase
    .from('business_owner_public_profiles')
    .select('owner_id, owner_name, owner_avatar_url, owner_bio')
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) throw new Error('This public owner profile is not available.');

  document.title = `${profile.owner_name} - Bigwrapes-Pixel`;
  document.getElementById('ownerName').textContent = profile.owner_name;
  document.getElementById('ownerBio').textContent = profile.owner_bio || '';
  const avatar = document.getElementById('ownerAvatar');
  if (profile.owner_avatar_url) {
    avatar.src = profile.owner_avatar_url;
    avatar.alt = `${profile.owner_name} profile photo`;
    avatar.addEventListener('error', () => avatar.hidden = true, { once: true });
  } else {
    avatar.hidden = true;
  }
  profileSection.hidden = false;

  const { data: businesses, error: businessError } = await supabase
    .from('businesses')
    .select('id, owner_id, business_name, category, description, image_path, created_at, business_product_images(image_path)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (businessError) throw businessError;

  businessesContainer.replaceChildren();
  if (!businesses.length) {
    businessesContainer.innerHTML = '<p>This owner has no public business listings yet.</p>';
    return;
  }
  businesses.forEach((business) => renderBusiness(supabase, business));
}

loadOwnerProfile().catch((error) => {
  businessesContainer.replaceChildren();
  showMessage(error.message || 'Unable to load this owner profile.');
});
