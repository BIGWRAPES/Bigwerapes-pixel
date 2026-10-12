const assistantPage = document.getElementById('aiAssistantPage');
const accessMessage = document.getElementById('aiAssistantAccessMessage');
const assistantForm = document.getElementById('aiAssistantForm');
const actionSelect = document.getElementById('aiAction');
const productFields = document.getElementById('aiProductFields');
const promotionFields = document.getElementById('aiPromotionFields');
const businessFields = document.getElementById('aiBusinessFields');
const productNameInput = document.getElementById('aiProductName');
const productFactsInput = document.getElementById('aiProductFacts');
const promotionDetailsInput = document.getElementById('aiPromotionDetails');
const businessDescriptionInput = document.getElementById('aiBusinessDescription');
const message = document.getElementById('aiAssistantMessage');
const resultPanel = document.getElementById('aiResultPanel');
const resultInput = document.getElementById('aiResult');
const generateButton = document.getElementById('aiGenerateButton');
const regenerateButton = document.getElementById('aiRegenerateButton');
const copyButton = document.getElementById('aiCopyButton');
const insertButton = document.getElementById('aiInsertButton');
const copyOnlyHelp = document.getElementById('aiCopyOnlyHelp');
const assistantDraftStorageKey = 'bigwrapesAiAssistantDraft';
let currentUserId;

function showMessage(text, type = 'danger') {
  message.textContent = text;
  message.className = `alert alert-${type}`;
  message.hidden = false;
}

function showAccessError(text) {
  accessMessage.textContent = text;
  accessMessage.hidden = false;
}

async function authorizeAssistant() {
  try {
    const supabase = await window.supabaseReady;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      window.location.replace('login.html');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.account_type !== 'entrepreneur') {
      window.location.replace('businesses.html');
      return;
    }

    currentUserId = user.id;
    assistantPage.hidden = false;
    accessMessage.hidden = true;
  } catch {
    showAccessError('Unable to verify your assistant access. Please try again.');
  }
}

function updateActionFields() {
  const action = actionSelect.value;
  productFields.hidden = action !== 'product_description';
  productNameInput.required = action === 'product_description';
  productFactsInput.required = action === 'product_description';

  promotionFields.hidden = !['social_caption', 'whatsapp_message'].includes(action);
  promotionDetailsInput.required = !promotionFields.hidden;

  businessFields.hidden = action !== 'business_description';
  businessDescriptionInput.required = action === 'business_description';

  const hasInsertTarget = ['product_description', 'business_description'].includes(action);
  insertButton.hidden = !hasInsertTarget;
  copyOnlyHelp.hidden = hasInsertTarget || !action;
}

function handleActionChange() {
  updateActionFields();
  resultPanel.hidden = true;
  resultInput.value = '';
  message.hidden = true;
}

function hasTrimmedValue(input, label) {
  if (input.value.trim()) return true;
  input.setCustomValidity(`${label} cannot be empty.`);
  input.reportValidity();
  input.setCustomValidity('');
  return false;
}

function createRequest() {
  const action = actionSelect.value;
  if (!actionSelect.checkValidity()) {
    actionSelect.reportValidity();
    return null;
  }

  if (action === 'product_description') {
    if (!hasTrimmedValue(productNameInput, 'Product name')
      || !hasTrimmedValue(productFactsInput, 'Factual product details')) return null;
    return {
      action,
      productName: productNameInput.value.trim(),
      productFacts: productFactsInput.value.trim()
    };
  }

  if (action === 'social_caption' || action === 'whatsapp_message') {
    if (!hasTrimmedValue(promotionDetailsInput, 'Promotion details')) return null;
    return { action, promotionDetails: promotionDetailsInput.value.trim() };
  }

  if (action === 'business_description') {
    if (!hasTrimmedValue(businessDescriptionInput, 'Business description')) return null;
    return { action, businessDescription: businessDescriptionInput.value.trim() };
  }

  return null;
}

async function readFunctionError(error) {
  const response = error?.context;
  if (response instanceof Response) {
    try {
      const body = await response.json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      return error.message;
    }
  }
  return error?.message || 'The AI request could not be completed. Please try again.';
}

async function generate(request) {
  const supabase = await window.supabaseReady;
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Your session has expired. Sign in again to use the assistant.');
  }

  const { data, error } = await supabase.functions.invoke('ai-business-assistant', { body: request });
  if (error) throw new Error(await readFunctionError(error));
  if (typeof data?.text !== 'string' || !data.text.trim()) {
    throw new Error('The assistant returned an empty response. Please try again.');
  }
  return data.text.trim();
}

async function handleGenerate(event) {
  event?.preventDefault();
  const request = createRequest();
  if (!request) return;

  generateButton.disabled = true;
  regenerateButton.disabled = true;
  assistantForm.setAttribute('aria-busy', 'true');
  message.hidden = true;
  showMessage('Preparing your draft…', 'info');

  try {
    resultInput.value = await generate(request);
    resultPanel.hidden = false;
    showMessage('Draft ready. Review and edit it before copying or sending it to your business form.', 'success');
  } catch (error) {
    showMessage(error.message || 'The assistant request failed. Please try again.');
  } finally {
    generateButton.disabled = false;
    regenerateButton.disabled = false;
    assistantForm.removeAttribute('aria-busy');
  }
}

function sendDraftToBusinessForm() {
  const action = actionSelect.value;
  const text = resultInput.value.trim();
  if (!text) return;

  const targetLimit = action === 'product_description' ? 1000 : 2000;
  if (text.length > targetLimit) {
    showMessage(`This draft is too long for the existing ${action === 'product_description' ? 'product' : 'business'} description field. Shorten it to ${targetLimit} characters or fewer before sending it.`);
    resultInput.focus();
    return;
  }

  try {
    sessionStorage.setItem(assistantDraftStorageKey, JSON.stringify({
      action,
      ownerId: currentUserId,
      text
    }));
    window.location.assign('business-submit.html');
  } catch {
    showMessage('Unable to pass the draft to your business form. Copy the text instead.');
  }
}

actionSelect.addEventListener('change', handleActionChange);
assistantForm.addEventListener('submit', handleGenerate);
regenerateButton.addEventListener('click', () => handleGenerate());
copyButton.addEventListener('click', async () => {
  if (!resultInput.value.trim()) return;
  try {
    await navigator.clipboard.writeText(resultInput.value);
    showMessage('Draft copied to the clipboard.', 'success');
  } catch {
    showMessage('Clipboard access failed. Select the editable draft and copy it manually.');
  }
});
insertButton.addEventListener('click', sendDraftToBusinessForm);

updateActionFields();
authorizeAssistant();
