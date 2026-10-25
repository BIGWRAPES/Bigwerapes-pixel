const businessCount = document.querySelector('[data-homepage-stat="businesses"]');
const reviewCount = document.querySelector('[data-homepage-stat="reviews"]');
const businessPreview = document.querySelector('#homepage-business-preview');

function renderBusinessPreview(businesses, supabase) {
  const grid = businessPreview.querySelector('.homepage-business-preview-grid');
  const status = businessPreview.querySelector('.homepage-business-preview-status');
  const fragment = document.createDocumentFragment();

  businesses.forEach((business) => {
    const card = document.createElement('article');
    card.className = 'homepage-business-card';
    const link = document.createElement('a');
    link.href = business.business_slug
      ? `business.html?slug=${encodeURIComponent(business.business_slug)}`
      : 'businesses.html';

    if (business.image_path) {
      const image = document.createElement('img');
      image.src = supabase.storage.from('business-images').getPublicUrl(business.image_path).data.publicUrl;
      image.alt = '';
      image.loading = 'lazy';
      link.append(image);
    }

    const details = document.createElement('span');
    details.className = 'homepage-business-card-details';
    const name = document.createElement('strong');
    name.textContent = business.business_name;
    const category = document.createElement('span');
    category.textContent = business.category || 'Student business';
    details.append(name, category);
    link.append(details);
    card.append(link);
    fragment.append(card);
  });

  grid.replaceChildren(fragment);
  status.textContent = businesses.length
    ? 'Recently added to the directory'
    : 'No businesses have been listed yet.';
  businessPreview.setAttribute('aria-busy', 'false');
}

async function loadBusinessPreview(supabase) {
  if (!businessPreview) return;

  const status = businessPreview.querySelector('.homepage-business-preview-status');
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('business_name, business_slug, category, image_path, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) throw error;
    renderBusinessPreview(data || [], supabase);
  } catch (error) {
    console.error('Could not load homepage business preview:', error);
    status.textContent = 'Recent listings are temporarily unavailable.';
    businessPreview.setAttribute('aria-busy', 'false');
  }
}

async function loadHomepageStats() {
  if (!businessCount || !reviewCount || !window.supabaseReady) return;

  try {
    const supabase = await window.supabaseReady;
    loadBusinessPreview(supabase);
    const [businesses, reviews] = await Promise.all([
      supabase.from('businesses').select('id', { count: 'exact', head: true }),
      supabase.from('customer_reviews').select('id', { count: 'exact', head: true }),
    ]);

    if (!businesses.error && Number.isInteger(businesses.count)) {
      businessCount.textContent = businesses.count.toLocaleString();
    }
    if (!reviews.error && Number.isInteger(reviews.count)) {
      reviewCount.textContent = reviews.count.toLocaleString();
    }

    if (businesses.error) console.error('Could not load business count:', businesses.error);
    if (reviews.error) console.error('Could not load review count:', reviews.error);
  } catch (error) {
    console.error('Could not load homepage stats:', error);
  }
}

loadHomepageStats();
