(() => {
  if (document.getElementById('userGuideRoot')) return;

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = 'assets/css/user-guide.css';
  document.head.append(stylesheet);

  const root = document.createElement('div');
  root.id = 'userGuideRoot';
  root.innerHTML = `
    <button class="user-guide-trigger" type="button" aria-label="Open user guide" aria-haspopup="dialog" aria-expanded="false" title="User guide">
      <span class="user-guide-bubble" aria-hidden="true">?</span>
    </button>
    <dialog class="user-guide-dialog" aria-labelledby="userGuideHeading" aria-describedby="userGuideIntro">
      <div class="user-guide-content">
        <p class="user-guide-kicker">BigWrapes Pixel</p>
        <h2 id="userGuideHeading">User guide</h2>
        <p class="user-guide-intro" id="userGuideIntro">Where would you like to go?</p>
        <nav class="user-guide-links" aria-label="User guide links">
          <a href="user-guide.html">Read the full user guide</a>
          <a href="businesses.html">Browse businesses</a>
          <a href="signup.html">Create a student account</a>
          <a href="owneresignup.html">Register as a business owner</a>
          <a href="business-submit.html">List or manage your business</a>
          <a href="login.html">Sign in</a>
          <a href="contact.html">Contact BigWrapes Pixel</a>
        </nav>
        <div class="user-guide-footer">
          <button class="user-guide-close" type="button">Close guide</button>
        </div>
      </div>
    </dialog>
  `;
  document.body.append(root);

  const trigger = root.querySelector('.user-guide-trigger');
  const dialog = root.querySelector('.user-guide-dialog');
  const closeButton = root.querySelector('.user-guide-close');

  trigger.addEventListener('click', () => {
    dialog.showModal();
    trigger.setAttribute('aria-expanded', 'true');
  });
  function closeGuide() {
    if (dialog.open) dialog.close();
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  }

  closeButton.addEventListener('click', closeGuide);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeGuide();
  });
  dialog.addEventListener('cancel', () => {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dialog.open) closeGuide();
  });
  dialog.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  });
})();