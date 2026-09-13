// Build-only documentation framing. Shared component styles and behavior live in src/.
import { arrow, previous, next, themeMarkup, examples } from "./examples.mjs";
const button = (label = "Subscribe", attrs = "") =>
  `<button class="button button--primary" type="button" ${attrs}>${label}</button>`;
const field = (value = "", attrs = "") =>
  `<input class="signup-field" type="email" placeholder="you@example.com" value="${value}" ${attrs}>`;
const status = (text) => `<p class="signup-status">${text}</p>`;
const specimen = (label, markup, caption = "") =>
  `<figure class="state-reference"><figcaption>${label}</figcaption><div class="reference-content" inert>${markup}</div>${caption ? `<p class="reference-note">${caption}</p>` : ""}</figure>`;
const states = (...items) => `<div class="state-grid">${items.join("")}</div>`;
const image = (name, label, caption = "") =>
  `<figure class="image-reference"><figcaption>${label}</figcaption><img data-reference="${name}" loading="lazy" decoding="async">${caption ? `<p class="reference-note">${caption}</p>` : ""}</figure>`;
const images = (...items) =>
  `<div class="reference-images">${items.join("")}</div>`;
const guide = (items) =>
  `<dl class="anatomy">${items.map(([name, text]) => `<div><dt>${name}</dt><dd>${text}</dd></div>`).join("")}</dl>`;
const patternLink = (from, label) =>
  `<a class="button button--primary demo-launch" href="/examples/gallery/?from=${from}">${label} ${arrow}</a>`;
const placeholder = `<span class="screen has-placeholder" style="--image-placeholder:url('/assets/placeholder.webp')"><img src="/assets/example-1.svg" width="1440" height="900" alt=""></span>`;
const signupSteps = images(
  image("signup-open", "Open", "Focus begins in the email field."),
  image(
    "signup-invalid",
    "Invalid email",
    "The same form with validation feedback.",
  ),
  image(
    "signup-pending",
    "Submitting",
    "The existing disabled action and progress message.",
  ),
  image(
    "signup-success",
    "Success",
    "A synthetic response; no email is saved.",
  ),
  image(
    "signup-error",
    "Failure",
    "The entered address stays available for another attempt.",
  ),
);
export const presentations = {
  button: {
    instruction:
      "Hover or focus the button to inspect its treatment. Clicking shows sample feedback; the complete form is on the Signup dialog page.",
    references: states(
      specimen("Default", button("Sign up")),
      specimen(
        "Hover",
        `<div class="reference-hover">${button("Sign up")}</div>`,
        "Existing accent treatment.",
      ),
      specimen(
        "Keyboard focus",
        `<div class="reference-focus">${button("Sign up")}</div>`,
        "Use Tab in the live example to inspect focus.",
      ),
    ),
    markup:
      '<button class="button button--primary" type="button">Sign up</button>',
    related: [["Signup dialog", "/patterns/signup-dialog/"]],
  },
  "button-states": {
    instruction:
      "Compare the named states, then use Demo controls to place the live button in its loading state.",
    references: states(
      specimen("Default", button()),
      specimen(
        "Disabled",
        button("Subscribe", "disabled"),
        "Unavailable action.",
      ),
      specimen(
        "Loading",
        button("Subscribe", 'disabled aria-busy="true"') +
          status("Subscribing…"),
        "The message supplies progress context.",
      ),
    ),
    markup:
      button("Subscribe", "disabled") +
      "\n" +
      button("Subscribe", 'disabled aria-busy="true"') +
      '\n<p class="signup-status" role="status">Subscribing…</p>',
  },
  "text-actions": {
    instruction:
      "The navigation link opens Foundations. Copy text copies “Tomorrow We Are” and displays its result underneath.",
    references:
      states(
        specimen(
          "Navigation link",
          `<a class="text-action" href="/foundations/">View foundations ${arrow}</a>`,
          "A destination, rendered as a link.",
        ),
        specimen(
          "In-place action",
          '<button class="text-action" type="button">Copy text</button>',
          "An operation, rendered as a button.",
        ),
      ) +
      guide([
        [
          "Viewer context",
          "Copy image, Download and View live share a quiet action row.",
        ],
        ["Sample content", "Tomorrow We Are"],
      ]),
    markup: `<a class="text-action" href="/foundations/">View foundations ${arrow}</a>\n<button class="text-action" type="button">Copy text</button>`,
    related: [["Viewer action row", "/patterns/image-viewer/"]],
  },
  icons: {
    instruction:
      "Use Previous and Next to move through the three sample positions. The annotations describe the existing controls.",
    references:
      states(
        specimen(
          "Previous",
          `<button class="icon-control" aria-label="Previous example">${previous}</button>`,
          "28px target · 16px icon",
        ),
        specimen(
          "Next",
          `<button class="icon-control" aria-label="Next example">${next}</button>`,
          "28px target · 16px icon",
        ),
      ) +
      guide([
        [
          "Sequence context",
          "These controls appear above the screenshot in the viewer.",
        ],
        [
          "Accessible name",
          "Describe the action or neighboring item, not the shape of the arrow.",
        ],
      ]),
    markup: `<button class="icon-control" type="button" aria-label="Previous example">${previous}</button>\n<button class="icon-control" type="button" aria-label="Next example">${next}</button>`,
    related: [["Image viewer", "/patterns/image-viewer/"]],
  },
  email: {
    instruction:
      "Try “reader” to see validation feedback, then “reader@example.com” for an accepted format. The demo does not subscribe or send email.",
    references:
      states(
        specimen("Default", field(), "Empty field with an example address."),
        specimen(
          "Focused",
          `<div class="reference-focus">${field()}</div>`,
          "Existing focus border.",
        ),
        specimen(
          "Invalid",
          field("reader", 'aria-invalid="true"') +
            status("Enter a valid email address."),
          "The invalid value remains visible.",
        ),
        specimen(
          "Valid format",
          field("reader@example.com") + status("Email format accepted."),
          "Format acceptance is not delivery verification.",
        ),
      ) +
      guide([
        ["Label", "Identifies what the field collects."],
        ["Help text", "Explains the context before submission."],
        ["Feedback", "Appears beneath the action and relates to this field."],
      ]),
    markup:
      '<label for="email">Email address</label>\n<input class="signup-field" id="email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" aria-describedby="email-help" required>\n<p id="email-help">Used only in this demonstration.</p>',
    related: [["Signup dialog", "/patterns/signup-dialog/"]],
  },
  theme: {
    instruction:
      "This live example changes the entire documentation site and saves your preference. Its label always names the mode you can switch to.",
    references: images(
      image("theme-dark", "Current theme: Dark", "Action label: Light mode"),
      image("theme-light", "Current theme: Light", "Action label: Dark mode"),
    ),
    markup: themeMarkup,
    javascript:
      "import { mountTheme } from 'twa-standards';\nmountTheme(document.querySelector('.theme-toggle'), { storageKey: 'your-project-theme' });",
  },
  navigation: {
    instruction:
      "Select a sample item to change its highlight. This comparison changes only its sample selection; it does not navigate the documentation.",
    references: states(
      specimen(
        "With counts",
        '<nav class="category-nav"><a href="#" aria-current="location"><span>Hero</span><span>12</span></a><a href="#"><span>Call to action</span><span>6</span></a></nav>',
        "Current item: Hero · counts are references in each category.",
      ),
      specimen(
        "Without counts",
        '<nav class="category-nav"><a href="#" aria-current="location">Foundations</a><a href="#">Components</a></nav>',
        "Optional counts can be omitted.",
      ),
    ),
    markup:
      '<nav class="category-nav" aria-label="Categories">\n<a href="?category=hero" aria-current="location"><span>Hero</span><span>12</span></a>\n<a href="?category=cta"><span>Call to action</span><span>6</span></a>\n</nav>',
    related: [["Sidebar and footer", "/patterns/sidebar-footer/"]],
  },
  counter: {
    instruction:
      "Choose Next reference to advance the sample position. This 24px inspection view is enlarged; the actual-size viewer reference is shown below.",
    references:
      images(
        image(
          "viewer-counter",
          "Actual-size viewer counter",
          "Captured from the viewer at its native 14px size.",
        ),
      ) +
      guide([
        [
          "Position",
          "The first value is the current screenshot; the second is the category total.",
        ],
        [
          "Placement",
          "The counter sits beneath the screenshot title in the viewer’s information rail.",
        ],
      ]),
    markup:
      '<span class="lightbox-count" aria-live="polite" aria-atomic="true"></span>',
    javascript:
      "import { updateCounter } from 'twa-standards/counter';\nupdateCounter(document.querySelector('.lightbox-count'), 1, 12, { animated: false });",
    related: [
      ["Counter in the viewer", "/patterns/image-viewer/"],
      ["Motion reference", "/foundations/motion/"],
    ],
  },
  divider: {
    instruction:
      "The rule separates two related content groups. This preview supplies a content column so the existing divider spans a visible width.",
    references: states(
      specimen(
        "Thematic break",
        '<div class="reference-column"><p>Collection details</p><hr class="divider"><p>Related actions</p></div>',
        "Use an hr for a change of topic.",
      ),
      specimen(
        "Decorative edge",
        '<div class="reference-edge">Screenshot actions</div>',
        "Use a border on the container for a visual boundary.",
      ),
    ),
    markup:
      '<p>Collection details</p>\n<hr class="divider">\n<p>Related actions</p>',
  },
  status: {
    instruction:
      "Compare all three messages, then choose a simulated response to inspect the live status region. The selector belongs to this demonstration.",
    references:
      states(
        specimen(
          "Loading",
          status("Subscribing…"),
          "Progress during an action.",
        ),
        specimen(
          "Success",
          status("You’re subscribed."),
          "Confirmation of the result.",
        ),
        specimen(
          "Error",
          status("Could not subscribe. Try again."),
          "A specific failure with a next step.",
        ),
      ) +
      specimen(
        "Within a form",
        field("reader@example.com") +
          button() +
          status("Could not subscribe. Try again."),
        "The message stays near the related field and action.",
      ),
    markup:
      '<p class="signup-status" role="status" aria-live="polite">Subscribing…</p>',
    related: [["Signup states", "/patterns/signup-dialog/"]],
  },
  signup: {
    instruction:
      "Choose the simulated outcome in Demo controls, then open the form. Try an empty submission for validation, or “reader@example.com” for the chosen outcome. Escape closes the demo.",
    references: signupSteps,
    markup: button("Sign up", "data-signup"),
    javascript:
      "import { mountSignup } from 'twa-standards/patterns/signup.js';\nmountSignup({ trigger: document.querySelector('[data-signup]'), submit: async ({ email }) => {\n  // Supply your application’s submission callback.\n  return 'You’re subscribed.';\n} });",
    related: [
      ["Email input", "/components/email-input/"],
      ["Status messages", "/components/status-messages/"],
    ],
  },
  placeholder: {
    instruction:
      "Compare the same image before and after decode, then use the live reveal. This is a manual illustration, not a measurement of network speed.",
    references: states(
      specimen(
        "Placeholder",
        `<div class="reference-placeholder">${placeholder}</div>`,
        "Tiny preview while the sharper image is unavailable.",
      ),
      specimen(
        "Decoded image",
        `<div class="reference-placeholder">${placeholder.replace("has-placeholder", "has-placeholder is-loaded")}</div>`,
        "Same image and dimensions after decode.",
      ),
    ),
    markup: placeholder,
    related: [["Efficient loading", "/foundations/efficient-loading/"]],
  },
  retry: {
    instruction:
      "Compare the three stages, then choose an outcome and retry the sample. Starting state and Simulated result are labelled separately so the response cannot be mistaken for the original error.",
    references: states(
      specimen(
        "1 · Error",
        '<p>The collection couldn’t load. Please try again.</p><button class="text-action">Retry</button>',
        "A recoverable failure.",
      ),
      specimen(
        "2 · Retrying",
        status("Loading collection…"),
        "The retry is in progress.",
      ),
      specimen(
        "3 · Recovered",
        status("Collection loaded. Six references available."),
        "Successful synthetic result.",
      ),
    ),
    markup:
      '<p>The collection couldn’t load. Please try again.</p>\n<button class="text-action" type="button">Retry</button>\n<p class="signup-status" role="status" aria-live="polite"></p>',
  },
  motion: {
    instruction:
      "Hover the screenshot to inspect the existing 4px lift. Each timing below links to its live example; normal and reduced-motion references explain what to observe.",
    references:
      images(
        image(
          "motion-normal",
          "Normal motion",
          "The screenshot lifts 4px within its well.",
        ),
        image(
          "motion-reduced",
          "Reduced motion",
          "The screenshot stays in its original position.",
        ),
      ) +
      states(
        specimen(
          "Normal motion",
          "<p>Control color · 120ms</p><p>Screenshot lift · 180ms</p><p>Counter · 220ms</p><p>Viewer handoff · 280ms</p>",
          "Transitions retain the relationship between the starting and ending states.",
        ),
        specimen(
          "Reduced motion",
          "<p>Control color changes directly.</p><p>Screenshot stays in place.</p><p>Counter updates without animation.</p><p>Viewer changes without the animated handoff.</p>",
          "The same controls and results, with reduced animation.",
        ),
      ),
    markup: examples.motion.html,
    related: [
      ["Control color", "/components/buttons/#button"],
      ["Counter animation", "/components/counters/#counter"],
      ["Viewer handoff", "/patterns/image-viewer/"],
    ],
  },
  "icon-inventory": {
    instruction:
      "Inspect the symbols at their actual rendered size. Enlarged details are labelled separately; the interactive directional controls have their own page.",
    references: states(
      ...[
        ["Previous", previous],
        ["Next", next],
        ["Outward link", arrow],
        ["Theme", "◐"],
        ["Close", "×"],
      ].map(([label, icon]) =>
        specimen(
          label,
          `<div class="icon-specimen"><span>${icon}</span><span class="icon-enlarged">${icon}</span></div>`,
          "Left: actual size · right: 3× inspection view.",
        ),
      ),
    ),
    markup: arrow,
    related: [["Interactive icon controls", "/components/icon-controls/"]],
  },
  "border-inventory": {
    instruction:
      "Compare the existing border treatments in context. These are reference specimens; the Dividers page covers separation between content groups.",
    references: states(
      specimen(
        "Button edge",
        button("Sign up"),
        "Square corners · filled surface · no border.",
      ),
      specimen("Input border", field(), "1px --hairline · square corners."),
      specimen(
        "Panel boundary",
        '<div class="reference-edge reference-panel">Panel content</div>',
        "1px --hairline around the container.",
      ),
      specimen(
        "Divider",
        '<div class="reference-column"><p>Collection details</p><hr class="divider"><p>Related actions</p></div>',
        "1px --hairline between groups.",
      ),
    ),
    markup:
      '<input class="signup-field" type="email" placeholder="you@example.com">\n<hr class="divider">',
    related: [["Dividers", "/components/dividers/"]],
  },
  "sidebar-preview": {
    instruction:
      "Compare the desktop and mobile arrangements. The live example lets you explore the same sidebar with categories, theme switching, and signup.",
    references:
      images(
        image(
          "sidebar-desktop",
          "Desktop · 1440px viewport",
          "A fixed sidebar; the footer settles at the bottom.",
        ),
        image(
          "sidebar-mobile",
          "Mobile · 390px viewport",
          "The same content flows above the gallery.",
        ),
      ) +
      guide([
        ["Identity", "Project name and collection summary."],
        ["Context", "Introduction and the related signup action."],
        ["Navigation", "Category labels and counts."],
        ["Footer", "Theme control and provenance."],
      ]),
    markup:
      '<aside class="sidebar">\n<div class="sidebar-head">…</div>\n<div class="intro">…</div>\n<nav class="category-nav" aria-label="Categories">…</nav>\n<footer class="sidebar-foot">…</footer>\n</aside>',
    partial: true,
  },
  "gallery-preview": {
    instruction:
      "Inspect one card, then compare the existing one-, two-, and three-column layouts. Open the live gallery to explore categories and screenshots.",
    references:
      images(
        image(
          "gallery-card",
          "Card anatomy",
          "The screenshot opens the viewer; the title and Visit link open the original site.",
        ),
      ) +
      guide([
        ["Screenshot opener", "The image well is the entry into the viewer."],
        ["Title", "Index and reference name identify the item."],
        ["Visit link", "A separate destination from the screenshot opener."],
      ]) +
      images(
        image("grid-mobile", "One column · 390px viewport"),
        image("grid-tablet", "Two columns · 900px viewport"),
        image("grid-desktop", "Three columns · 1440px viewport"),
      ),
    markup: '<main class="content" id="gallery"></main>',
    javascript:
      "import { createGallerySections, mountGallery } from 'twa-standards/patterns';\nconst { sections, links } = createGallerySections(data);\ndocument.querySelector('#gallery').replaceChildren(sections[0]);\ndocument.querySelector('.category-nav').replaceChildren(links);\nmountGallery(sections);",
    partial: true,
  },
  "viewer-preview": {
    instruction:
      "Open the viewer demonstration, then select a screenshot. Use the arrows to browse and Escape to close. The reference views identify the controls before you enter the full demo.",
    references:
      images(
        image(
          "viewer-desktop",
          "Desktop viewer",
          "The visible sidebar remains beside the screenshot and information rail.",
        ),
        image(
          "viewer-mobile",
          "Mobile viewer",
          "The information rail moves below the screenshot.",
        ),
      ) +
      guide([
        [
          "Navigation",
          "Previous and next controls above the image. Arrow keys also browse.",
        ],
        [
          "Metadata",
          "Category, title and position identify the current screenshot.",
        ],
        [
          "Actions",
          "Copy image, Download and View live belong to the current reference.",
        ],
        [
          "Close",
          "Close or Escape returns to the gallery. Home and End select sequence boundaries.",
        ],
      ]),
    markup:
      "<!-- Include twa-standards/patterns/viewer.html once, outside main. -->",
    javascript:
      "import { mountGallery } from 'twa-standards/patterns';\nmountGallery(sections);",
    partial: true,
  },
};
export const extraExamples = {
  "icon-inventory": { title: "Existing symbols", html: "", static: true },
  "border-inventory": { title: "Edges and boundaries", html: "", static: true },
  "sidebar-preview": {
    title: "Sidebar anatomy",
    html: patternLink("sidebar-footer", "Explore the sidebar"),
    static: false,
  },
  "gallery-preview": {
    title: "Cards and responsive grid",
    html: patternLink("gallery", "Open gallery demo"),
    static: false,
  },
  "viewer-preview": {
    title: "Viewer anatomy",
    html: patternLink("image-viewer", "Open viewer demo"),
    static: false,
  },
};
