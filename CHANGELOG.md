# Changelog

## 1.1.1 — 2026-09-09

- Add the optional `fonts.css` entry for licensed Neue Montreal Medium (500), served as an immutable WOFF2 asset.
- Preload the font in documentation and gallery pages; retain readable fallback text during loading or failure.
- Update typography guidance and verify that browsers render the downloaded webfont.

## 1.1.0 — 2026-09-09

- Keep the documentation sidebar mounted while navigating; update content, metadata and browser history together.
- Prefetch on hover/focus, reuse fetched pages, restore scroll and focus, and fall back to normal navigation on failures or a new deployment.
- Publish content-hashed CSS/JavaScript with immutable caching while retaining fresh HTML and `no-transform`.
- Add optional signup `dispose()` cleanup for page transitions, including pending host callbacks and submissions. Existing consumers retain the same open/close behavior.
- Verify navigation races, repeated example mounting, mobile behavior, native links and no-JavaScript access.

## 1.0.2 — 2026-09-09

- Keep Escape and Tab working when a pending signup submission causes focus to leave the disabled submit button.
- Verify dismissal during submission cannot overwrite the next form session.

## 1.0.1 — 2026-09-09

- Bind signup and theme demos synchronously and retain counter clicks during optional module loading.
- Prevent automatic Cloudflare HTML transformations, including injected analytics scripts.
- Shared Specimen UI behavior is unchanged.

## 1.0.0 — 2026-09-09

- Extract Specimen's existing dark/light foundations, controls and optional gallery/viewer patterns into an installable package.
- Share signup markup and behavior through a service callback. Add a keyboard focus trap, background inert preservation, invalid-field state and stale-response protection.
- Preserve category URLs, theme preference, responsive gallery geometry, progressive image handoff and viewer interactions.
- Add 27 documentation pages with generated code snippets and synthetic local demonstrations.
- Add independent Cloudflare Static Assets deployment with main-only checks and revision receipts.
