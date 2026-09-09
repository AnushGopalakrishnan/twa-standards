# Tomorrow We Are—Standards

A public working reference and installable HTML/CSS/vanilla JavaScript package. The site and [Specimen](https://specimen.tomorrowweare.com) share the same source. Live reference: https://standards.tomorrowweare.com.

## Development

Requires Node.js 22.12+ and npm. CI uses Node.js 24.

```sh
npm ci
npx playwright install chromium
npm run dev
```

The loopback preview at port 3005 expires after one hour. `npm run build` generates the documentation and synthetic gallery into ignored `dist/`. `npm test` checks all documentation pages at desktop/mobile sizes, examples, focus restoration, reduced motion and the absence of unexpected external requests. The only permitted external asset is the licensed webfont. Navigation checks cover partial page updates, history, scroll, focus, prefetching, cleanup and full-page fallbacks. `npm run test:deploy` verifies the production guard.

Edit `site/pages.mjs` for documentation, `site/examples.mjs` for working examples, and `site/site.css` for documentation layout. The typography font is explicitly downloaded even when a matching local face is installed. Displayed snippets are generated from the same HTML and setup functions used by each example. Pattern pages also include their shared templates and full demo source. The gallery uses six synthetic local SVGs; signup callbacks simulate responses without sending or retaining email addresses. `_headers` limits network requests, prevents native form submission, and opts out of Cloudflare HTML transformations (including automatic analytics injection).

## Documentation navigation

Documentation links keep the sidebar mounted and replace only the main content and page-specific dialog. URLs, titles, canonical metadata and the active link update together. New pages receive keyboard focus; mobile navigation scrolls past the sidebar to the content. Back/forward restores each history entry's scroll position. Page examples start fresh on a return visit and release their global listeners when leaving.

Hovering a link for 80 ms, focusing it, or pressing it warms its HTML. After loading, the two adjacent pages are fetched at low priority while you read. Save-Data and 2G connections disable speculation. Up to 32 pages are reused for five minutes in the current tab; requests for the same page share a promise. Rapid navigation uses only the most recent destination. Failed requests, incompatible markup and different deployment revisions fall back to a normal document load. The standalone gallery demonstration uses normal navigation because it owns a separate application shell and history.

Every route still serves complete HTML and works without JavaScript. CSS is minified, and static JavaScript dependencies are module-preloaded to avoid a serial request waterfall. Optional counter code remains on demand. Content-hashed CSS and JavaScript are cached for one year as immutable assets. HTML and unversioned assets revalidate; all responses retain `no-transform` to prevent injected analytics. The navigation module is site-only and is not part of the installable package.

## Install a release

Find a tagged release's full commit SHA, then pin it explicitly:

```sh
gh api repos/AnushGopalakrishnan/twa-standards/git/ref/tags/v1.0.0 --jq .object.sha
npm install --save-exact github:AnushGopalakrishnan/twa-standards#FULL_COMMIT_SHA
```

The release includes an npm tarball and receipt. The website's installation page shows the exact SHA used to build that deployment. Commit your dependency lockfile. Bundle the package at build time rather than loading it from a runtime CDN.

```js
import 'twa-standards/fonts.css';
import 'twa-standards/foundations.css';
import 'twa-standards/components.css';
import {mountTheme} from 'twa-standards';
mountTheme(document.querySelector('.theme-toggle'), {storageKey: 'your-project-theme'});
```

Import CSS in that order. Import `twa-standards/fonts.css` to load the website’s licensed Neue Montreal Medium (500) WOFF2 from `content.tomorrowweare.com/standards/fonts/`. Standards and Specimen preload this immutable asset; the font stack remains PP Neue Montreal, Neue Montreal, Arial, sans-serif. `font-display: swap` keeps text readable during loading or failure. The font binary is hosted separately from the public source package. The CSS intentionally preserves Specimen's existing cascade and global document defaults. Scope or override it deliberately in projects with a different identity.

## Optional patterns

```js
import 'twa-standards/patterns/specimen.css';
import {createGallerySections, mountGallery, mountSignup} from 'twa-standards/patterns';
```

- `createGallerySections({categories, references}, {endpoint})` returns `{sections, links}` as DOM. Categories have `{id, key, title}`; references have `{id, categoryId, title, url, image:{url, thumbnail, medium, viewer?, placeholder?, width?, height?}}`. URLs are resolved relative to `endpoint`, defaulting to the current location. Display images use the existing `cors=1` cache key. The renderer validates identity, category keys and URL protocols; it never fetches CMS data or modifies page metadata.
- Mount the initial selected section into `#gallery` and the navigation fragment into `.category-nav`, then call `mountGallery(sections)` once per document. The host shell needs `.sidebar`, `.content`, `.skip`, `.category-nav`, and the shared viewer template. It returns `{close}` for handoffs such as opening signup. The pattern owns category query/history, image intent loading, the non-modal viewer, neighbors, copy/download, focus and responsive inert behavior. It is a complete document pattern, not an arbitrarily repeatable widget.
- Include `twa-standards/patterns/viewer.html` at build time.
- Include `twa-standards/patterns/signup.html` once outside the main content. Replace `__SIGNUP_TITLE__` and `__SIGNUP_DESCRIPTION__` with escaped application copy. `mountSignup({trigger, overlay?, submit, beforeOpen?})` calls `submit({email, website})`; return a status string or reject with an Error. The host owns service calls and subscriber count updates. `beforeOpen` can await viewer closing. It returns `{open, close, dispose}`. Call `dispose()` before removing the pattern: it dismisses without restoring focus, removes listeners and invalidates pending opens/submissions. Covered sibling elements retain their prior inert state on close; stale responses after dismissal cannot overwrite a reopened form.
- `twa-standards/counter` exports `updateCounter(element, value, total, {trend?, animated?})` and imports NumberFlow. The full gallery imports it automatically. Simple controls do not load this optional dependency.

See `site/gallery-demo.js` for a complete application shell. Never connect demonstrations to production content, newsletter or carbon services.

## Release and deployment

Production is an independent Cloudflare Static Assets deployment with the `standards.tomorrowweare.com` custom domain. There are no storage bindings. [Cloudflare configuration reference](https://developers.cloudflare.com/workers/static-assets/binding/).

PRs run build and browser checks. Main deploys only after checks pass. Add a dedicated Cloudflare Workers token as the repository Actions secret `CLOUDFLARE_API_TOKEN`; the account ID is public in the workflow. Do not use Wrangler's temporary local OAuth token as a CI secret.

`npm run deploy` fetches main, requires a clean checkout at exactly `origin/main`, then invokes Wrangler. `npm run deploy -- --check` verifies without uploading. Feature branches do not deploy to production. Preserve release SHA, tag, tarball checksum and Cloudflare version in a release receipt. `/release.json` exposes the deployed version and SHA.

For v1, publish the tagged package before merging Specimen's adoption. Consumers keep their previous pin and lockfile for rollback. Roll back website code through a reviewed main revert and redeploy; never reset application data. Disposable browser screenshots are under ignored `.context/qa/` and should be removed after review. Preserve release receipts separately.

## Design references

[Geist Button](https://vercel.com/geist/button) informed working examples and state comparisons. [Primer documentation guidance](https://primer.style/product/contribute/documentation/) informed purpose, usage, behavior and accessibility sections. Specimen supplies the visual language and supported interface scope.
