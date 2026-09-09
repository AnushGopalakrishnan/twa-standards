/** Render the existing gallery data shape without fetching or publishing anything. */
export function createGallerySections(data, {endpoint = location.href} = {}) {
  const node = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; };
  const url = value => { const parsed = new URL(value, endpoint); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid URL'); return parsed.href; };
  const displayURL = value => { const parsed = new URL(url(value)); parsed.searchParams.set('cors', '1'); return parsed.href; };
    const sections = [], links = document.createDocumentFragment();
    const ids = new Set();
    const referenceIDs = new Set();
    for (const row of data.references) {
      if (typeof row.id !== 'string' || referenceIDs.has(row.id) || !data.categories.some(c => c.id === row.categoryId)) throw new Error('Invalid reference identity');
      referenceIDs.add(row.id);
    }
    for (const category of data.categories) {
      if (typeof category.key !== 'string' || !/^[a-z][a-z0-9-]*$/.test(category.key) || ids.has(category.key)) throw new Error('Invalid category');
      ids.add(category.key);
      const rows = data.references.filter(row => row.categoryId === category.id);
      if (!rows.length) continue;
      const section = node('section'); section.id = category.key;
      const heading = node('div', 'section-head'); heading.append(node('h2', '', category.title));
      const total = node('div'); total.append(node('span', '', rows.length + ' references')); heading.append(total); section.append(heading);
      const grid = node('div', 'grid');
      rows.forEach((row, index) => {
        if (!row.image || typeof row.title !== 'string' || new URL(row.url).protocol !== 'https:') throw new Error('Incomplete reference');
        const original = url(row.image.url), thumb = displayURL(row.image.thumbnail), medium = displayURL(row.image.medium);
        const card = node('article', 'card'); card.dataset.referenceId = row.id;
        const preview = node('a', 'preview'); preview.href = original;
        preview.dataset.viewerSrc = displayURL(row.image.viewer || row.image.url);
        Object.assign(preview.dataset, { site: row.title, category: category.title, liveUrl: row.url });
        preview.setAttribute('aria-label', `View the ${row.title} screenshot in the lightbox`); preview.setAttribute('aria-haspopup', 'dialog');
        const screen = node('span', 'screen'), image = node('img');
        if (typeof row.image.placeholder === 'string' && row.image.placeholder.length <= 4096 && /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(row.image.placeholder)) {
          preview.dataset.placeholder = row.image.placeholder;
          screen.classList.add('has-placeholder');
          screen.style.setProperty('--image-placeholder', `url("${row.image.placeholder}")`);
          image.onload = async () => {
            try { await image.decode(); screen.classList.add('is-loaded'); } catch (_) { /* Retain the preview on decode failure. */ }
          };
        }
        image.width = row.image.width || 1440; image.height = row.image.height || 900; image.loading = category === data.categories[0] && index === 0 ? 'eager' : 'lazy';
        if (image.loading === 'eager') image.fetchPriority = 'high'; image.decoding = 'async'; image.crossOrigin = 'anonymous'; image.src = medium;
        image.srcset = `${thumb} 480w, ${medium} 960w, ${preview.dataset.viewerSrc} ${row.image.width || 1440}w`;
        image.sizes = '(max-width: 560px) calc(100vw - 4.5rem), (max-width: 849px) calc((100vw - 8.5rem) / 2), (max-width: 1249px) calc((100vw - 30.75rem) / 2), calc((100vw - 45rem) / 3)';
        image.alt = `${row.title} ${category.title} screenshot`; screen.append(image); preview.append(screen);
        const link = node('a', 'card-row'); link.href = row.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        const title = node('h3'); title.title = row.title; title.append(node('span', 'reference-index', String(index + 1).padStart(2, '0') + ' ·'), document.createTextNode(' ' + row.title));
        const visit = node('span', 'visit');
        visit.innerHTML = 'Visit <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg>';
        link.append(title, visit); card.append(preview, link); grid.append(card);
      });
      section.append(grid); sections.push(section);
      const categoryURL = new URL(location.href); categoryURL.searchParams.set('category', category.key); categoryURL.hash = '';
      const link = node('a'); link.href = categoryURL.pathname + categoryURL.search; link.dataset.category = category.key; link.append(node('span', '', category.title.replace(/\s+Sections$/i, '')), node('span', '', String(rows.length))); links.append(link);
    }
    return {sections, links};
}
