import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { pages, route } from "../site/pages.mjs";
import { createServer } from "../scripts/serve.mjs";

const server = createServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const ready = () =>
    page.waitForFunction(
      () => document.documentElement.dataset.standardsReady === "true",
    );
  const interactive = pages.filter((page) => page.examples?.length);
  assert.equal(interactive.length, 18);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const doc of interactive) {
      await page.goto(origin + route(doc));
      await ready();
      await page.evaluate(
        () => (document.documentElement.dataset.theme = "light"),
      );
      if (width === 390) {
        assert.equal(
          await page.locator(".docs-menu-toggle").getAttribute("aria-expanded"),
          "false",
        );
        assert(!(await page.locator("#docs-menu").isVisible()));
        const first = await page
          .locator(".demo-surface,.demo-references")
          .first()
          .boundingBox();
        assert(first.y < 760, `First preview is buried on ${route(doc)}`);
      }
      await page
        .locator(".demo-code")
        .first()
        .locator("summary")
        .first()
        .click();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Open code overflows ${route(doc)} at ${width}`,
      );
      for (const asset of await page
        .locator("img[data-reference]")
        .evaluateAll((images) =>
          images.map((img) => ({
            src: img.getAttribute("src"),
            width: img.width,
            height: img.height,
            loading: img.loading,
            alt: img.alt,
          })),
        )) {
        assert.equal(asset.loading, "lazy");
        assert(asset.width > 0 && asset.height > 0 && asset.alt);
        assert(fs.existsSync("dist" + asset.src));
      }
    }
  }
  await page.goto(origin + "/components/buttons/");
  await ready();
  await page.locator(".docs-menu-toggle").click();
  assert(await page.locator("#docs-menu").isVisible());
  await page.keyboard.press("Escape");
  assert(!(await page.locator("#docs-menu").isVisible()));
  await page.locator(".docs-menu-toggle").click();
  await page.locator('.sidebar a[href="/components/dividers/"]').click();
  await page.waitForURL("**/components/dividers/");
  await ready();
  assert.equal(
    await page.locator(".docs-menu-toggle").getAttribute("aria-expanded"),
    "false",
  );
  assert(
    (await page.locator('[data-example="divider"] hr').boundingBox()).width >
      200,
    "Divider needs a real content width",
  );
  await page.locator(".demo-code > summary").click();
  const code = page.locator(".code-section").first();
  await code.locator(".copy-code").click();
  await page.waitForFunction(
    () => document.querySelector(".copy-status").textContent === "Copied.",
  );
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    await code.locator("code").textContent(),
  );
  await page.goto(origin + "/patterns/retry-states/");
  await ready();
  await page.locator("[data-error]").uncheck();
  await page.locator('[data-example="retry"] button').click();
  await page.waitForFunction(
    () =>
      document.querySelector('.demo-result [role="status"]').textContent ===
      "Collection loaded. Six references available.",
  );
  assert.equal(
    await page.locator("[data-result] h3").textContent(),
    "Starting state",
  );
  assert.equal(
    await page.locator(".demo-result h3").textContent(),
    "Simulated result",
  );
  for (const slug of ["sidebar-footer", "gallery", "image-viewer"]) {
    await page.goto(origin + `/patterns/${slug}/`);
    await ready();
    await page.locator(".demo-launch").click();
    await page.waitForSelector("#gallery .card");
    assert.equal(
      await page.locator("[data-demo-return]").getAttribute("href"),
      `/patterns/${slug}/`,
    );
    await page.locator("[data-demo-return]").click();
    await ready();
    assert.equal(new URL(page.url()).pathname, `/patterns/${slug}/`);
  }
  const client = fs.readFileSync(
    "dist" + (await page.locator("script[src]").getAttribute("src")),
    "utf8",
  );
  assert(
    client.length < 12000,
    "Reference content stays out of runtime JavaScript",
  );
  assert(!client.includes("Reference views"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all 18 presentation pages, mobile menu/focus, first-preview placement, expanded code overflow, copy code, lazy reference assets, visible divider, retry framing and contextual demo returns.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
