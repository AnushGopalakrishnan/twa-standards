# Standards handoff

Read README.md before changes. Keep the HTML/CSS/vanilla JS architecture. Use CLI and APIs; CLI-driven Playwright tests are authorized. Computer-use automation requires user approval.

Package source lives in `src/`, the working reference in `site/`. CSS is imported as foundations, components, then optional patterns. Preserve the order of repeated selectors inside each entry; these carry Specimen's original cascade. Core controls and navigation work without pattern CSS. Gallery/viewer mounting is once per document with the host shell documented in README.

The package has no CMS, newsletter or carbon service configuration. Gallery data and signup callbacks belong to consuming applications. All documentation examples use synthetic data and same-origin assets. Do not make real test signups or change editorial content.

Run the site suite and relevant consuming-app regression checks before releasing shared behavior. Validate Specimen appearance across mobile/tablet/desktop and both themes. The initial extraction was pixel-identical in 18 controlled comparisons covering gallery, signup and viewer.

Deploy only the clean origin/main revision, after checks. Release a tagged package before merging a consuming app's new exact commit pin. Preserve tags, release receipts and rollback pins. Keep generated previews, screenshots and scratch scripts out of Git and remove them after verification; keep recovery information separately.
