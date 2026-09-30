const form = document.getElementById('businessForm');
const message = document.getElementById('businessMessage');
const submitButton = document.getElementById('submitBusinessButton');
const productImagesInput = document.getElementById('productImages');
const productImageCount = document.getElementById('productImageCount');
const productImagePreviews = document.getElementById('productImagePreviews');
const ownedBusinesses = document.getElementById('ownedBusinesses');
const bucketName = 'business-images';
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
  currentUser = user;
  return user;
}

const currentUserPromise = requireUser().catch((error) => {
  showMessage(error.message);
  return null;
});

function isValidImage(file) {
  return allowedImageTypes.includes(file.type) && file.size <= maxImageBytes;
}

function safeFileName(file) {
  return file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function makeImagePath(userId, businessId, file) {
  return `${userId}/${businessId}/${crypto.randomUUID()}-${safeFileName(file)}`;
}

function renderSelectedPreviews() {
  productImagePreviews.querySelectorAll('img').forEach((image) => URL.revokeObjectURL(image.src));
  productImagePreviews.replaceChildren();
  productImageCount.textContent = `${selectedProductImages.length} of ${maxProductImages} product images selected. Each image can be up to 5 MB.`;

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

async function uploadProductImage(user, businessId, file) {
  if (!isValidImage(file)) {
    throw new Error('Use JPG, PNG, or WebP images no larger than 5 MB each.');
  }

  const imagePath = makeImagePath(user.id, businessId, file);
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(imagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from('business_product_images').insert({
    business_id: businessId,
    owner_id: user.id,
    image_path: imagePath
  });
  if (insertError) {
    await supabase.storage.from(bucketName).remove([imagePath]);
    throw insertError;
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
    .select('id, business_name, category, business_product_images(id, image_path, created_at)')
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

    section.append(heading, count, grid, addLabel, addInput);
    ownedBusinesses.append(section);
  });
}

currentUserPromise.then((user) => {
  if (!user) return;
  loadOwnedBusinesses().catch((error) => showMessage(error.message));
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
    if (selectedProductImages.length < 1 || selectedProductImages.length > maxProductImages) {
      throw new Error(`Choose between 1 and ${maxProductImages} product images.`);
    }

    coverImagePath = `${user.id}/covers/${crypto.randomUUID()}-${safeFileName(coverImage)}`;
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(coverImagePath, coverImage, { contentType: coverImage.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data: business, error: insertError } = await supabase.from('businesses').insert({
      owner_id: user.id,
      business_name: document.getElementById('businessName').value.trim(),
      category: document.getElementById('category').value,
      description: document.getElementById('description').value.trim(),
      image_path: coverImagePath
    }).select('id').single();
    if (insertError) throw insertError;
    businessId = business.id;

    for (const file of selectedProductImages) {
      await uploadProductImage(user, business.id, file);
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