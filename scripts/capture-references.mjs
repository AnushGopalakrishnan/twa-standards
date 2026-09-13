// Regenerate website reference assets from the actual shared components after npm run build.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { createServer } from "./serve.mjs";
const server = createServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const manifest = {
  sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  assets: {},
};
fs.mkdirSync("site/references", { recursive: true });
async function capture(name, selector, description) {
  const node = selector ? page.locator(selector) : page;
  const size = selector ? await node.boundingBox() : page.viewportSize();
  const file = name + ".png";
  await node.screenshot({ path: "site/references/" + file });
  manifest.assets[name] = {
    file,
    width: Math.round(size.width),
    height: Math.round(size.height),
    description,
  };
}
async function gallery(width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(origin + "/examples/gallery/");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () =>
      document.querySelectorAll("#gallery .screen").length === 3 &&
      [...document.querySelectorAll("#gallery .screen")].every((e) =>
        e.classList.contains("is-loaded"),
      ),
  );
}
try {
  for (const [width, label] of [
    [1440, "desktop"],
    [900, "tablet"],
    [390, "mobile"],
  ]) {
    await gallery(width);
    await capture(
      "grid-" + label,
      "#gallery > section",
      `${label} gallery layout at ${width}px viewport width`,
    );
    if (label === "desktop")
      await capture(
        "gallery-card",
        "#gallery .card:first-child",
        "A gallery card, screenshot opener, title and Visit link",
      );
    if (label !== "tablet") {
      await capture(
        "sidebar-" + label,
        ".sidebar",
        `${label} sidebar with identity, introduction, navigation and footer`,
      );
      await page.locator("#gallery .preview").first().click();
      await page.waitForFunction(
        () =>
          document.querySelector(".lightbox").open &&
          !document.querySelector(".lightbox").classList.contains("is-opening"),
      );
      await page.waitForTimeout(350);
      await capture(
        "viewer-" + label,
        null,
        `${label} image viewer with the existing navigation, counter and actions`,
      );
      if (label === "desktop")
        await capture(
          "viewer-counter",
          ".lightbox .lightbox-count",
          "Actual-size viewer counter",
        );
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(origin + "/patterns/signup-dialog/");
  await page.waitForFunction(
    () => document.documentElement.dataset.standardsReady === "true",
  );
  await page.locator("[data-signup]").click();
  await page.waitForTimeout(400);
  await capture("signup-open", ".signup-panel", "Open signup dialog");
  await page.locator(".signup-submit").click();
  await capture(
    "signup-invalid",
    ".signup-panel",
    "Signup dialog with an invalid email message",
  );
  await page.locator("#signup-email").fill("reader@example.com");
  await page.locator(".signup-submit").click();
  await capture(
    "signup-pending",
    ".signup-panel",
    "Signup dialog while submitting",
  );
  await page.waitForFunction(
    () =>
      document.querySelector(".signup-overlay .signup-status").textContent ===
      "Demo complete. No email was saved.",
  );
  await capture(
    "signup-success",
    ".signup-panel",
    "Signup dialog after a successful synthetic submission",
  );
  await page.keyboard.press("Escape");
  await page.locator("[data-error]").check();
  await page.locator("[data-signup]").click();
  await page.locator("#signup-email").fill("reader@example.com");
  await page.locator(".signup-submit").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".signup-overlay .signup-status").textContent ===
      "Could not subscribe. Try again.",
  );
  await capture(
    "signup-error",
    ".signup-panel",
    "Signup dialog after a failed synthetic submission",
  );
  for (const theme of ["dark", "light"]) {
    await page.goto(origin + "/components/theme-toggle/");
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem("twa-standards-theme", theme);
      window.dispatchEvent(new CustomEvent("twa:theme"));
    }, theme);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(180);
    await capture(
      "theme-" + theme,
      '[data-example="theme"] button',
      `${theme} theme with a label naming the next available mode`,
    );
  }
  for (const [motion, label] of [
    ["no-preference", "normal"],
    ["reduce", "reduced"],
  ]) {
    await page.emulateMedia({ reducedMotion: motion });
    await page.goto(origin + "/foundations/motion/");
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "dark"),
    );
    await page.locator('[data-example="motion"] .preview').hover();
    await page.waitForTimeout(250);
    await capture(
      "motion-" + label,
      '[data-example="motion"] .card',
      label + " motion screenshot hover reference",
    );
  }
  fs.writeFileSync(
    "site/references/manifest.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(
    "Captured " +
      Object.keys(manifest.assets).length +
      " actual component references.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
