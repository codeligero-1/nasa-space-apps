const adminStatus = document.querySelector('#adminAuthStatus');
const adminForm = document.querySelector('#adminLoginForm');
const authorizeButton = document.querySelector('#authorizeButton');
const themeToggle = document.querySelector('#adminThemeToggle');
const passwordInput = document.querySelector('#adminPassword');
const passwordToggle = document.querySelector('#passwordToggle');
const showPasswordIcon = document.querySelector('.eye-open');
const hidePasswordIcon = document.querySelector('.eye-off');
const themeStorageKey = 'vital.admin.theme';

function setTheme(theme, save = false) {
  document.documentElement.dataset.adminTheme = theme;
  themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
  themeToggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
  );

  if (save) {
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      adminStatus.textContent = 'Theme changed for this session, but the preference could not be saved.';
    }
  }
}

try {
  const savedTheme = localStorage.getItem(themeStorageKey);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    setTheme(savedTheme);
  }
} catch {
  adminStatus.textContent = 'Theme preference could not be loaded.';
}

themeToggle.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.adminTheme === 'dark' ? 'light' : 'dark';
  adminStatus.textContent = '';
  setTheme(nextTheme, true);
});

passwordToggle.addEventListener('click', () => {
  const showPassword = passwordInput.type === 'password';
  passwordInput.type = showPassword ? 'text' : 'password';
  passwordToggle.setAttribute('aria-pressed', String(showPassword));
  passwordToggle.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
  showPasswordIcon.hidden = showPassword;
  hidePasswordIcon.hidden = !showPassword;
});

adminForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!adminForm.reportValidity()) {
    return;
  }

  authorizeButton.disabled = true;
  adminStatus.textContent = 'Verifying administrator access…';
  const originalLabel = authorizeButton.textContent;
  authorizeButton.textContent = 'AUTHORIZING…';

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.querySelector('#adminUsername').value,
        password: passwordInput.value,
        remember: document.querySelector('#rememberDevice').checked
      })
    });
    const result = await response.json();

    if (!response.ok) {
      adminStatus.textContent = result.error || 'Unable to authorize this account.';
      return;
    }

    window.location.assign('/admin/dashboard');
  } catch {
    adminStatus.textContent = 'Unable to reach the authentication service. Try again shortly.';
  } finally {
    authorizeButton.disabled = false;
    authorizeButton.textContent = originalLabel;
  }
});
