/**
 * Authentication Check System
 * Checks if user is logged in and redirects to login if needed
 */

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is logged in, false otherwise
 */
function isUserAuthenticated() {
    // Check for session or authentication token in localStorage
    const authToken = localStorage.getItem('authToken');
    const userEmail = localStorage.getItem('userEmail');
    
    return !!(authToken && userEmail);
}

/**
 * Get current user info
 * @returns {Object} User object with email and timestamp
 */
function getCurrentUser() {
    return {
        email: localStorage.getItem('userEmail'),
        loginTime: localStorage.getItem('loginTime')
    };
}

/**
 * Create and show auth modal
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {function} onLogin - Callback when login is clicked
 * @param {function} onSignup - Callback when signup is clicked
 */
function showAuthModal(title, message, onLogin, onSignup) {
    // Remove existing modal if present
    const existingModal = document.getElementById('authModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal HTML
    const modalHTML = `
    <div class="modal fade" id="authModal" tabindex="-1" role="dialog" aria-labelledby="authModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content" style="background: var(--surface-color); border: 1px solid rgba(0, 136, 112, 0.2);">
                <div class="modal-header" style="border-bottom: 1px solid rgba(0, 136, 112, 0.2);">
                    <h5 class="modal-title" id="authModalLabel" style="color: var(--heading-color);">${title}</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" style="color: var(--default-color);">
                    ${message}
                </div>
                <div class="modal-footer" style="border-top: 1px solid rgba(0, 136, 112, 0.2);">
                    <button type="button" class="btn" style="background: var(--accent-color); color: white;" id="authModalLogin">
                        <i class="bi bi-box-arrow-in-right"></i> Sign In
                    </button>
                    <button type="button" class="btn btn-outline-secondary" id="authModalSignup" style="color: var(--accent-color); border-color: var(--accent-color);">
                        <i class="bi bi-person-plus"></i> Create Account
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Get bootstrap modal
    const modalElement = document.getElementById('authModal');
    const modal = new (window.bootstrap?.Modal || function() {
        // Fallback if Bootstrap not loaded yet
        this.show = function() { modalElement.style.display = 'block'; };
    })(modalElement);

    // Add event listeners
    document.getElementById('authModalLogin').addEventListener('click', () => {
        modal.hide?.();
        if (typeof onLogin === 'function') onLogin();
    });

    document.getElementById('authModalSignup').addEventListener('click', () => {
        modal.hide?.();
        if (typeof onSignup === 'function') onSignup();
    });

    // Show modal
    modal.show?.();

    return modal;
}

/**
 * Redirect to login page
 * @param {string} redirectUrl - URL to redirect to after login
 */
function redirectToLogin(redirectUrl) {
    // Store the original URL so we can redirect after login
    if (redirectUrl) {
        sessionStorage.setItem('redirectAfterLogin', redirectUrl);
    }
    window.location.href = 'log%20in%20form/form.html';
}

/**
 * Redirect to signup page
 */
function redirectToSignup() {
    window.location.href = 'signup.html';
}

/**
 * Protect a page - show modal if not authenticated
 * @param {string} loginMessage - Optional message to show on login form
 */
function protectPage(loginMessage) {
    if (!isUserAuthenticated()) {
        // Store message to show on login page
        if (loginMessage) {
            sessionStorage.setItem('loginMessage', loginMessage);
        }

        // Get current page URL for redirect after login
        const currentUrl = window.location.pathname;

        // Show modal with login and signup options
        showAuthModal(
            'Authentication Required',
            '<p>You need to log in or create an account to access this page.</p><p>We keep student businesses and detailed information available only to registered users to protect our community.</p>',
            () => redirectToLogin(currentUrl),
            () => redirectToSignup()
        );

        // Prevent page content from being fully displayed
        // by fading it out
        document.body.style.pointerEvents = 'none';
        document.body.style.opacity = '0.5';
    }
}

/**
 * Set authentication (called after successful login)
 * @param {string} email - User email
 */
function setAuthentication(email) {
    const token = 'token_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('loginTime', new Date().toISOString());
}

/**
 * Logout user
 */
function logoutUser() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('rememberEmail');
    window.location.href = 'index.html';
}

/**
 * Handle redirect after login
 */
function handlePostLoginRedirect() {
    const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
    if (redirectUrl) {
        sessionStorage.removeItem('redirectAfterLogin');
        // If it's the businesses page, redirect to it
        if (redirectUrl.includes('businesses')) {
            window.location.href = 'businesses.html';
        }
    }
}

/**
 * Check if page requires authentication on load
 * Pages that need protection:
 * - businesses.html
 * - portfolio-details.html
 */
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.toLowerCase();
    
    // Protect businesses page
    if (currentPage.includes('businesses.html')) {
        protectPage('Please log in to view student businesses');
    }
    
    // Protect portfolio details page
    if (currentPage.includes('portfolio-details.html')) {
        protectPage('Please log in to view business details');
    }
});
