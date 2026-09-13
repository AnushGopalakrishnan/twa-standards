import { parseHTML } from "linkedom";
import { createGallerySections } from "../src/patterns/gallery.js";
import { themeMarkup, examples } from "../site/examples.mjs";

// Render the shared templates once at build time. No component setup runs here.
export function createStaticReferences({ read, css }) {
  const references = {};
  const add = (
    name,
    markup,
    width,
    height,
    { viewport = width, theme = "", styles = "" } = {},
  ) => {
    references[name] = {
      width,
      height,
      viewport,
      theme,
      document: `<!doctype html><html lang="en"${theme ? ` data-theme="${theme}"` : ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${css}"><style>html,body{margin:0;overflow:hidden}body{min-height:100vh}*,*::before,*::after{animation:none!important;transition:none!important}${styles}</style></head><body inert>${markup}</body></html>`,
    };
  };
  const { document } = parseHTML("<html><body></body></html>");
  const previousDocument = globalThis.document,
    previousLocation = globalThis.location;
  let sections, links;
  try {
    globalThis.document = document;
    globalThis.location = new URL(
      "https://standards.tomorrowweare.com/examples/gallery/",
    );
    ({ sections, links } = createGallerySections({
      categories: [
        { id: "editorial", key: "editorial", title: "Editorial" },
        { id: "product", key: "product", title: "Product" },
      ],
      references: [
        "A quiet beginning",
        "Common ground",
        "The next chapter",
        "Field notes",
        "A useful detail",
        "Room to think",
      ].map((title, index) => ({
        id: String(index),
        categoryId: index < 3 ? "editorial" : "product",
        title,
        url: "https://example.com",
        image: {
          url: `/assets/example-${index + 1}.svg`,
          thumbnail: `/assets/example-${index + 1}.svg`,
          medium: `/assets/example-${index + 1}.svg`,
          width: 1440,
          height: 900,
        },
      })),
    }));
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
  }
  // Absolute generated URLs become local assets; no production service is contacted.
  for (const section of sections)
    for (const element of section.querySelectorAll("[src],[srcset],[href]"))
      for (const attr of ["src", "srcset", "href"])
        if (element.hasAttribute(attr))
          element.setAttribute(
            attr,
            element
              .getAttribute(attr)
              .replaceAll("https://standards.tomorrowweare.com", ""),
          );
  const nav = document.createElement("nav");
  nav.className = "category-nav";
  nav.append(links);
  nav.firstElementChild.setAttribute("aria-current", "location");
  const sidebar = `<aside class="sidebar"><div class="sidebar-head"><div class="brand"><h1 class="wordmark">Tomorrow We Are—Standards</h1><p>Gallery demonstration · 6</p></div></div><div class="intro"><p>Six synthetic references for the shared gallery and viewer.</p><div class="newsletter"><p class="newsletter-copy">Try the signup interaction.</p><div class="newsletter-actions"><button class="button button--primary" type="button">Sign up</button></div></div></div>${nav.outerHTML}<footer class="sidebar-foot">${themeMarkup}<p>Synthetic data. No email is sent or saved.</p><p>Captured at 1440 × 900</p></footer></aside>`;
  add("sidebar-desktop", sidebar, 400, 900, { viewport: 1440 });
  add("sidebar-mobile", sidebar, 390, 550);
  const gallery = `<main class="content">${sections[0].outerHTML}</main>`;
  add("grid-desktop", gallery, 1040, 360, {
    viewport: 1440,
    styles: ".content{margin-left:0;width:1040px}",
  });
  add("grid-tablet", gallery, 560, 550, {
    viewport: 900,
    styles: ".content{margin-left:0;width:560px}",
  });
  add("grid-mobile", gallery, 390, 1020);
  add("gallery-card", sections[0].querySelector(".card").outerHTML, 304, 250, {
    viewport: 1440,
    styles: ".card{width:304px}",
  });

  for (const state of ["open", "invalid", "pending", "success", "error"]) {
    const { document: doc } = parseHTML(
      `<html><body>${read("src/patterns/signup.html")}</body></html>`,
    );
    const panel = doc.querySelector(".signup-panel");
    panel.querySelector("h2").textContent = "Try the signup form";
    panel.querySelector("h2+p").textContent =
      "A local demonstration. No email is sent or saved.";
    const input = panel.querySelector("[name=email]");
    if (["pending", "error"].includes(state))
      input.setAttribute("value", "reader@example.com");
    if (state === "invalid") input.setAttribute("aria-invalid", "true");
    if (state === "pending") {
      panel.querySelector(".signup-submit").setAttribute("disabled", "");
      panel.querySelector(".signup-submit").setAttribute("aria-busy", "true");
    }
    panel.querySelector(".signup-status").textContent = {
      open: "",
      invalid: "Enter a valid email address.",
      pending: "Subscribing…",
      success: "Demo complete. No email was saved.",
      error: "Could not subscribe. Try again.",
    }[state];
    add("signup-" + state, panel.outerHTML, 400, state === "open" ? 238 : 271, {
      styles: ".signup-panel{margin:0;box-shadow:none}",
    });
  }
  for (const theme of ["dark", "light"])
    add(
      "theme-" + theme,
      theme === "dark"
        ? themeMarkup
        : themeMarkup
            .replaceAll("light", "dark")
            .replace("Light mode", "Dark mode"),
      140,
      48,
      { theme, styles: "body{padding:14px 12px}.theme-toggle{margin:0}" },
    );
  add("viewer-counter", '<span class="lightbox-count">1 / 3</span>', 72, 40, {
    styles:
      "body{padding:10px}.lightbox-count{margin:0;font-size:14px;color:var(--quiet)}",
  });
  for (const [label, lift] of [
    ["normal", -4],
    ["reduced", 0],
  ])
    add(
      "motion-" + label,
      examples.motion.html.split('<p class="demo-caption">')[0],
      360,
      250,
      {
        styles: `.card{width:360px}.preview{padding:32px}.screen{transform:translateY(${lift}px)}`,
      },
    );
  const { document: viewerDoc } = parseHTML(
    `<html><body>${read("src/patterns/viewer.html")}</body></html>`,
  );
  const viewer = viewerDoc.querySelector(".lightbox");
  viewer.setAttribute("open", "");
  viewer.classList.add("is-peek-ready");
  viewer.querySelector(".lightbox-title").textContent = "A quiet beginning";
  viewer.querySelector(".lightbox-category").textContent = "Editorial";
  viewer.querySelector(".lightbox-count").textContent = "1 / 3";
  viewer
    .querySelector(".lightbox-image")
    .setAttribute("src", "/assets/example-1.svg");
  viewer
    .querySelector(".lightbox-image")
    .setAttribute("alt", "A quiet beginning — synthetic reference");
  viewer
    .querySelectorAll(".lightbox-peek")
    .forEach((image, index) =>
      image.setAttribute("src", `/assets/example-${index ? 3 : 2}.svg`),
    );
  viewer.querySelector(".lightbox-copy").removeAttribute("disabled");
  add("viewer-desktop", sidebar + viewer.outerHTML, 1440, 900);
  add("viewer-mobile", viewer.outerHTML, 390, 900, {
    styles: ".lightbox-stage{min-height:528px}",
  });
  return references;
}
