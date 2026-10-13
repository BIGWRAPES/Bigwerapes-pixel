const form = document.getElementById('customerReviewForm');
const submitButton = document.getElementById('submitReviewButton');
const submitStatus = document.getElementById('reviewSubmitStatus');
const loadStatus = document.getElementById('reviewsLoadStatus');
const list = document.getElementById('reviewsList');
const emptyState = document.getElementById('reviewsEmpty');
const overview = document.getElementById('reviewsOverview');
const filter = document.getElementById('reviewsBusinessFilter');
const businessSelect = document.getElementById('reviewBusiness');
const businessScope = document.getElementById('reviewBusinessScope');
const specificBusinessField = document.getElementById('specificBusinessField');
const averageValue = document.getElementById('reviewsAverage');
const averageStars = document.getElementById('reviewsAverageStars');
const reviewsCount = document.getElementById('reviewsCount');

const businessesById = new Map();
let publishedReviews = [];
let supabase;

function makeStars(rating) {
  return String.fromCharCode(9733).repeat(rating) + String.fromCharCode(9734).repeat(5 - rating);
}
function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

function safeHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function renderReviews() {
  const selectedBusiness = filter.value;
  const reviews = selectedBusiness === 'all'
    ? publishedReviews
    : publishedReviews.filter((review) => (review.business_id || '') === selectedBusiness);

  list.replaceChildren();
  overview.hidden = reviews.length === 0;
  emptyState.hidden = reviews.length !== 0;
  emptyState.querySelector('h3').textContent = publishedReviews.length && selectedBusiness !== 'all'
    ? 'No reviews for this selection yet'
    : 'No published reviews yet';
  emptyState.querySelector('p').textContent = publishedReviews.length && selectedBusiness !== 'all'
    ? 'Choose another business or be the first to share an experience.'
    : 'Be the first to share an honest experience. Your review will appear as soon as you submit it.';

  if (!reviews.length) return;

  const average = reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
  averageValue.textContent = average.toFixed(1);
  averageStars.textContent = makeStars(Math.round(average));
  averageStars.setAttribute('aria-label', `${average.toFixed(1)} out of 5 stars`);
  reviewsCount.textContent = `${reviews.length} published ${reviews.length === 1 ? 'review' : 'reviews'}`;

  const fragment = document.createDocumentFragment();
  reviews.forEach((review) => {
    const card = document.createElement('article');
    card.className = 'review-card';

    const top = document.createElement('div');
    top.className = 'review-card-top';
    const business = document.createElement('span');
    business.className = 'review-business';
    const businessIcon = document.createElement('i');
    businessIcon.className = 'bi bi-shop';
    businessIcon.setAttribute('aria-hidden', 'true');
    business.append(businessIcon, document.createTextNode(` ${businessesById.get(review.business_id) || 'BigWrapes Pixel'}`));

    const rating = document.createElement('span');
    rating.className = 'review-rating';
    rating.textContent = makeStars(review.rating);
    rating.setAttribute('aria-label', `${review.rating} out of 5 stars`);
    top.append(business, rating);

    const quote = document.createElement('blockquote');
    quote.className = 'review-quote';
    quote.textContent = String.fromCharCode(8220) + review.review_text + String.fromCharCode(8221);

    const attribution = document.createElement('div');
    attribution.className = 'review-attribution';
    const name = document.createElement('span');
    name.className = 'reviewer-name';
    name.textContent = review.reviewer_name;
    const date = document.createElement('time');
    date.className = 'review-date';
    date.dateTime = review.created_at;
    date.textContent = formatDate(review.created_at);
    attribution.append(name, date);

    card.append(top, quote, attribution);
    const sourceUrl = safeHttpUrl(review.source_url);
    if (sourceUrl) {
      const source = document.createElement('a');
      source.className = 'review-source';
      source.href = sourceUrl;
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      source.textContent = 'View original review';
      const sourceIcon = document.createElement('i');
      sourceIcon.className = 'bi bi-box-arrow-up-right';
      sourceIcon.setAttribute('aria-hidden', 'true');
      source.prepend(sourceIcon);
      card.append(source);
    }
    fragment.append(card);
  });
  list.append(fragment);
}

function addBusinessOption(select, id, name) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = name;
  select.append(option);
}
function refreshReviewFilter() {
  const contexts = new Set(publishedReviews.map((review) => review.business_id || ''));
  filter.replaceChildren();
  addBusinessOption(filter, 'all', 'All reviews');
  if (contexts.size > 1) {
    if (contexts.has('')) addBusinessOption(filter, '', 'BigWrapes Pixel');
    publishedReviews.forEach((review) => {
      if (review.business_id && ![...filter.options].some((option) => option.value === review.business_id)) {
        addBusinessOption(filter, review.business_id, businessesById.get(review.business_id) || 'Student business');
      }
    });
    filter.hidden = false;
  } else {
    filter.hidden = true;
    filter.value = 'all';
  }
}

async function loadPageData() {
  try {
    supabase = await window.supabaseReady;
    const [{ data: businesses, error: businessesError }, { data: reviews, error: reviewsError }] = await Promise.all([
      supabase.from('businesses').select('id, business_name').order('business_name'),
      supabase.from('customer_reviews')
        .select('id, business_id, reviewer_name, rating, review_text, source_url, created_at')
        .order('created_at', { ascending: false })
        .limit(1000)
    ]);

    if (businessesError) throw businessesError;
    if (reviewsError) throw reviewsError;

    (businesses || []).forEach((business) => {
      businessesById.set(business.id, business.business_name);
      addBusinessOption(businessSelect, business.id, business.business_name);
    });

    publishedReviews = reviews || [];
    refreshReviewFilter();
    renderReviews();
  } catch (error) {
    console.error('Could not load customer reviews:', error);
    loadStatus.textContent = 'Reviews are temporarily unavailable. Please try again later.';
    emptyState.hidden = false;
    emptyState.querySelector('h3').textContent = 'Reviews temporarily unavailable';
    emptyState.querySelector('p').textContent = 'Please try again later.';
  }
}

businessScope.addEventListener('change', () => {
  const isSpecificBusiness = businessScope.value === 'specific';
  specificBusinessField.hidden = !isSpecificBusiness;
  businessSelect.disabled = !isSpecificBusiness;
  businessSelect.required = isSpecificBusiness;
  if (!isSpecificBusiness) businessSelect.value = '';
});

filter.addEventListener('change', renderReviews);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitStatus.textContent = '';
  submitStatus.className = 'reviews-status mt-3 mb-0';
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting…';

  try {
    if (!supabase) supabase = await window.supabaseReady;
    const sourceUrlValue = document.getElementById('reviewSourceUrl').value.trim();
    const sourceUrl = safeHttpUrl(sourceUrlValue);
    if (sourceUrlValue && !sourceUrl) throw new Error('Enter a valid link beginning with http:// or https://.');

    const { data: submittedReview, error } = await supabase.from('customer_reviews').insert({
      business_id: businessScope.value === 'specific' ? businessSelect.value : null,
      reviewer_name: document.getElementById('reviewerName').value.trim(),
      rating: Number(document.getElementById('reviewRating').value),
      review_text: document.getElementById('reviewText').value.trim(),
      source_url: sourceUrl,
      display_name_consent: document.getElementById('reviewDisplayConsent').checked
    }).select('id, business_id, reviewer_name, rating, review_text, source_url, created_at').single();
    if (error) throw error;

    publishedReviews.unshift(submittedReview);
    refreshReviewFilter();
    filter.value = submittedReview.business_id || 'all';
    renderReviews();
    form.reset();
    businessScope.dispatchEvent(new Event('change'));
    submitStatus.textContent = 'Thanks for sharing your experience. Your review is now published above.';
    submitStatus.classList.add('text-success');
  } catch (error) {
    console.error('Could not submit customer review:', error);
    const setupError = error.message?.includes('customer_reviews') || error.code === '42501' || error.code === 'PGRST205';
    submitStatus.textContent = setupError
      ? 'Review submissions are not set up yet. Please run the customer reviews SQL migration in Supabase.'
      : (error.message || 'We could not submit your review. Please try again.');
    submitStatus.classList.add('text-danger');
  } finally {
    submitButton.disabled = false;
    const icon = document.createElement('i');
    icon.className = 'bi bi-send me-2';
    icon.setAttribute('aria-hidden', 'true');
    submitButton.replaceChildren(icon, document.createTextNode('Submit for review'));
  }
});

loadPageData();
