import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {pages,route} from '../site/pages.mjs';
import {createServer} from '../scripts/serve.mjs';
const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();
const errors=[],external=[];
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('**/*',async route=>{if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort();}return route.continue();});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 // Core styling must work without the optional gallery/layout stylesheet.
 const coreCSS=fs.readFileSync('src/foundations.css','utf8')+fs.readFileSync('src/components.css','utf8');
 await page.setContent('<style>'+coreCSS+'</style><button class="button button--primary">Sign up</button><button class="theme-toggle">Light mode</button><nav class="category-nav"><a href="#example" aria-current="location">Current</a></nav>');
 assert.equal(await page.locator('.button').evaluate(el=>getComputedStyle(el).padding),'12px');
 assert.equal(await page.locator('.theme-toggle').evaluate(el=>getComputedStyle(el).color),'rgba(235, 234, 226, 0.55)');
 assert.equal(await page.locator('nav a').evaluate(el=>getComputedStyle(el).color),'rgb(206, 201, 255)');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  for(const doc of pages){
   const response=await page.goto(origin+route(doc));assert.equal(response.status(),200);
   assert.equal(await page.locator('main h1').textContent(),doc.title);
   assert.equal(await page.locator('.sidebar [aria-current="location"]').getAttribute('href'),route(doc));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow on ${route(doc)} at ${width}`);
   for(const href of await page.locator('a[href^="/"]').evaluateAll(links=>links.map(link=>link.getAttribute('href')))){
    const file=path.join('dist',href.split('#')[0],'index.html');assert(fs.existsSync(file),`Broken link ${href}`);
   }
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(origin+'/components/buttons/');
 await page.locator('[data-example="button"] button').click();assert.equal(await page.locator('[data-example="button"] [role="status"]').textContent(),'Action completed.');
 await page.locator('[data-state]').check();assert(await page.locator('[data-loading]').isDisabled());
 await page.locator('[data-state]').uncheck();assert(!(await page.locator('[data-loading]').isDisabled()));
 await page.locator('details summary').first().click();assert(await page.locator('details').first().getAttribute('open')!==null);
 await page.locator('.sidebar .theme-toggle').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.goto(origin+'/components/email-input/');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.locator('form button').click();assert.equal(await page.locator('#example-email').getAttribute('aria-invalid'),'true');
 await page.locator('#example-email').fill('demo@example.com');await page.locator('form button').click();assert.equal(await page.locator('[role="status"]').textContent(),'Email format accepted.');
 await page.goto(origin+'/patterns/signup-dialog/');
 await page.locator('[data-error]').check();await page.locator('[data-signup]').click();await page.locator('#signup-email').fill('demo@example.com');
 assert.equal(await page.locator('main').evaluate(el=>el.inert),true);
 await page.locator('.signup-submit').click();await page.waitForFunction(()=>document.querySelector('.signup-status').textContent==='Could not subscribe. Try again.');
 assert.equal(await page.locator('#signup-email').inputValue(),'demo@example.com');
 await page.locator('.signup-submit').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'signup-close');
 await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'button button--primary signup-submit');
 await page.keyboard.press('Escape');assert.equal(await page.locator('main').evaluate(el=>el.inert),false);assert(await page.locator('[data-signup]').evaluate(el=>el===document.activeElement));
 await page.locator('[data-error]').uncheck();await page.locator('[data-signup]').click();await page.locator('.signup-submit').click();
 await page.waitForFunction(()=>document.querySelector('.signup-status').textContent==='Demo complete. No email was saved.');await page.keyboard.press('Escape');
 await page.goto(origin+'/components/counters/');await page.locator('[data-example="counter"] button').click();assert.equal(await page.locator('.lightbox-count').getAttribute('aria-label'),'2 / 12');
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForSelector('number-flow');assert.equal(await page.locator('number-flow').evaluate(el=>el.animated),false);
 await page.goto(origin+'/patterns/placeholders/');await page.locator('[data-example="placeholder"] button').click();assert(await page.locator('.screen').evaluate(el=>el.classList.contains('is-loaded')));
 await page.goto(origin+'/examples/gallery/');await page.waitForSelector('.card');
 assert.equal(await page.locator('#gallery .card').count(),3);
 await page.locator('.preview').first().click();await page.waitForFunction(()=>document.querySelector('.lightbox').open&&!document.querySelector('.lightbox').classList.contains('is-opening'));
 await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.lightbox-title').textContent==='Common ground');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.lightbox').open);
 await page.waitForFunction(()=>document.activeElement.classList.contains('preview'));
 assert(await page.evaluate(()=>document.activeElement.classList.contains('preview')));
 await page.goto(origin+'/patterns/signup-dialog/');await page.evaluate(()=>document.body.style.zoom='2');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow at 200% zoom');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[],'Demonstrations must never contact external services');
 fs.mkdirSync('.context/qa',{recursive:true});
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(const theme of ['dark','light'])for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/components/buttons/');
  await page.waitForFunction(()=>document.documentElement.dataset.standardsReady==='true');
  await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;localStorage.setItem('twa-standards-theme',theme);window.dispatchEvent(new CustomEvent('twa:theme'));},theme);await page.waitForTimeout(250);
  if(width===390)await page.locator('main').scrollIntoViewIfNeeded();
  await page.screenshot({path:`.context/qa/buttons-${theme}-${width}.png`});
 }
 console.log('PASS: 27 pages at desktop/mobile, local links, theme persistence, controls, form errors/success, focus trap/restoration, reduced motion, viewer navigation and zero external requests.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
