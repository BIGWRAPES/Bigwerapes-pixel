document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.portfolio-grid');
  if (!container) return;

  fetch('assets/data/businesses.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load businesses data');
      }
      return response.json();
    })
    .then((businesses) => {
      if (!Array.isArray(businesses) || businesses.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary, #999);">
            <i class="bi bi-inbox" style="font-size: 3rem; display: block; margin-bottom: 1rem; color: var(--accent-color, #008870); opacity: 0.5;"></i>
            <p style="font-size: 1.1rem; margin-bottom: 1rem;">No businesses found</p>
          </div>
        `;
        return;
      }

      container.innerHTML = businesses.map((business) => {
        const categoryClass = getCategoryClass(business.category || 'default');
        return `
          <div class="col-lg-4 col-md-6 portfolio-item isotope-item ${categoryClass}">
            <div class="portfolio-card" style="cursor: pointer;" data-business-id="${business.id}">
              <div class="image-container">
                <img src="${business.logo_url || 'assets/img/portfolio/portfolio-3.webp'}" class="img-fluid" alt="${business.business_name}" loading="lazy" onerror="this.src='assets/img/portfolio/portfolio-3.webp'">
                <div class="overlay">
                  <div class="overlay-content">
                    <a href="${business.logo_url || 'assets/img/portfolio/portfolio-3.webp'}" class="glightbox zoom-link" title="${business.business_name}">
                      <i class="bi bi-zoom-in"></i>
                    </a>
                    <a href="#" class="details-link" title="View Business Details" data-open-business="${business.id}">
                      <i class="bi bi-arrow-right"></i>
                    </a>
                  </div>
                </div>
              </div>
              <div class="content">
                <h3>${business.business_name}</h3>
                <p><strong>${business.owner_name}</strong> · ${business.category}</p>
                <div class="business-meta" style="font-size: 0.9rem; color: var(--text-secondary, #999); margin-top: 0.5rem;">
                  <span><i class="bi bi-star-fill" style="color: var(--accent-color, #008870);"></i> ${business.rating || 'N/A'}</span>
                  <span style="margin-left: 0.5rem;"><i class="bi bi-chat-left"></i> ${business.review_count || 0} reviews</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      attachBusinessClicks();
      initStaticModal();
    })
    .catch((error) => {
      console.error('Error loading businesses:', error);
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #ff6b6b;">
          <i class="bi bi-exclamation-triangle" style="font-size: 2rem; display: block; margin-bottom: 1rem;"></i>
          <p>Error loading businesses. Please try again later.</p>
        </div>
      `;
    });
});

function getCategoryClass(category) {
  const map = {
    'Fashion & Accessories': 'filter-branding',
    'Digital Services': 'filter-web',
    'Crafts & Handmade': 'filter-print',
    'Photography & Media': 'filter-motion',
    'Technology': 'filter-web',
    'Design': 'filter-branding',
    'Consulting': 'filter-print',
    'Education': 'filter-print',
    'default': 'filter-branding'
  };
  return map[category] || map.default;
}

function attachBusinessClicks() {
  document.querySelectorAll('[data-open-business]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const businessId = Number(button.getAttribute('data-open-business'));
      showStaticBusinessModal(businessId);
    });
  });

  document.querySelectorAll('.portfolio-card').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      const businessId = Number(card.getAttribute('data-business-id'));
      showStaticBusinessModal(businessId);
    });
  });
}

function initStaticModal() {
  if (document.getElementById('staticBusinessModal')) return;

  const modalHtml = `
    <div id="staticBusinessModal" class="business-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999; overflow-y:auto;">
      <div class="modal-content" style="max-width:900px; margin:40px auto; background:#111; border-radius:16px; overflow:hidden; position:relative; color:#fff;">
        <button class="modal-close" aria-label="Close modal" style="position:absolute; top:14px; right:18px; font-size:2rem; background:none; border:none; color:#fff; z-index:5;">&times;</button>
        <div class="modal-header" style="position:relative; min-height:260px;">
          <img id="staticCoverImage" src="" alt="Business cover" style="width:100%; height:260px; object-fit:cover; filter:brightness(0.7);">
          <div class="owner-info-overlay" style="position:absolute; left:24px; bottom:20px; display:flex; align-items:center; gap:16px;">
            <img id="staticOwnerAvatar" src="" alt="Owner" style="width:74px; height:74px; border-radius:50%; border:3px solid #fff; object-fit:cover;">
            <div>
              <h2 id="staticOwnerName" style="margin:0; font-size:1.8rem;"></h2>
              <p id="staticOwnerBio" style="margin:4px 0 0; opacity:0.8;"></p>
            </div>
          </div>
        </div>
        <div class="modal-body" style="padding:30px 28px 36px;">
          <div class="business-header" style="display:flex; justify-content:space-between; align-items:start; gap:16px; flex-wrap:wrap; margin-bottom:20px;">
            <div>
              <h3 id="staticBusinessName" style="margin:0 0 8px; font-size:2rem;"></h3>
              <div class="business-badges">
                <span id="staticBusinessCategory" class="badge-category" style="display:inline-block; background:#008870; color:#fff; padding:6px 10px; border-radius:999px; font-size:0.8rem; margin-right:8px;"></span>
              </div>
            </div>
            <div class="business-rating" style="text-align:right;">
              <div class="stars" id="staticBusinessRating" style="color:#f4c542; font-size:1.2rem;"></div>
              <p id="staticReviewCount" style="margin:8px 0 0; opacity:0.8;"></p>
            </div>
          </div>
          <div class="business-description" style="margin-bottom:26px;">
            <p id="staticBusinessDescription" style="line-height:1.7; opacity:0.9;"></p>
          </div>
          <div class="contact-section" style="margin-bottom:22px;">
            <h4 style="margin-bottom:12px;">Contact Information</h4>
            <div class="contact-buttons" style="display:flex; gap:12px; flex-wrap:wrap;">
              <a id="staticWhatsApp" href="#" class="btn btn-whatsapp" target="_blank" rel="noopener noreferrer" style="background:#25D366; color:#fff; padding:10px 16px; border-radius:10px; display:inline-flex; align-items:center; gap:8px;">WhatsApp</a>
              <a id="staticEmail" href="#" class="btn btn-email" style="background:#fff; color:#111; padding:10px 16px; border-radius:10px; display:inline-flex; align-items:center; gap:8px;">Email</a>
              <a id="staticPhone" href="#" class="btn btn-phone" style="background:#008870; color:#fff; padding:10px 16px; border-radius:10px; display:inline-flex; align-items:center; gap:8px;">Call</a>
            </div>
          </div>
          <div id="staticLocation" style="margin-bottom:22px; display:none;">
            <h4>Location</h4>
            <p id="staticBusinessLocation"></p>
          </div>
          <div id="staticPortfolio" style="display:none;">
            <h4>Portfolio / Products & Services</h4>
            <div id="staticPortfolioGrid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:14px; margin-top:12px;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('staticBusinessModal');
  const closeBtn = modal.querySelector('.modal-close');
  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.style.display = 'none';
  });
}

function showStaticBusinessModal(businessId) {
  fetch('assets/data/businesses.json')
    .then((response) => response.json())
    .then((businesses) => {
      const business = businesses.find((item) => Number(item.id) === Number(businessId));
      if (!business) return;

      const modal = document.getElementById('staticBusinessModal');
      if (!modal) return;

      document.getElementById('staticCoverImage').src = business.cover_image_url || 'assets/img/about/wall45.jpg';
      document.getElementById('staticOwnerAvatar').src = business.owner_avatar_url || 'assets/img/person/person-1.jpg';
      document.getElementById('staticOwnerName').textContent = business.owner_name || 'Business Owner';
      document.getElementById('staticOwnerBio').textContent = business.owner_bio || '';
      document.getElementById('staticBusinessName').textContent = business.business_name;
      document.getElementById('staticBusinessCategory').textContent = business.category || 'Business';
      document.getElementById('staticBusinessDescription').textContent = business.description || 'No description available';
      document.getElementById('staticReviewCount').textContent = `${business.review_count || 0} reviews`;
      document.getElementById('staticBusinessRating').innerHTML = getStarRatingHtml(business.rating || 0);

      document.getElementById('staticWhatsApp').href = business.whatsapp_link || '#';
      document.getElementById('staticEmail').href = `mailto:${business.email || ''}`;
      document.getElementById('staticPhone').href = `tel:${(business.phone || '').replace(/\s+/g, '')}`;

      const locationSection = document.getElementById('staticLocation');
      const locationText = document.getElementById('staticBusinessLocation');
      if (business.location) {
        locationText.textContent = business.location;
        locationSection.style.display = 'block';
      } else {
        locationSection.style.display = 'none';
      }

      const portfolio = business.portfolio || [];
      const portfolioSection = document.getElementById('staticPortfolio');
      const portfolioGrid = document.getElementById('staticPortfolioGrid');
      if (portfolio.length) {
        portfolioGrid.innerHTML = portfolio.map((item) => `
          <div style="border-radius:12px; overflow:hidden; background:#1b1b1b; border:1px solid rgba(255,255,255,0.08);">
            <img src="${item.image}" alt="${item.title}" style="width:100%; height:140px; object-fit:cover;">
            <div style="padding:10px; font-size:0.9rem;">${item.title}</div>
          </div>
        `).join('');
        portfolioSection.style.display = 'block';
      } else {
        portfolioSection.style.display = 'none';
      }

      modal.style.display = 'block';
    });
}

function getStarRatingHtml(rating) {
  const rounded = Math.round(rating || 0);
  const fullStars = '★'.repeat(Math.min(5, Math.max(0, rounded)));
  const emptyStars = '☆'.repeat(Math.max(0, 5 - Math.min(5, Math.max(0, rounded))));
  return `${fullStars}${emptyStars}`;
}
