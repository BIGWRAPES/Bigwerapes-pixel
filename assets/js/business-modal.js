/**
 * Business Profile Modal System
 * Handles displaying and managing business profile modals
 */

class BusinessProfileModal {
    constructor() {
        this.currentBusiness = null;
        this.modalElement = null;
        this.init();
    }
    
    init() {
        this.createModalHTML();
        this.attachEventListeners();
    }
    
    /**
     * Create modal HTML structure
     */
    createModalHTML() {
        const modalHTML = `
        <div id="businessProfileModal" class="business-modal">
            <div class="modal-content">
                <button class="modal-close" aria-label="Close modal">&times;</button>
                
                <!-- Cover Image -->
                <div class="modal-header">
                    <img id="businessCoverImage" src="" alt="Business Cover" class="cover-image">
                    <div class="owner-info-overlay">
                        <img id="businessOwnerAvatar" src="" alt="Owner" class="owner-avatar">
                        <div class="owner-text">
                            <h2 id="businessOwnerName"></h2>
                            <p id="businessOwnerBio" class="owner-bio"></p>
                        </div>
                    </div>
                </div>
                
                <!-- Business Details -->
                <div class="modal-body">
                    <div class="business-header">
                        <div class="business-title">
                            <h3 id="businessName"></h3>
                            <div class="business-badges">
                                <span id="businessCategory" class="badge-category"></span>
                                <span id="businessVerified" class="badge-verified" style="display:none;">
                                    <i class="bi bi-check-circle-fill"></i> Verified
                                </span>
                            </div>
                        </div>
                        <div class="business-rating">
                            <div class="stars">
                                <div class="star-rating" id="businessRating"></div>
                            </div>
                            <p id="businessReviewCount" class="review-count"></p>
                        </div>
                    </div>
                    
                    <!-- Business Description -->
                    <div class="business-description">
                        <p id="businessDescription"></p>
                    </div>
                    
                    <!-- Contact Information -->
                    <div class="contact-section">
                        <h4>Contact Information</h4>
                        <div class="contact-buttons">
                            <a id="whatsappBtn" href="#" class="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
                                <i class="bi bi-whatsapp"></i> WhatsApp
                            </a>
                            <a id="emailBtn" href="#" class="btn btn-email">
                                <i class="bi bi-envelope"></i> Email
                            </a>
                            <a id="phoneBtn" href="#" class="btn btn-phone">
                                <i class="bi bi-telephone"></i> Call
                            </a>
                            <a id="websiteBtn" href="#" class="btn btn-website" target="_blank" rel="noopener noreferrer" style="display:none;">
                                <i class="bi bi-globe"></i> Website
                            </a>
                        </div>
                    </div>
                    
                    <!-- Location -->
                    <div class="location-section" id="locationSection" style="display:none;">
                        <h4>Location</h4>
                        <p id="businessLocation"></p>
                    </div>
                    
                    <!-- Portfolio Section -->
                    <div class="portfolio-section" id="portfolioSection" style="display:none;">
                        <h4>Portfolio / Products & Services</h4>
                        <div id="portfolioGrid" class="portfolio-grid"></div>
                    </div>
                    
                    <!-- Reviews Section -->
                    <div class="reviews-section" id="reviewsSection" style="display:none;">
                        <h4>Customer Reviews</h4>
                        <div class="review-stats">
                            <div class="avg-rating">
                                <span class="big-rating" id="avgRating">0</span>
                                <span class="out-of">out of 5</span>
                                <p id="reviewStatsText"></p>
                            </div>
                            <div class="rating-breakdown">
                                <div class="rating-bar" data-rating="5">
                                    <span>5★</span>
                                    <div class="bar"><span id="bar-5" class="fill"></span></div>
                                    <span id="count-5">0</span>
                                </div>
                                <div class="rating-bar" data-rating="4">
                                    <span>4★</span>
                                    <div class="bar"><span id="bar-4" class="fill"></span></div>
                                    <span id="count-4">0</span>
                                </div>
                                <div class="rating-bar" data-rating="3">
                                    <span>3★</span>
                                    <div class="bar"><span id="bar-3" class="fill"></span></div>
                                    <span id="count-3">0</span>
                                </div>
                                <div class="rating-bar" data-rating="2">
                                    <span>2★</span>
                                    <div class="bar"><span id="bar-2" class="fill"></span></div>
                                    <span id="count-2">0</span>
                                </div>
                                <div class="rating-bar" data-rating="1">
                                    <span>1★</span>
                                    <div class="bar"><span id="bar-1" class="fill"></span></div>
                                    <span id="count-1">0</span>
                                </div>
                            </div>
                        </div>
                        
                        <div id="reviewsList" class="reviews-list"></div>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modalElement = document.getElementById('businessProfileModal');
        
        // Close button
        document.querySelector('.modal-close').addEventListener('click', () => this.close());
        
        // Close on outside click
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.close();
            }
        });
    }
    
    /**
     * Open business profile modal
     */
    async open(businessId) {
        try {
            const response = await fetch(`/nexa/api/get_business.php?id=${businessId}`);
            const result = await response.json();
            
            if (!result.success) {
                console.error('Failed to load business:', result.error);
                alert('Failed to load business profile');
                return;
            }
            
            this.currentBusiness = result.data;
            this.populateModal(result.data);
            this.modalElement.classList.add('active');
            document.body.style.overflow = 'hidden';
        } catch (error) {
            console.error('Error opening modal:', error);
            alert('Error loading business profile');
        }
    }
    
    /**
     * Close modal
     */
    close() {
        this.modalElement.classList.remove('active');
        document.body.style.overflow = 'auto';
        this.currentBusiness = null;
    }
    
    /**
     * Populate modal with business data
     */
    populateModal(business) {
        // Header
        document.getElementById('businessCoverImage').src = business.cover_image_url || 'assets/img/portfolio/portfolio-default.webp';
        document.getElementById('businessOwnerAvatar').src = business.owner_avatar_url || 'assets/img/person/default-avatar.webp';
        document.getElementById('businessOwnerName').textContent = business.owner_name || 'Business Owner';
        document.getElementById('businessOwnerBio').textContent = business.owner_bio || '';
        
        // Business Details
        document.getElementById('businessName').textContent = business.business_name;
        document.getElementById('businessCategory').textContent = business.category || 'Business';
        document.getElementById('businessDescription').textContent = business.description || 'No description available';
        
        // Verified badge
        if (business.is_verified) {
            document.getElementById('businessVerified').style.display = 'inline-block';
        }
        
        // Rating
        const ratingDiv = document.getElementById('businessRating');
        const ratingStars = this.generateStarRating(business.rating || 0);
        ratingDiv.innerHTML = ratingStars;
        document.getElementById('businessReviewCount').textContent = `${business.review_count || 0} reviews`;
        
        // Contact Information
        const whatsappBtn = document.getElementById('whatsappBtn');
        if (business.whatsapp_link) {
            whatsappBtn.href = business.whatsapp_link;
            whatsappBtn.style.display = 'inline-block';
            whatsappBtn.addEventListener('click', () => this.trackWhatsAppClick(business.id));
        } else {
            whatsappBtn.style.display = 'none';
        }
        
        const emailBtn = document.getElementById('emailBtn');
        if (business.email) {
            emailBtn.href = `mailto:${business.email}`;
            emailBtn.style.display = 'inline-block';
        } else {
            emailBtn.style.display = 'none';
        }
        
        const phoneBtn = document.getElementById('phoneBtn');
        if (business.phone) {
            phoneBtn.href = `tel:${business.phone.replace(/\D/g, '')}`;
            phoneBtn.style.display = 'inline-block';
        } else {
            phoneBtn.style.display = 'none';
        }
        
        const websiteBtn = document.getElementById('websiteBtn');
        if (business.website_url) {
            websiteBtn.href = business.website_url;
            websiteBtn.style.display = 'inline-block';
        } else {
            websiteBtn.style.display = 'none';
        }
        
        // Location
        const locationSection = document.getElementById('locationSection');
        let locationText = business.location || '';
        if (business.city) locationText += (locationText ? ', ' : '') + business.city;
        if (business.state) locationText += (locationText ? ', ' : '') + business.state;
        
        if (locationText) {
            document.getElementById('businessLocation').textContent = locationText;
            locationSection.style.display = 'block';
        }
        
        // Portfolio
        if (business.portfolio && business.portfolio.length > 0) {
            this.populatePortfolio(business.portfolio);
            document.getElementById('portfolioSection').style.display = 'block';
        }
        
        // Reviews
        if (business.reviews && business.reviews.length > 0) {
            this.populateReviews(business.reviews, business.review_stats);
            document.getElementById('reviewsSection').style.display = 'block';
        }
    }
    
    /**
     * Populate portfolio section
     */
    populatePortfolio(portfolio) {
        const grid = document.getElementById('portfolioGrid');
        grid.innerHTML = '';
        
        portfolio.forEach((item, index) => {
            if (index >= 6) return; // Limit to 6 items
            
            const itemHTML = `
            <div class="portfolio-item">
                <img src="${item.image_url || 'assets/img/portfolio/portfolio-default.webp'}" alt="${item.title}">
                <div class="portfolio-info">
                    <h5>${item.title}</h5>
                    ${item.price ? `<p class="price">${this.formatPrice(item.price)}</p>` : ''}
                    ${item.rating ? `<div class="rating">${this.generateStarRating(item.rating)}</div>` : ''}
                </div>
            </div>
            `;
            
            grid.insertAdjacentHTML('beforeend', itemHTML);
        });
    }
    
    /**
     * Populate reviews section
     */
    populateReviews(reviews, stats) {
        const avgRating = stats.average_rating || 0;
        document.getElementById('avgRating').textContent = avgRating.toFixed(1);
        document.getElementById('reviewStatsText').textContent = `Based on ${stats.total_reviews} reviews`;
        
        // Rating breakdown
        const ratings = [5, 4, 3, 2, 1];
        const total = stats.total_reviews || 1;
        
        ratings.forEach(rating => {
            const count = stats[`${rating}_star_count`] || 0;
            const percentage = (count / total) * 100;
            
            document.getElementById(`bar-${rating}`).style.width = percentage + '%';
            document.getElementById(`count-${rating}`).textContent = count;
        });
        
        // Reviews list
        const reviewsList = document.getElementById('reviewsList');
        reviewsList.innerHTML = '';
        
        reviews.forEach((review, index) => {
            if (index >= 5) return; // Limit to 5 reviews
            
            const reviewHTML = `
            <div class="review-item">
                <div class="review-header">
                    <div>
                        <h6>${review.customer_name}</h6>
                        <div class="review-rating">${this.generateStarRating(review.rating)}</div>
                    </div>
                    <span class="review-date">${this.formatDate(review.created_at)}</span>
                </div>
                <p class="review-text">${review.review_text}</p>
                ${review.is_verified_purchase ? '<span class="verified-badge">✓ Verified Purchase</span>' : ''}
            </div>
            `;
            
            reviewsList.insertAdjacentHTML('beforeend', reviewHTML);
        });
    }
    
    /**
     * Generate star rating HTML
     */
    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalf = rating % 1 !== 0;
        let stars = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '<i class="bi bi-star-fill"></i>';
            } else if (i === fullStars && hasHalf) {
                stars += '<i class="bi bi-star-half"></i>';
            } else {
                stars += '<i class="bi bi-star"></i>';
            }
        }
        
        return stars;
    }
    
    /**
     * Format price
     */
    formatPrice(price) {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(price);
    }
    
    /**
     * Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-NG', { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    }
    
    /**
     * Track WhatsApp click
     */
    trackWhatsAppClick(businessId) {
        fetch('/nexa/api/track_whatsapp.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ business_id: businessId })
        }).catch(error => console.error('Error tracking WhatsApp click:', error));
    }
}

// Initialize on DOM ready
let businessModal;
document.addEventListener('DOMContentLoaded', () => {
    businessModal = new BusinessProfileModal();
});

/**
 * Open business profile from HTML
 */
function openBusinessProfile(businessId) {
    if (businessModal) {
        businessModal.open(businessId);
    }
}
