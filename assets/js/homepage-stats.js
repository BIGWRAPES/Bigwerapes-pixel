const businessCount = document.querySelector('[data-homepage-stat="businesses"]');
const reviewCount = document.querySelector('[data-homepage-stat="reviews"]');

async function loadHomepageStats() {
  if (!businessCount || !reviewCount || !window.supabaseReady) return;

  try {
    const supabase = await window.supabaseReady;
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
