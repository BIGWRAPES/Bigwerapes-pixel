const form = document.getElementById('loginForm');
const recoveryForm = document.getElementById('recoveryForm');
const message = document.getElementById('authMessage');
const button = document.getElementById('loginButton');

function showMessage(text, type = 'danger') {
  message.textContent = text;
  message.className = `alert alert-${type}`;
  message.style.display = 'block';
}

if (new URLSearchParams(window.location.search).get('registered') === '1') {
  showMessage('Your account was created. click sign in to Access your dashboard, then log in.', 'success');
}

if (new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery') {
  form.hidden = true;
  recoveryForm.hidden = false;
  document.querySelector('.auth-panel h1').textContent = 'Choose a new password';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  button.textContent = 'Signing in...';

  try {
    const supabase = await window.supabaseReady;
    const { error } = await supabase.auth.signInWithPassword({
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value
    });
    if (error) throw error;
    window.location.assign('business-submit.html');
  } catch (error) {
    showMessage(error.message || 'Unable to sign in. Check your details and try again.');
    button.disabled = false;
    button.textContent = 'Sign In';
  }
});

recoveryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const supabase = await window.supabaseReady;
    const { error } = await supabase.auth.updateUser({
      password: document.getElementById('newPassword').value
    });
    if (error) throw error;
    showMessage('Password updated. You can now sign in.', 'success');
    recoveryForm.hidden = true;
    form.hidden = false;
  } catch (error) {
    showMessage(error.message || 'Unable to update password. Request another reset link.');
  }
});