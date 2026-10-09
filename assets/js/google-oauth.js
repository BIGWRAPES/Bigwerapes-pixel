const accountTypeIntentKey = 'bigwrapes.google.accountType';
const oauthPendingKey = 'bigwrapes.google.pending';

document.querySelectorAll('[data-google-oauth]').forEach((button) => {
  button.addEventListener('click', async () => {
    const errorTarget = document.getElementById(button.dataset.errorTarget);
    const termsCheckbox = document.getElementById('terms');
    if (termsCheckbox && !termsCheckbox.checked) {
      if (errorTarget) {
        errorTarget.textContent = 'Please accept the Terms of Service and Privacy Policy before continuing.';
        errorTarget.style.display = 'block';
      }
      termsCheckbox.focus();
      return;
    }

    const originalContent = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span>Connecting to Google...</span>';
    if (errorTarget) errorTarget.style.display = 'none';

    try {
      const supabase = await window.supabaseReady;
      const accountType = button.dataset.accountType;
      if (accountType) {
        sessionStorage.setItem(accountTypeIntentKey, accountType);
      } else {
        sessionStorage.removeItem(accountTypeIntentKey);
      }
      sessionStorage.setItem(oauthPendingKey, '1');

      const redirectTo = new URL('login.html', window.location.href).href;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });
      if (error) throw error;
    } catch (error) {
      sessionStorage.removeItem(accountTypeIntentKey);
      sessionStorage.removeItem(oauthPendingKey);
      button.disabled = false;
      button.innerHTML = originalContent;
      if (errorTarget) {
        errorTarget.textContent = error.message || 'Unable to start Google sign-in. Please try again.';
        errorTarget.className = errorTarget.id === 'authMessage' ? 'alert alert-danger' : 'alert alert-error';
        errorTarget.style.display = 'block';
      } else {
        console.error('Google sign-in failed:', error);
      }
    }
  });
});
