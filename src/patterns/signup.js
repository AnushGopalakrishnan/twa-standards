/** Host supplies the submit callback; this module never sends network requests. */
export function mountSignup({trigger, overlay = document.querySelector('.signup-overlay'), submit, beforeOpen = async () => {}}) {
  if (!trigger || !overlay) return;
  const form = overlay.querySelector('.signup-form');
  const email = overlay.querySelector('.signup-field');
  const status = overlay.querySelector('.signup-status');
  const button = overlay.querySelector('.signup-submit');
  const background = new Map();
  const listeners = new AbortController();
  const options = {signal: listeners.signal};
  let overflow = '', returnFocus, attempt = 0, opening = false, disposed = false;
  async function open() {
    if (disposed || opening || !overlay.hidden) return;
    opening = true;
    const token = ++attempt;
    const opener = document.activeElement;
    try { await beforeOpen(); } finally { opening = false; }
    if (disposed || token !== attempt) return;
    returnFocus = opener === document.body ? trigger : opener;
    overflow = document.body.style.overflow;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    for (const node of document.body.children) {
      if (node !== overlay && !node.contains(overlay) && !['SCRIPT', 'STYLE'].includes(node.tagName)) {
        background.set(node, node.inert); node.inert = true;
      }
    }
    requestAnimationFrame(() => {if (!overlay.hidden) email.focus();});
  }
  function dismiss(restoreFocus) {
    attempt++;
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = overflow;
    for (const [node, inert] of background) node.inert = inert;
    background.clear();
    status.textContent = '';
    email.removeAttribute('aria-invalid');
    button.disabled = false;
    form.removeAttribute('aria-busy');
    if (restoreFocus) (returnFocus?.isConnected ? returnFocus : trigger).focus();
  }
  function close() {dismiss(true);}
  function dispose() {
    disposed = true;
    dismiss(false);
    listeners.abort();
  }
  trigger.addEventListener('click', open, options);
  overlay.querySelector('.signup-close').addEventListener('click', close, options);
  overlay.querySelector('.signup-cancel').addEventListener('click', close, options);
  overlay.addEventListener('click', event => {if (event.target === overlay) close();}, options);
  document.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') {event.preventDefault(); close();}
    if (event.key !== 'Tab') return;
    const controls = [...overlay.querySelectorAll('button:not(:disabled), input:not([tabindex="-1"]), a[href]')];
    const first = controls[0], last = controls.at(-1);
    if (!overlay.contains(document.activeElement)) {event.preventDefault(); (event.shiftKey ? last : first).focus(); return;}
    if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
  }, options);
  email.addEventListener('input', () => email.removeAttribute('aria-invalid'), options);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled) return;
    status.textContent = '';
    if (!email.validity.valid) {
      email.setAttribute('aria-invalid', 'true');
      status.textContent = 'Enter a valid email address.';
      email.focus(); return;
    }
    const token = ++attempt;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Subscribing…';
    try {
      const message = await submit({email:email.value, website:form.elements.website.value});
      if (token !== attempt) return;
      status.textContent = message || 'You’re subscribed.';
      form.reset();
    } catch (error) {
      if (token === attempt) status.textContent = error.message || 'Could not subscribe. Try again.';
    } finally {
      if (token === attempt) {button.disabled = false; form.removeAttribute('aria-busy');}
    }
  }, options);
  return {open, close, dispose};
}
