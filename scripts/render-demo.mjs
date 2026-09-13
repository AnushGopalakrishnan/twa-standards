import { format } from "prettier";
import hljs from "highlight.js/lib/core";
import html from "highlight.js/lib/languages/xml";
import javascript from "highlight.js/lib/languages/javascript";
hljs.registerLanguage("html", html);
hljs.registerLanguage("javascript", javascript);
import { examples } from "../site/examples.mjs";
import { presentations, extraExamples } from "../site/presentation.mjs";
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function createDemoRenderer({ read, references, signup }) {
  const cache = new Map();
  async function codeBlock(label, source, parser) {
    const formatted = await format(source.trim(), {
      parser,
      printWidth: 76,
      tabWidth: 2,
      singleQuote: true,
      htmlWhitespaceSensitivity: "ignore",
    });
    const language = parser === "html" ? "html" : "javascript";
    const highlighted = hljs.highlight(formatted.trim(), { language }).value;
    return `<div class="code-section"><div class="code-label"><span>${label}</span><button class="copy-code" type="button" aria-label="Copy ${label}">Copy code</button><span class="copy-status" aria-live="polite"></span></div><pre tabindex="0" aria-label="${label} example"><code class="hljs language-${language}">${highlighted}</code></pre></div>`;
  }
  async function render(key) {
    const example = extraExamples[key] || examples[key],
      presentation = presentations[key];
    if (!example || !presentation) throw Error("Missing presentation: " + key);
    const pattern = key.endsWith("-preview");
    const panels = [
      await codeBlock(
        presentation.partial ? "HTML structure" : "HTML",
        presentation.markup || example.html,
        "html",
      ),
    ];
    if (presentation.javascript)
      panels.push(
        await codeBlock("JavaScript", presentation.javascript, "babel"),
      );
    if (key === "signup")
      panels.push(await codeBlock("Shared dialog template", signup, "html"));
    const source = example.setup?.toString();
    if (source) {
      panels.push(
        `<details class="demo-source"><summary>Complete demo source</summary><p class="code-explanation">Includes the demonstration controls and synthetic responses. These are separate from the reusable component.</p>${await codeBlock("Demo HTML", `<div data-example="${key}">${example.html}</div>`, "html")}${await codeBlock("Demo JavaScript", (read("site/examples.mjs").match(/^import .+$/gm) || []).filter((line) => source.includes(line.includes("mountSignup") ? "mountSignup" : "mountTheme")).join("\n") + "\n(" + source.replace(/^(async )?setup\(/, (_, async = "") => `${async}function (`) + `)(document.querySelector('[data-example="${key}"]'));`, "babel")}</details>`,
      );
    }
    if (pattern)
      panels.push(
        `<details class="demo-source"><summary>Complete gallery integration</summary><p class="code-explanation">The full application shell combines sidebar, gallery, signup and viewer. Only the relevant structure is shown above.</p>${await codeBlock("Gallery JavaScript", read("site/gallery-demo.js"), "babel")}${await codeBlock("Viewer template", read("src/patterns/viewer.html"), "html")}</details>`,
      );
    const referenceHTML = (presentation.references || "").replace(
      /data-reference="([^"]+)"/g,
      (_, name) => {
        const asset = references[name];
        if (!asset) throw Error("Missing reference image: " + name);
        return `src="${asset.url}" width="${asset.width}" height="${asset.height}" alt="${escape(asset.description)}" data-reference="${name}"`;
      },
    );
    const expandedReferences = referenceHTML.replace(
      /(<img[^>]+data-reference="([^"]+)"[^>]*>)/g,
      (_, tag, name) =>
        tag +
        (references[name].width >= 390
          ? `<a class="reference-fullsize" href="${references[name].url}" target="_blank" rel="noopener noreferrer">View full-size reference</a>`
          : ""),
    );
    const refs = referenceHTML
      ? `<div class="demo-references"><h3>${pattern || key === "signup" ? "Reference views" : "At a glance"}</h3>${pattern || key === "signup" ? '<p class="reference-note">Captured from the shared components in the dark palette. Reference images are static; use the live demo to interact.</p>' : ""}${expandedReferences}</div>`
      : "";
    // The live example owns both its preview and its separate simulation toolbar.
    const live = example.html
      ? `<div class="demo-playground" data-example="${key}"><p class="live-label">${pattern ? "Explore the complete pattern" : "Live example"}</p>${example.html.includes('class="demo-surface"') ? example.html : `<div class="demo-surface">${example.html}</div>`}</div>`
      : "";
    const related = presentation.related
      ? `<p class="related-examples">Related: ${presentation.related.map(([title, url]) => `<a href="${url}">${title}</a>`).join(" · ")}</p>`
      : "";
    return `<section class="demo-block" id="${key}" data-presentation="${key}"><div class="demo-header"><h2>${example.title}</h2><a class="example-permalink" href="#${key}" aria-label="Link to ${example.title}"># Example link</a></div><p class="demo-instruction">${presentation.instruction}</p>${pattern ? refs + live : live + refs}<details class="demo-code"><summary>Show code</summary><p class="code-explanation">${presentation.partial ? "Structure reference; the ellipses represent application-owned content. See the complete integration below." : "Start with the component markup. Demo controls and simulated responses are documented separately."} Include <a href="/installation/">the shared styles</a> in your application.</p>${panels.join("")}</details>${related}</section>`;
  }
  return (key) => {
    if (!cache.has(key)) cache.set(key, render(key));
    return cache.get(key);
  };
}
