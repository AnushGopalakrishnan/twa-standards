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
      for (const snippet of await page
        .locator(".demo-code pre code")
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            text: node.textContent,
            tokens: node.querySelectorAll('span[class^="hljs-"]').length,
            language: node.className,
          })),
        )) {
        assert.equal(
          snippet.text,
          snippet.text.trim(),
          "Code must not start or end with blank lines",
        );
        assert(
          snippet.tokens > 0,
          "Code must have build-time syntax highlighting",
        );
        assert(/language-(html|javascript)/.test(snippet.language));
      }
      assert.equal(
        await page
          .locator(".demo-code pre code")
          .first()
          .evaluate((node) => getComputedStyle(node).padding),
        "0px",
        "Syntax theme must not add another layer of empty space",
      );
      assert(
        await page
          .locator(".demo-code pre")
          .first()
          .evaluate(
            (node) =>
              parseFloat(getComputedStyle(node).paddingTop) <
              parseFloat(getComputedStyle(node).lineHeight),
          ),
        "Code padding should be less than one empty line",
      );
      assert.equal(
        await page.locator("img[data-reference]").count(),
        0,
        "Component references must not be screenshots",
      );
      for (const frame of await page.locator("iframe[data-reference]").all()) {
        assert.equal(await frame.getAttribute("loading"), "lazy");
        assert.equal(await frame.getAttribute("sandbox"), "allow-same-origin");
        await frame.scrollIntoViewIfNeeded();
        await page.waitForFunction(
          (name) =>
            document.querySelector(`iframe[data-reference="${name}"]`)
              .contentDocument?.readyState === "complete" &&
            document.querySelector(`iframe[data-reference="${name}"]`)
              .contentDocument?.body?.children.length > 0,
          await frame.getAttribute("data-reference"),
        );
        assert(await frame.evaluate((f) => f.contentDocument.body.inert));
        assert.equal(
          await frame.evaluate(
            (f) => f.contentDocument.querySelectorAll("script").length,
          ),
          0,
        );
        assert(
          await frame.evaluate(
            (f) => f.contentDocument.body.children.length > 0,
          ),
        );
        assert(
          await frame.evaluate((f) => {
            const control = f.contentDocument.querySelector("button,input,a");
            control?.focus();
            return !control || f.contentDocument.activeElement !== control;
          }),
          "Static references cannot receive keyboard focus",
        );
        await page.evaluate(() => {
          document.documentElement.dataset.theme = "light";
          window.dispatchEvent(new CustomEvent("twa:theme"));
        });
        assert.equal(
          await frame.evaluate(
            (f) => f.contentDocument.documentElement.dataset.theme,
          ),
          (await frame.getAttribute("data-fixed-theme")) || "light",
        );
      }
      for (const [name, columns] of [
        ["grid-mobile", 1],
        ["grid-tablet", 2],
        ["grid-desktop", 3],
      ]) {
        const frame = page.locator(`iframe[data-reference="${name}"]`);
        if (await frame.count())
          assert.equal(
            await frame.evaluate(
              (f) =>
                f.contentWindow
                  .getComputedStyle(f.contentDocument.querySelector(".grid"))
                  .gridTemplateColumns.split(" ").length,
            ),
            columns,
          );
      }
      if (await page.locator(".doc-body h2").count())
        assert(
          await page
            .locator(".doc-body")
            .evaluate(
              (body) =>
                parseFloat(
                  getComputedStyle(body.querySelector("h2")).fontSize,
                ) > parseFloat(getComputedStyle(body).fontSize),
            ),
          "Usage headings must be larger than body copy",
        );
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
  const copyWidth = (await code.locator(".copy-code").boundingBox()).width;
  await code.locator(".copy-code").click();
  await page.waitForFunction(
    () => document.querySelector(".copy-code").textContent === "Copied",
  );
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    await code.locator("code").textContent(),
  );
  assert.equal(await page.locator(".copy-status").count(), 0);
  assert.equal(
    (await code.locator(".copy-code").boundingBox()).width,
    copyWidth,
    "Copied variant keeps the button width",
  );
  await page.waitForFunction(
    () => document.querySelector(".copy-code").textContent === "Copy code",
  );
  await page.goto(origin + "/components/theme-toggle/");
  await ready();
  await page.locator(".demo-code > summary").click();
  const javascriptCode = page
    .locator(".code-section")
    .filter({ has: page.locator("code.language-javascript") })
    .first();
  await javascriptCode.locator(".copy-code").click();
  await page.waitForFunction(
    () =>
      document
        .querySelector("code.language-javascript")
        .closest(".code-section")
        .querySelector(".copy-code").textContent === "Copied",
  );
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    await javascriptCode.locator("code").textContent(),
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator.clipboard, "writeText", {
      configurable: true,
      value: async () => {
        throw Error("Clipboard unavailable");
      },
    }),
  );
  await javascriptCode.locator(".copy-code").click();
  await page.waitForFunction(
    () =>
      document
        .querySelector("code.language-javascript")
        .closest(".code-section")
        .querySelector(".copy-code").textContent === "Copy failed",
  );
  assert.equal(
    await javascriptCode.locator(".copy-code").getAttribute("aria-label"),
    "Copy failed. Select the code to copy it manually.",
  );
  await page.evaluate(() => delete navigator.clipboard.writeText);
  const colors = [];
  for (const theme of ["dark", "light"]) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    colors.push(
      await javascriptCode
        .locator(".hljs-keyword")
        .first()
        .evaluate((node) => getComputedStyle(node).color),
    );
  }
  assert.notEqual(
    colors[0],
    colors[1],
    "Syntax colors follow the documentation theme",
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
  const csp = fs
    .readFileSync("dist/_headers", "utf8")
    .match(/Content-Security-Policy: ([^\n]+)/)[1];
  await page.route("**/patterns/signup-dialog/", async (request) => {
    const response = await request.fetch();
    await request.fulfill({
      response,
      headers: { ...response.headers(), "content-security-policy": csp },
    });
  });
  await page.goto(origin + "/patterns/signup-dialog/");
  await ready();
  await page.locator("iframe").first().scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    document
      .querySelector("iframe")
      .contentDocument?.querySelector(".signup-panel"),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all 18 presentation pages, mobile menu/focus, first-preview placement, expanded code overflow, copy button variants, static markup references and typography, visible divider, retry framing and contextual demo returns.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
