const form = document.getElementById('loginForm');
const recoveryForm = document.getElementById('recoveryForm');
const googleProfileForm = document.getElementById('googleProfileForm');
const message = document.getElementById('authMessage');
const button = document.getElementById('loginButton');
const googleFirstName = document.getElementById('googleFirstName');
const googleLastName = document.getElementById('googleLastName');
const googleAccountType = document.getElementById('googleAccountType');
const googleAccountTypeGroup = document.getElementById('googleAccountTypeGroup');
const saveGoogleProfileButton = document.getElementById('saveGoogleProfileButton');
const oauthPendingKey = 'bigwrapes.google.pending';
const accountTypeIntentKey = 'bigwrapes.google.accountType';
let googleCallbackHandled = false;
let googleProfileAccountType = '';
let googleProfileIsNew = false;

function showMessage(text, type = 'danger') {
  message.textContent = text;
  message.className = `alert alert-${type}`;
  message.style.display = 'block';
}

function showRecoveryForm() {
  form.hidden = true;
  googleProfileForm.hidden = true;
  recoveryForm.hidden = false;
  document.querySelector('.auth-panel h1').textContent = 'Choose a new password';
  document.getElementById('newPassword').focus();
}

function showGoogleProfileForm(firstName, lastName, accountType, isNewProfile) {
  form.hidden = true;
  recoveryForm.hidden = true;
  googleProfileForm.hidden = false;
  googleFirstName.value = firstName;
  googleLastName.value = lastName;
  googleProfileAccountType = accountType || '';
  googleProfileIsNew = isNewProfile;
  googleAccountType.value = googleProfileAccountType;
  googleAccountTypeGroup.hidden = Boolean(googleProfileAccountType);
  document.querySelector('.auth-panel h1').textContent = 'Complete your profile';
  (firstName ? googleLastName : googleFirstName).focus();
}

function googleNameParts(user) {
  const metadata = user.user_metadata || {};
  let firstName = metadata.given_name || metadata.first_name || '';
  let lastName = metadata.family_name || metadata.last_name || '';
  if ((!firstName || !lastName) && (metadata.full_name || metadata.name)) {
    const nameParts = String(metadata.full_name || metadata.name).trim().split(/\s+/);
    firstName ||= nameParts.shift() || '';
    lastName ||= nameParts.join(' ');
  }
  return { firstName: firstName.trim(), lastName: lastName.trim() };
}

async function getAccountProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, account_type')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Your account profile could not be found. Please contact support.');
  return data;
}

function getDestinationForAccountType(accountType) {
  if (accountType === 'entrepreneur') return 'business-submit.html';
  if (accountType === 'student') return 'businesses.html';
  throw new Error('Your account type could not be identified. Please contact support.');
}

async function redirectAfterLogin(supabase, userId) {
  const profile = await getAccountProfile(supabase, userId);
  window.location.replace(getDestinationForAccountType(profile.account_type));
}

function isNewOAuthProfile(profile) {
  return !profile.first_name.trim() || !profile.last_name.trim();
}

async function handleGoogleCallback(supabase, session) {
  if (googleCallbackHandled || !session?.user || sessionStorage.getItem(oauthPendingKey) !== '1') return;
  googleCallbackHandled = true;

  try {
    const intent = sessionStorage.getItem(accountTypeIntentKey);
    const profile = await getAccountProfile(supabase, session.user.id);
    const firstName = profile.first_name.trim();
    const lastName = profile.last_name.trim();
    const isNewProfile = isNewOAuthProfile(profile);
    const googleNames = googleNameParts(session.user);
    const resolvedFirstName = firstName || googleNames.firstName;
    const resolvedLastName = lastName || googleNames.lastName;

    if (!isNewProfile) {
      if (!resolvedFirstName || !resolvedLastName) {
        sessionStorage.removeItem(oauthPendingKey);
        showGoogleProfileForm(resolvedFirstName, resolvedLastName, profile.account_type, false);
        return;
      }
      sessionStorage.removeItem(oauthPendingKey);
      sessionStorage.removeItem(accountTypeIntentKey);
      window.location.replace(getDestinationForAccountType(profile.account_type));
      return;
    }

    if (!intent || !resolvedFirstName || !resolvedLastName) {
      sessionStorage.removeItem(oauthPendingKey);
      showGoogleProfileForm(resolvedFirstName, resolvedLastName, intent || '', true);
      return;
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: resolvedFirstName,
        last_name: resolvedLastName,
        account_type: intent
      })
      .eq('id', session.user.id)
      .select('id')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedProfile) {
      throw new Error('Your profile could not be saved. Please contact support.');
    }
    sessionStorage.removeItem(oauthPendingKey);
    sessionStorage.removeItem(accountTypeIntentKey);
    window.location.replace(getDestinationForAccountType(intent));
  } catch (error) {
    sessionStorage.removeItem(oauthPendingKey);
    showMessage(error.message || 'Unable to complete your Google sign-in. Please try again.');
  }
}

if (new URLSearchParams(window.location.search).get('registered') === '1') {
  showMessage('Your account was created. Sign in to continue.', 'success');
}

if (new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery') {
  showRecoveryForm();
}

const callbackParams = new URLSearchParams(window.location.hash.slice(1));
const callbackError = new URLSearchParams(window.location.search).get('error_description')
  || new URLSearchParams(window.location.search).get('error')
  || callbackParams.get('error_description')
  || callbackParams.get('error');
if (callbackError) {
  sessionStorage.removeItem(oauthPendingKey);
  sessionStorage.removeItem(accountTypeIntentKey);
  showMessage(`Google sign-in was not completed: ${callbackError}`);
}

window.supabaseReady
  .then((supabase) => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') showRecoveryForm();
      if (['SIGNED_IN', 'INITIAL_SESSION'].includes(event) && sessionStorage.getItem(oauthPendingKey) === '1') {
        setTimeout(() => {
          handleGoogleCallback(supabase, session);
        }, 0);
      }
    });
  })
  .catch((error) => showMessage(error.message || 'Unable to initialize password recovery.'));

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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Your sign-in session could not be loaded. Please try again.');
    await redirectAfterLogin(supabase, user.id);
  } catch (error) {
    showMessage(error.message || 'Unable to sign in. Check your details and try again.');
    button.disabled = false;
    button.textContent = 'Sign In';
  }
});

googleProfileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveGoogleProfileButton.disabled = true;
  saveGoogleProfileButton.textContent = 'Saving profile...';

  try {
    const supabase = await window.supabaseReady;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Your Google session has expired. Please sign in again.');

    const accountType = googleProfileAccountType || googleAccountType.value;
    if (!accountType) throw new Error('Choose whether you are joining as a user or entrepreneur.');
    const profile = await getAccountProfile(supabase, user.id);
    const { data, error } = await supabase
      .from('profiles')
      .update({
        first_name: googleFirstName.value.trim(),
        last_name: googleLastName.value.trim(),
        account_type: googleProfileIsNew ? accountType : profile.account_type
      })
      .eq('id', user.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Your profile could not be saved. Please sign in again or contact support.');

    sessionStorage.removeItem(oauthPendingKey);
    sessionStorage.removeItem(accountTypeIntentKey);
    window.location.replace(getDestinationForAccountType(googleProfileIsNew ? accountType : profile.account_type));
  } catch (error) {
    showMessage(error.message || 'Unable to save your profile. Please try again.');
    saveGoogleProfileButton.disabled = false;
    saveGoogleProfileButton.textContent = 'Continue';
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