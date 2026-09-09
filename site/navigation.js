// Progressive enhancement for documentation only. Every URL remains a real HTML page.
export function mountNavigation({mountPage}) {
  const links = [...document.querySelectorAll('.sidebar nav a')];
  const paths = new Set(['/', ...links.map(link => new URL(link.href).pathname)]);
  const revision = document.documentElement.dataset.standardsRevision;
  const cache = new Map();
  const positions = new Map();
  const key = url => url.pathname + url.search;
  let current = new URL(location.href), entry = history.state?.standardsEntry || crypto.randomUUID();
  let sequence = 0, dispose, hovering;
  const status = document.createElement('p');
  status.className = 'navigation-status';
  status.setAttribute('role', 'status');
  document.body.append(status);
  history.replaceState({...history.state, standardsEntry: entry}, '');
  history.scrollRestoration = 'manual';

  function rememberPosition() {
    positions.set(entry, [scrollX, scrollY]);
  }
  window.addEventListener('scroll', rememberPosition, {passive: true});
  rememberPosition();

  function eligible(link) {
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self') || link.relList.contains('external')) return;
    const url = new URL(link.href);
    if (url.origin === location.origin && paths.has(url.pathname)) return url;
  }

  function readPage(doc) {
    if (!doc.querySelector('body.standards > main#main') || !doc.querySelector('.sidebar nav') ||
        doc.documentElement.dataset.standardsRevision !== revision ||
        doc.querySelector('link[rel="stylesheet"]')?.getAttribute('href') !== document.querySelector('link[rel="stylesheet"]').getAttribute('href')) {
      throw new Error('A full page load is required.');
    }
    return {
      main: doc.querySelector('#main'), overlay: doc.querySelector('.signup-overlay'),
      title: doc.title, canonical: doc.querySelector('link[rel="canonical"]').href,
      description: doc.querySelector('meta[name="description"]').content,
      active: doc.querySelector('.sidebar [aria-current]')?.getAttribute('href')
    };
  }

  function load(url) {
    const id = key(url), existing = cache.get(id);
    if (existing && Date.now() - existing.time < 5 * 60 * 1000) return existing.promise;
    const record = {time: Date.now()};
    record.promise = fetch(id, {signal: AbortSignal.timeout(10000)}).then(async response => {
      if (!response.ok || key(new URL(response.url)) !== id || !response.headers.get('content-type')?.includes('text/html')) {
        throw new Error('Page unavailable.');
      }
      return readPage(new DOMParser().parseFromString(await response.text(), 'text/html'));
    }).catch(error => {
      if (cache.get(id) === record) cache.delete(id);
      throw error;
    });
    cache.delete(id);
    cache.set(id, record);
    // Bound both speculative requests and retained documents in a long-lived tab.
    if (cache.size > 32) cache.delete(cache.keys().next().value);
    return record.promise;
  }
  // Retain a pristine copy before any example interaction changes the initial page.
  cache.set(key(current), {time: Date.now(), promise: Promise.resolve(readPage(document.cloneNode(true)))});
  dispose = mountPage();

  function focusContent(url, position) {
    let target;
    try { target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch (_) {}
    target ||= document.querySelector('#main');
    if (!target.hasAttribute('tabindex') && !target.matches('a[href],button,input,select,textarea')) {
      target.setAttribute('tabindex', '-1');
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), {once: true});
    }
    target.focus({preventScroll: true});
    // Override the shared smooth-scroll rule: history must restore the final position immediately.
    if (position) window.scrollTo({left: position[0], top: position[1], behavior: 'instant'});
    else if (url.hash || matchMedia('(max-width: 760px)').matches) target.scrollIntoView({behavior: 'instant'});
    else window.scrollTo({left: 0, top: 0, behavior: 'instant'});
  }

  async function navigate(url, {pop = false, state} = {}) {
    const token = ++sequence;
    const targetEntry = pop ? state?.standardsEntry || crypto.randomUUID() : crypto.randomUUID();
    const position = pop ? positions.get(targetEntry) : undefined;
    const main = document.querySelector('#main');
    main.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading page…';
    try {
      if (key(url) !== key(current)) {
        const page = await load(url);
        if (token !== sequence) return;
        rememberPosition();
        dispose();
        document.querySelector('.signup-overlay')?.remove();
        main.replaceWith(page.main.cloneNode(true));
        if (page.overlay) document.body.append(page.overlay.cloneNode(true));
        document.title = page.title;
        document.querySelector('link[rel="canonical"]').href = page.canonical;
        document.querySelector('meta[name="description"]').content = page.description;
        for (const link of links) {
          if (link.getAttribute('href') === page.active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        }
        dispose = mountPage();
      } else rememberPosition();
      if (!pop && url.href !== current.href) history.pushState({standardsEntry: targetEntry}, '', url);
      else if (pop) history.replaceState({...state, standardsEntry: targetEntry}, '', url);
      else { // Clicking the current page should not create duplicate history entries.
        focusContent(url);
        return;
      }
      current = url;
      entry = targetEntry;
      focusContent(url, position);
      rememberPosition();
    } catch (_) {
      if (token === sequence) {
        // Includes a new release: never combine old JavaScript with new page markup.
        if (pop) location.replace(url.href);
        else location.assign(url.href);
      }
    } finally {
      if (token === sequence) {
        document.querySelector('#main').removeAttribute('aria-busy');
        status.textContent = document.title;
      }
    }
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = eligible(event.target.closest('a[href]'));
    if (!url) return;
    event.preventDefault();
    void navigate(url);
  });
  window.addEventListener('popstate', event => {
    const url = new URL(location.href);
    if (url.origin !== location.origin || !paths.has(url.pathname)) {location.reload(); return;}
    void navigate(url, {pop: true, state: event.state});
  });
  // Let the browser restore scroll on full-document back/forward (e.g. the gallery demo).
  window.addEventListener('pagehide', () => {history.scrollRestoration = 'auto';});
  window.addEventListener('pageshow', () => {history.scrollRestoration = 'manual';});

  function prefetch(link) {
    const connection = navigator.connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return;
    const url = eligible(link);
    if (url && key(url) !== key(current)) void load(url).catch(() => {});
  }
  document.addEventListener('pointerover', event => {
    if (event.pointerType !== 'mouse') return;
    const link = event.target.closest('a[href]');
    if (!link || link.contains(event.relatedTarget)) return;
    clearTimeout(hovering);
    hovering = setTimeout(() => prefetch(link), 80);
  });
  document.addEventListener('pointerout', event => {
    const link = event.target.closest('a[href]');
    if (link && !link.contains(event.relatedTarget)) clearTimeout(hovering);
  });
  document.addEventListener('focusin', event => prefetch(event.target.closest('a[href]')));
}
