/**
 * Bigwrapes-Pixel Activity Tracking System
 * Tracks user activity and loads real-time statistics
 */

(function() {
  'use strict';

  /**
   * Load Real-Time Statistics from Backend
   */
  function loadStatistics() {
    fetch('/nexa/api/get_stats.php')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          updateStatistics(data.data);
        } else {
          console.log('Stats API returned fallback data');
          updateStatistics(data.data);
        }
      })
      .catch(error => {
        console.error('Error loading statistics:', error);
        // Fallback: keep the default values in HTML
      });
  }

  /**
   * Update HTML with Real Statistics
   */
  function updateStatistics(stats) {
    // Update Student Businesses count
    const businessCounter = document.querySelector('[data-purecounter-end="150"]');
    if (businessCounter) {
      businessCounter.setAttribute('data-purecounter-end', stats.student_businesses || 150);
    }

    // Update Active Customers count
    const customerCounter = document.querySelector('[data-purecounter-end="5000"]');
    if (customerCounter) {
      customerCounter.setAttribute('data-purecounter-end', stats.active_customers || 5000);
    }

    // Update Customer Reviews count
    const reviewCounter = document.querySelector('[data-purecounter-end="4500"]');
    if (reviewCounter) {
      reviewCounter.setAttribute('data-purecounter-end', stats.customer_reviews || 4500);
    }

    // Re-initialize PureCounter to apply new values
    if (typeof PureCounter !== 'undefined') {
      PureCounter.scan();
    }
  }

  /**
   * Track Page Visit Activity
   */
  function trackPageVisit() {
    const currentPage = window.location.pathname;
    
    const activityData = {
      event_type: 'page_visit',
      page: currentPage
    };

    fetch('/nexa/api/track_activity.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activityData)
    })
    .catch(error => console.error('Error tracking activity:', error));
  }

  /**
   * Track Customer Visit (with optional email)
   */
  function trackCustomerVisit(email = null) {
    const activityData = {
      event_type: 'customer_visit',
      page: window.location.pathname,
      email: email
    };

    fetch('/nexa/api/track_activity.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activityData)
    })
    .catch(error => console.error('Error tracking customer:', error));
  }

  /**
   * Submit Review via API
   */
  function submitReview(studentId, customerName, rating, reviewText) {
    const reviewData = {
      student_id: studentId,
      customer_name: customerName,
      rating: rating,
      review: reviewText
    };

    return fetch('/nexa/api/add_review.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewData)
    })
    .then(response => response.json());
  }

  /**
   * Initialize Activity Tracking on Page Load
   */
  document.addEventListener('DOMContentLoaded', function() {
    // Load statistics when page loads
    loadStatistics();
    
    // Track page visit
    trackPageVisit();

    // Expose functions to global scope for external use
    window.ActivityTracker = {
      trackCustomerVisit: trackCustomerVisit,
      submitReview: submitReview,
      loadStatistics: loadStatistics
    };
  });

  /**
   * Refresh statistics every 30 seconds (optional)
   */
  setInterval(function() {
    loadStatistics();
  }, 30000);

})();
