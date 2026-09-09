/** Theme preference stays in the host application's storage namespace. */
export function mountTheme(button, {storageKey = 'twa-theme'} = {}) {
  if (!button) return;
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  } catch (_) { /* Storage is optional, including in private browsing. */ }
  function update() {
    const light = root.dataset.theme === 'light';
    const label = button.querySelector('.theme-toggle-label');
    if (label) label.textContent = light ? 'Dark mode' : 'Light mode';
    button.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
    button.setAttribute('aria-pressed', String(light));
  }
  function toggle() {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(storageKey, root.dataset.theme); } catch (_) {}
    window.dispatchEvent(new CustomEvent('twa:theme'));
  }
  update();
  button.addEventListener('click', toggle);
  window.addEventListener('twa:theme', update);
  return () => {button.removeEventListener('click', toggle); window.removeEventListener('twa:theme', update);};
}
