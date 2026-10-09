const form = document.getElementById('businessForm');
const message = document.getElementById('businessMessage');
const submitButton = document.getElementById('submitBusinessButton');
const productImagesInput = document.getElementById('productImages');
const productImageCount = document.getElementById('productImageCount');
const productImagePreviews = document.getElementById('productImagePreviews');
const ownedBusinesses = document.getElementById('ownedBusinesses');
const saveOwnerProfileButton = document.getElementById('saveOwnerProfileButton');
const deleteAccountButton = document.getElementById('deleteAccountButton');
const bucketName = 'business-images';
const defaultBusinessImage = 'assets/img/portfolio/portfolio-1.webp';
const maxProductImages = 15;
const maxImageBytes = 5 * 1024 * 1024;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
let selectedProductImages = [];
let currentUser;
let supabase;

function showMessage(text, type = 'danger') {
  message.textContent = text;
  message.className = `alert alert-${type}`;
  message.style.display = 'block';
}

async function requireUser() {
  supabase = await window.supabaseReady;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    window.location.replace('login.html');
    return null;
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (profile?.account_type !== 'entrepreneur') {
    window.location.replace('businesses.html');
    return null;
  }
  currentUser = user;
  document.getElementById('businessAccessMessage').hidden = true;
  document.querySelector('.business-panel').hidden = false;
  return user;
}

const currentUserPromise = requireUser().catch((error) => {
  const accessMessage = document.getElementById('businessAccessMessage');
  accessMessage.textContent = `Unable to verify your business dashboard access. Please try again. ${error.message}`;
  accessMessage.hidden = false;
  return null;
});

function isValidImage(file) {
  return allowedImageTypes.includes(file.type) && file.size <= maxImageBytes;
}

function safeFileName(file) {
  return file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function readWhatsAppNumber(value) {
  const number = value.trim();
  if (number && !/\d/.test(number)) {
    throw new Error('Enter a WhatsApp number with its international country code.');
  }
  return number || null;
}

function makeImagePath(userId, businessId, file) {
  return `${userId}/${businessId}/${crypto.randomUUID()}-${safeFileName(file)}`;
}

function slugifyBusinessName(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'business';
}

async function createBusinessSlug(name) {
  const baseSlug = slugifyBusinessName(name);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('business_slug', candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function saveOwnerProfile(user) {
  const ownerProfile = {
    owner_id: user.id,
    owner_name: document.getElementById('ownerName').value.trim(),
    owner_avatar_url: document.getElementById('ownerAvatarUrl').value.trim() || null,
    owner_bio: document.getElementById('ownerBio').value.trim()
  };
  if (!ownerProfile.owner_name || !ownerProfile.owner_bio) {
    throw new Error('Enter a display name and short bio for your public profile.');
  }

  const { error } = await supabase
    .from('business_owner_public_profiles')
    .upsert(ownerProfile, { onConflict: 'owner_id' });
  if (error) throw error;
}

function renderSelectedPreviews() {
  productImagePreviews.querySelectorAll('img').forEach((image) => URL.revokeObjectURL(image.src));
  productImagePreviews.replaceChildren();
  productImageCount.textContent = `${selectedProductImages.length} of ${maxProductImages} optional product images selected. Each image can be up to 5 MB.`;

  selectedProductImages.forEach((file, index) => {
    const preview = document.createElement('div');
    preview.className = 'photo-preview';
    const image = document.createElement('img');
    image.src = URL.createObjectURL(file);
    image.alt = file.name;
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-danger btn-sm';
    removeButton.setAttribute('aria-label', `Remove ${file.name}`);
    removeButton.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';
    removeButton.addEventListener('click', () => {
      URL.revokeObjectURL(image.src);
      selectedProductImages.splice(index, 1);
      syncProductInput();
      renderSelectedPreviews();
    });
    preview.append(image, removeButton);
    productImagePreviews.append(preview);
  });
}

function syncProductInput() {
  const transfer = new DataTransfer();
  selectedProductImages.forEach((file) => transfer.items.add(file));
  productImagesInput.files = transfer.files;
}

productImagesInput.addEventListener('change', () => {
  const incoming = Array.from(productImagesInput.files);
  const combined = [...selectedProductImages, ...incoming];

  if (combined.length > maxProductImages) {
    showMessage(`A business can have up to ${maxProductImages} product images. Remove some selected images first.`);
    syncProductInput();
    return;
  }
  const invalidImage = incoming.find((file) => !isValidImage(file));
  if (invalidImage) {
    showMessage('Use JPG, PNG, or WebP product images no larger than 5 MB each.');
    syncProductInput();
    return;
  }

  selectedProductImages = combined;
  renderSelectedPreviews();
});

async function uploadProductImage(user, businessId, file, productId = null) {
  if (!isValidImage(file)) {
    throw new Error('Use JPG, PNG, or WebP images no larger than 5 MB each.');
  }

  const imagePath = makeImagePath(user.id, businessId, file);
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(imagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const payload = {
    business_id: businessId,
    owner_id: user.id,
    image_path: imagePath,
    product_id: productId
  };

  const { error: insertError } = await supabase.from('business_product_images').insert(payload);
  if (insertError) {
    await supabase.storage.from(bucketName).remove([imagePath]);
    throw insertError;
  }
}

async function createProductRecord(businessId, userId) {
  const productName = document.getElementById('productName').value.trim();
  const productDescription = document.getElementById('productDescription').value.trim();
  const productPriceRaw = document.getElementById('productPrice').value;
  const productPrice = productPriceRaw === '' ? null : Number(productPriceRaw);

  if (!productName && !productDescription && productPriceRaw === '' && selectedProductImages.length > 0) {
    return null;
  }

  if (!productName && !productDescription && productPriceRaw === '') {
    return null;
  }

  if (!productName) {
    throw new Error('Enter a product name before saving product details.');
  }

  if (Number.isNaN(productPrice)) {
    throw new Error('Product price must be a valid number.');
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      business_id: businessId,
      name: productName,
      description: productDescription || '',
      price: productPrice,
      updated_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function replaceBusinessImage(business, file, buttons) {
  if (!isValidImage(file)) {
    throw new Error('Use a JPG, PNG, or WebP cover image no larger than 5 MB.');
  }

  buttons.forEach((button) => { button.disabled = true; });
  const newImagePath = `${currentUser.id}/covers/${crypto.randomUUID()}-${safeFileName(file)}`;
  let uploaded = false;
  let businessUpdated = false;
  try {
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(newImagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    uploaded = true;

    const { data, error: updateError } = await supabase
      .from('businesses')
      .update({ image_path: newImagePath })
      .eq('id', business.id)
      .eq('owner_id', currentUser.id)
      .select('id')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!data) throw new Error('The business could not be updated. Refresh the page and try again.');
    businessUpdated = true;

    let notice = 'Business picture updated.';
    if (business.image_path) {
      const { error: removeError } = await supabase.storage.from(bucketName).remove([business.image_path]);
      if (removeError) notice += ' The previous image could not be removed from Storage.';
    }
    showMessage(notice, notice.includes('could not') ? 'warning' : 'success');
    await loadOwnedBusinesses();
  } catch (error) {
    if (uploaded && !businessUpdated) {
      const { error: cleanupError } = await supabase.storage.from(bucketName).remove([newImagePath]);
      if (cleanupError) {
        throw new Error(`${error.message} The newly uploaded image could not be cleaned up: ${cleanupError.message}`);
      }
    }
    throw error;
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

async function deleteBusinessImage(business, buttons) {
  if (!business.image_path) return;
  if (!window.confirm(`Delete the business picture for "${business.business_name}"?`)) return;

  buttons.forEach((button) => { button.disabled = true; });
  try {
    const { error: removeError } = await supabase.storage.from(bucketName).remove([business.image_path]);
    if (removeError) throw removeError;

    const { data, error: updateError } = await supabase
      .from('businesses')
      .update({ image_path: null })
      .eq('id', business.id)
      .eq('owner_id', currentUser.id)
      .select('id')
      .maybeSingle();
    if (updateError) {
      throw new Error(`The image file was removed, but the business record could not be updated: ${updateError.message}`);
    }
    if (!data) {
      throw new Error('The image file was removed, but the business record could not be updated. Retry to clear the picture.');
    }
    await loadOwnedBusinesses();
    showMessage('Business picture deleted.', 'success');
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

async function saveBusinessContacts(business, whatsappInput, emailInput, button) {
  const whatsappNumber = readWhatsAppNumber(whatsappInput.value);
  const email = emailInput.value.trim();
  if (email && !emailInput.checkValidity()) {
    emailInput.reportValidity();
    throw new Error('Enter a valid business email address.');
  }

  button.disabled = true;
  try {
    const { data, error } = await supabase
      .from('businesses')
      .update({
        whatsapp_number: whatsappNumber,
        email: email || null
      })
      .eq('id', business.id)
      .eq('owner_id', currentUser.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('This business could not be updated. Confirm you are signed in as its owner.');
    showMessage(`Contact details for "${business.business_name}" were saved.`, 'success');
  } finally {
    button.disabled = false;
  }
}

function createProductPhoto(business, photo) {
  const wrapper = document.createElement('div');
  wrapper.className = 'owned-product-photo';
  const image = document.createElement('img');
  image.src = supabase.storage.from(bucketName).getPublicUrl(photo.image_path).data.publicUrl;
  image.alt = `Product photo for ${business.business_name}`;
  image.loading = 'lazy';
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'btn btn-danger btn-sm';
  removeButton.setAttribute('aria-label', `Remove this product photo from ${business.business_name}`);
  removeButton.innerHTML = '<i class="bi bi-trash" aria-hidden="true"></i>';
  removeButton.addEventListener('click', async () => {
    if (!window.confirm('Remove this product photo? This cannot be undone.')) return;
    const { error: deleteError } = await supabase
      .from('business_product_images')
      .delete()
      .eq('id', photo.id)
      .eq('owner_id', currentUser.id);
    if (deleteError) {
      showMessage(deleteError.message);
      removeButton.disabled = false;
      return;
    }

    const { error: storageError } = await supabase.storage.from(bucketName).remove([photo.image_path]);
    await loadOwnedBusinesses();
    showMessage(
      storageError ? 'Photo entry removed, but its stored file could not be deleted.' : 'Product photo removed.',
      storageError ? 'warning' : 'success'
    );
  });
  wrapper.append(image, removeButton);
  return wrapper;
}

async function loadOwnedBusinesses() {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, business_name, category, image_path, whatsapp_number, email, business_product_images(id, image_path, created_at)')
    .eq('owner_id', currentUser.id)
    .order('created_at', { ascending: false });
  if (error) throw error;

  ownedBusinesses.replaceChildren();
  if (!data.length) {
    ownedBusinesses.innerHTML = '<p>You have not submitted a business yet.</p>';
    return;
  }

  data.forEach((business) => {
    const section = document.createElement('section');
    section.className = 'owned-business';
    const heading = document.createElement('h3');
    heading.className = 'h5';
    heading.textContent = business.business_name;
    const coverHeading = document.createElement('h4');
    coverHeading.className = 'h6 mt-3';
    coverHeading.textContent = 'Business profile picture';
    const coverImage = document.createElement('img');
    coverImage.className = 'owned-business-cover';
    coverImage.src = business.image_path
      ? supabase.storage.from(bucketName).getPublicUrl(business.image_path).data.publicUrl
      : defaultBusinessImage;
    coverImage.alt = `${business.business_name} picture`;
    coverImage.loading = 'lazy';
    const pictureControls = document.createElement('div');
    pictureControls.className = 'picture-controls d-flex flex-wrap gap-2 mt-2';
    const changePictureButton = document.createElement('button');
    changePictureButton.type = 'button';
    changePictureButton.className = 'btn btn-outline-primary btn-sm';
    changePictureButton.textContent = 'Change Picture';
    const pictureInput = document.createElement('input');
    pictureInput.type = 'file';
    pictureInput.accept = allowedImageTypes.join(',');
    pictureInput.className = 'visually-hidden';
    pictureInput.setAttribute('aria-label', `Choose a new business picture for ${business.business_name}`);
    const deletePictureButton = document.createElement('button');
    deletePictureButton.type = 'button';
    deletePictureButton.className = 'btn btn-outline-danger btn-sm';
    deletePictureButton.textContent = 'Delete Picture';
    deletePictureButton.disabled = !business.image_path;
    const pictureButtons = [changePictureButton, deletePictureButton];
    changePictureButton.addEventListener('click', () => pictureInput.click());
    pictureInput.addEventListener('change', async () => {
      const file = pictureInput.files[0];
      pictureInput.value = '';
      if (!file) return;
      try {
        await replaceBusinessImage(business, file, pictureButtons);
      } catch (error) {
        showMessage(error.message || 'Unable to update the business picture.');
      }
    });
    deletePictureButton.addEventListener('click', async () => {
      try {
        await deleteBusinessImage(business, pictureButtons);
      } catch (error) {
        showMessage(error.message || 'Unable to delete the business picture.');
      }
    });
    pictureControls.append(changePictureButton, deletePictureButton, pictureInput);
    const contactSection = document.createElement('div');
    contactSection.className = 'owned-business-contacts mt-4';
    const contactHeading = document.createElement('h4');
    contactHeading.className = 'h6';
    contactHeading.textContent = 'Public contact details';
    const whatsappId = `businessWhatsapp-${business.id}`;
    const whatsappLabel = document.createElement('label');
    whatsappLabel.className = 'form-label';
    whatsappLabel.htmlFor = whatsappId;
    whatsappLabel.textContent = 'WhatsApp number';
    const whatsappInput = document.createElement('input');
    whatsappInput.className = 'form-control';
    whatsappInput.id = whatsappId;
    whatsappInput.type = 'tel';
    whatsappInput.maxLength = 40;
    whatsappInput.autocomplete = 'tel';
    whatsappInput.placeholder = 'Include country code';
    whatsappInput.value = business.whatsapp_number || '';
    const emailId = `businessEmail-${business.id}`;
    const emailLabel = document.createElement('label');
    emailLabel.className = 'form-label';
    emailLabel.htmlFor = emailId;
    emailLabel.textContent = 'Business email';
    const emailInput = document.createElement('input');
    emailInput.className = 'form-control';
    emailInput.id = emailId;
    emailInput.type = 'email';
    emailInput.maxLength = 254;
    emailInput.autocomplete = 'email';
    emailInput.value = business.email || '';
    const contactHelp = document.createElement('p');
    contactHelp.className = 'form-text';
    contactHelp.textContent = 'Both details are public. Enter an international WhatsApp number including its country code.';
    const saveContactsButton = document.createElement('button');
    saveContactsButton.type = 'button';
    saveContactsButton.className = 'btn btn-outline-primary btn-sm mt-2';
    saveContactsButton.textContent = 'Save contact details';
    saveContactsButton.addEventListener('click', async () => {
      try {
        await saveBusinessContacts(business, whatsappInput, emailInput, saveContactsButton);
      } catch (error) {
        showMessage(error.message || 'Unable to save business contact details.');
      }
    });
    contactSection.append(
      contactHeading,
      whatsappLabel,
      whatsappInput,
      emailLabel,
      emailInput,
      contactHelp,
      saveContactsButton
    );
    const count = document.createElement('p');
    count.className = 'form-text';
    count.textContent = `${business.business_product_images.length} of ${maxProductImages} product images`;
    const grid = document.createElement('div');
    grid.className = 'owned-business-gallery';
    business.business_product_images.forEach((photo) => grid.append(createProductPhoto(business, photo)));

    const addLabel = document.createElement('label');
    addLabel.className = 'form-label';
    addLabel.textContent = 'Add product photos';
    const addInput = document.createElement('input');
    addInput.type = 'file';
    addInput.className = 'form-control';
    addInput.accept = 'image/jpeg,image/png,image/webp';
    addInput.multiple = true;
    addInput.disabled = business.business_product_images.length >= maxProductImages;
    addInput.setAttribute('aria-label', `Add product photos to ${business.business_name}`);
    addInput.addEventListener('change', async () => {
      const files = Array.from(addInput.files);
      const availableSlots = maxProductImages - business.business_product_images.length;
      if (files.length > availableSlots) {
        showMessage(`This business has ${availableSlots} product photo slot${availableSlots === 1 ? '' : 's'} remaining. Remove a photo or choose fewer files.`);
        addInput.value = '';
        return;
      }
      if (files.some((file) => !isValidImage(file))) {
        showMessage('Use JPG, PNG, or WebP product images no larger than 5 MB each.');
        addInput.value = '';
        return;
      }

      addInput.disabled = true;
      try {
        for (const file of files) await uploadProductImage(currentUser, business.id, file);
        showMessage('Product photos added.', 'success');
        await loadOwnedBusinesses();
      } catch (uploadError) {
        showMessage(uploadError.message);
        await loadOwnedBusinesses();
      }
    });

    section.append(heading, coverHeading, coverImage, pictureControls, contactSection, count, grid, addLabel, addInput);
    ownedBusinesses.append(section);
  });
}

currentUserPromise.then((user) => {
  if (!user) return;
  supabase
    .from('business_owner_public_profiles')
    .select('owner_name, owner_avatar_url, owner_bio')
    .eq('owner_id', user.id)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) throw error;
      if (!data) return;
      document.getElementById('ownerName').value = data.owner_name || '';
      document.getElementById('ownerAvatarUrl').value = data.owner_avatar_url || '';
      document.getElementById('ownerBio').value = data.owner_bio || '';
    })
    .catch((error) => showMessage(error.message));
  loadOwnedBusinesses().catch((error) => showMessage(error.message));
});

saveOwnerProfileButton.addEventListener('click', async () => {
  saveOwnerProfileButton.disabled = true;
  try {
    const user = await currentUserPromise;
    if (!user) throw new Error('Please sign in to save your public profile.');
    await saveOwnerProfile(user);
    showMessage('Your public profile was saved.', 'success');
  } catch (error) {
    showMessage(error.message || 'Unable to save your public profile.');
  } finally {
    saveOwnerProfileButton.disabled = false;
  }
});

document.getElementById('signOutButton').addEventListener('click', async () => {
  try {
    const client = supabase || await window.supabaseReady;
    const { error } = await client.auth.signOut();
    if (error) throw error;
    window.location.replace('login.html');
  } catch (error) {
    showMessage(error.message);
  }
});

deleteAccountButton.addEventListener('click', async () => {
  if (!window.confirm('Permanently delete your account, business listings, public owner profile, and associated images? This cannot be undone.')) return;

  deleteAccountButton.disabled = true;
  deleteAccountButton.textContent = 'Deleting account...';
  try {
    const user = await currentUserPromise;
    if (!user) throw new Error('Please sign in again before deleting your account.');

    const { error: deleteError } = await supabase.functions.invoke('delete-account');
    if (deleteError) {
      const response = deleteError.context;
      const body = response instanceof Response
        ? await response.json().catch(() => null)
        : null;
      throw new Error(body?.error || deleteError.message);
    }

    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) throw signOutError;
    window.location.replace('login.html');
  } catch (error) {
    showMessage(error.message || 'Unable to delete your account.');
    deleteAccountButton.disabled = false;
    deleteAccountButton.textContent = 'Delete My Account';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = 'Uploading...';

  let coverImagePath;
  let businessId;
  try {
    const user = await currentUserPromise;
    if (!user) throw new Error('Please sign in to submit a business.');

    const coverImage = document.getElementById('businessImage').files[0];
    if (!coverImage || !isValidImage(coverImage)) {
      throw new Error('Choose a JPG, PNG, or WebP cover image no larger than 5 MB.');
    }
    if (selectedProductImages.length > maxProductImages) {
      throw new Error(`Choose no more than ${maxProductImages} product images.`);
    }

    await saveOwnerProfile(user);

    coverImagePath = `${user.id}/covers/${crypto.randomUUID()}-${safeFileName(coverImage)}`;
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(coverImagePath, coverImage, { contentType: coverImage.type, upsert: false });
    if (uploadError) throw uploadError;

    const businessName = document.getElementById('businessName').value.trim();
    const businessSlug = await createBusinessSlug(businessName);
    const whatsappNumber = readWhatsAppNumber(document.getElementById('businessWhatsAppNumber').value);
    const { data: business, error: insertError } = await supabase.from('businesses').insert({
      owner_id: user.id,
      business_name: businessName,
      business_slug: businessSlug,
      category: document.getElementById('category').value,
      description: document.getElementById('description').value.trim(),
      image_path: coverImagePath,
      whatsapp_number: whatsappNumber,
      email: document.getElementById('businessEmail').value.trim() || null
    }).select('id').single();
    if (insertError) throw insertError;
    businessId = business.id;

    let createdProductId = null;
    const hasProductDetails = document.getElementById('productName').value.trim() || document.getElementById('productDescription').value.trim() || document.getElementById('productPrice').value !== '';
    if (hasProductDetails) {
      createdProductId = await createProductRecord(business.id, user.id);
    }

    for (const file of selectedProductImages) {
      await uploadProductImage(user, business.id, file, createdProductId);
    }

    showMessage('Your business was published successfully.', 'success');
    form.reset();
    selectedProductImages = [];
    renderSelectedPreviews();
    await loadOwnedBusinesses();
  } catch (error) {
    if (businessId && supabase) {
      await supabase.from('businesses').delete().eq('id', businessId).eq('owner_id', currentUser.id);
      const { data: remainingFiles } = await supabase.storage.from(bucketName).list(`${currentUser.id}/${businessId}`);
      if (remainingFiles?.length) {
        await supabase.storage.from(bucketName).remove(remainingFiles.map((file) => `${currentUser.id}/${businessId}/${file.name}`));
      }
    }
    if (coverImagePath && supabase) {
      await supabase.storage.from(bucketName).remove([coverImagePath]);
    }
    showMessage(error.message || 'Unable to publish your business.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Upload and publish';
  }
});