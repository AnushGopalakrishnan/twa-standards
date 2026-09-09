import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {build} from 'esbuild';
import {createServer} from '../scripts/serve.mjs';
import {pages,route as routeFor} from '../site/pages.mjs';

const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();
const fontURL=fs.readFileSync('src/fonts.css','utf8').match(/url\("([^"]+)"\)/)[1];
const errors=[],external=[];
const ready=page=>page.waitForFunction(()=>document.documentElement.dataset.standardsReady==='true');
const click=async(page,path)=>{
 await page.locator(`.sidebar a[href="${path}"]`).evaluate(link=>link.click());
 await page.waitForFunction(path=>location.pathname===path&&!document.querySelector('#main').hasAttribute('aria-busy'),path);
 await ready(page);
};
try {
 const context=await browser.newContext({viewport:{width:1440,height:700}});
 await context.route('**/*',async route=>{
  if(route.request().url()!==fontURL&&new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort();}
  return route.continue();
 });
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
 const requests=[];page.on('request',request=>requests.push({url:request.url(),type:request.resourceType()}));
 await page.goto(origin+'/components/buttons/');await ready(page);
 const initialAssets=await page.locator('link[rel="stylesheet"],script[src]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')||n.getAttribute('src')));
 assert(initialAssets.every(url=>/^\/assets\/immutable\/.+-[\w]+\.(js|css)$/.test(url)));
 await page.evaluate(()=>{window.originalSidebar=document.querySelector('.sidebar');window.originalDocument=document;document.querySelector('.sidebar').scrollTop=120;});
 requests.length=0;
 // Hover/focus fetch once and share that result with clicks and subsequent visits.
 const email=page.locator('.sidebar a[href="/components/email-input/"]');
 const emailResponse=page.waitForResponse(origin+'/components/email-input/');await email.hover();await emailResponse;
 await click(page,'/components/email-input/');
 assert.equal(await page.title(),'Email input — Standards');
 assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://standards.tomorrowweare.com/components/email-input/');
 assert(await page.evaluate(()=>document===window.originalDocument&&document.querySelector('.sidebar')===window.originalSidebar));
 assert.equal(await page.locator('.sidebar').evaluate(el=>el.scrollTop),120);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
 await page.locator('form button').click();assert.equal(await page.locator('#example-email').getAttribute('aria-invalid'),'true');
 await click(page,'/components/buttons/');await click(page,'/components/email-input/');
 assert.equal(requests.filter(r=>r.url===origin+'/components/email-input/').length,1);
 assert.equal(requests.filter(r=>['document','script','stylesheet'].includes(r.type)).length,0);
 const theme=page.locator('.sidebar a[href="/components/theme-toggle/"]');
 const themeResponse=page.waitForResponse(origin+'/components/theme-toggle/');await theme.focus();await themeResponse;
 await click(page,'/components/theme-toggle/');
 await page.locator('[data-example="theme"] button').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.evaluate(()=>window.oldTheme=document.querySelector('[data-example="theme"] button'));
 await click(page,'/components/buttons/');
 await page.evaluate(()=>window.oldTheme.click());assert.equal(await page.locator('html').getAttribute('data-theme'),'light','Unmounted theme must not toggle the site');
 // All documentation pages navigate within one document and mount their examples.
 console.log('Navigation: all routes');
 for(const doc of pages){
  await click(page,routeFor(doc));
  assert.equal(await page.locator('main h1').textContent(),doc.title);
  assert.equal(await page.locator('.sidebar [aria-current="location"]').getAttribute('href'),routeFor(doc));
 }
 assert(await page.evaluate(()=>window.originalDocument===document));
 console.log('Navigation: history');
 // Each history entry restores its own scroll, including same-page anchors.
 await click(page,'/components/buttons/');await page.evaluate(()=>scrollTo(0,400));await page.waitForFunction(()=>scrollY===400);
 await click(page,'/components/email-input/');
 await page.goBack();await page.waitForFunction(()=>location.pathname==='/components/buttons/'&&scrollY===400);
 await page.goForward();await page.waitForFunction(()=>location.pathname==='/components/email-input/'&&scrollY===0);
 await click(page,'/components/buttons/');
 await page.locator('a[href="#button-states"]').evaluate(el=>el.click());
 await page.waitForFunction(()=>location.hash==='#button-states'&&document.activeElement.id==='button-states');
 await page.goBack();await page.waitForFunction(()=>location.hash===''&&scrollY===0);
 await page.goForward();await page.waitForFunction(()=>location.hash==='#button-states');
 console.log('Navigation: cleanup');
 // Repeated visits must not accumulate global theme or signup handlers.
 const cdp=await context.newCDPSession(page);
 async function listenerCount(expression,event){
  const {result}=await cdp.send('Runtime.evaluate',{expression});
  const {listeners}=await cdp.send('DOMDebugger.getEventListeners',{objectId:result.objectId});
  return listeners.filter(listener=>listener.type===event).length;
 }
 await click(page,'/components/buttons/');
 const baseKeys=await listenerCount('document','keydown'),baseTheme=await listenerCount('window','twa:theme');
 for(let i=0;i<4;i++){
  await click(page,'/components/theme-toggle/');assert.equal(await listenerCount('window','twa:theme'),baseTheme+1);
  await click(page,'/patterns/signup-dialog/');assert.equal(await listenerCount('document','keydown'),baseKeys+1);
  await page.locator('[data-signup]').click();await page.locator('#signup-email').fill('synthetic@example.com');await page.locator('.signup-submit').click();
  await page.evaluate(()=>{window.oldSignup=document.querySelector('[data-signup]');window.oldOverlay=document.querySelector('.signup-overlay');});
  // Back can leave a page while the dialog covers the navigation and submission is pending.
  await page.goBack();await page.waitForFunction(()=>location.pathname==='/components/theme-toggle/'&&!document.querySelector('.signup-overlay'));await ready(page);
  assert.equal(await page.locator('#main').evaluate(el=>el.inert),false);
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  await page.evaluate(()=>window.oldSignup.click());
  assert(await page.evaluate(()=>window.oldOverlay.hidden));
  await click(page,'/components/buttons/');
  assert.equal(await listenerCount('document','keydown'),baseKeys);assert.equal(await listenerCount('window','twa:theme'),baseTheme);
 }
 console.log('Navigation: races and failures');
 // Latest click wins even if the earlier fetch completes later.
 await page.goto(origin+'/components/buttons/');await ready(page);
 let slowFinished;
 const finished=new Promise(resolve=>slowFinished=resolve);
 await page.route('**/components/email-input/',async route=>{await new Promise(r=>setTimeout(r,300));await route.continue();slowFinished();});
 await page.locator('.sidebar a[href="/components/email-input/"]').evaluate(el=>el.click());
 await click(page,'/components/theme-toggle/');await finished;await page.waitForTimeout(100);
 assert.equal(new URL(page.url()).pathname,'/components/theme-toggle/');assert.equal(await page.locator('main h1').textContent(),'Theme toggle');
 await page.unroute('**/components/email-input/');
 // Fetch failures and release changes use normal navigation, with a working final document.
 for(const failure of ['network','release','markup']){
  await page.goto(origin+'/components/buttons/');await ready(page);let fallback=false;
  await page.route('**/components/email-input/',async route=>{
   if(route.request().isNavigationRequest()){fallback=true;return route.continue();}
   if(failure==='network')return route.abort();
   const response=await route.fetch();let body=await response.text();
   body=failure==='release'?body.replace(/data-standards-revision="[^"]+"/,'data-standards-revision="new-release"'):body.replace('id="main"','id="missing"');
   return route.fulfill({response,body});
  });
  await click(page,'/components/email-input/');assert(fallback,`${failure} should fall back to a document load`);
  await page.unroute('**/components/email-input/');
 }
 // Native link behavior remains available for modifiers, targets, downloads and demo pages.
 await page.goto(origin+'/components/buttons/');await ready(page);
 const prevented=await page.evaluate(()=>{
  const link=document.querySelector('.sidebar a[href="/components/email-input/"]');
  const results=[];
  function check(options={}){const event=new MouseEvent('click',{bubbles:true,cancelable:true,...options});document.addEventListener('click',e=>{results.push(e.defaultPrevented);e.preventDefault();},{once:true});link.dispatchEvent(event);}
  check({ctrlKey:true});check({metaKey:true});check({shiftKey:true});check({altKey:true});check({button:1});
  link.target='_blank';check();link.target='';link.download='example';check();link.removeAttribute('download');return results;
 });
 assert.deepEqual(prevented,Array(7).fill(false));
 await click(page,'/patterns/gallery/');await page.locator('.demo-launch').click();await page.waitForSelector('#gallery .card');
 assert.equal(await page.evaluate(()=>window.originalDocument),undefined);
 await page.goBack();await page.waitForSelector('#main');
 // Mobile navigation lands on the content, not the top of the tall sidebar.
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/components/buttons/');await ready(page);
 await click(page,'/components/email-input/');
 assert(Math.abs(await page.locator('#main').evaluate(el=>el.getBoundingClientRect().top))<2);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.close();await context.close();
 // Static imports are discovered in the head, without eagerly fetching optional counters.
 const fast=await browser.newContext();const fastPage=await fast.newPage();
 const fastRequests=[];fastPage.on('request',r=>fastRequests.push({url:r.url(),type:r.resourceType()}));
 const adjacentResponses=Promise.all(['/foundations/','/foundations/typography/'].map(path=>fastPage.waitForResponse(origin+path)));
 await fastPage.goto(origin+'/foundations/colors/');await ready(fastPage);
 const hints=await fastPage.locator('link[rel="modulepreload"]').evaluateAll(nodes=>nodes.map(n=>n.href));
 assert(hints.length>=2);
 assert(fastRequests.filter(r=>r.type==='script').every(r=>hints.includes(r.url)),'All initial static modules must be preloaded');
 assert(!fastRequests.some(r=>r.url.includes('/counter-')),'Counter module stays on demand');
 const cssURL=await fastPage.locator('link[rel="stylesheet"]').getAttribute('href');
 assert(fs.statSync('dist'+cssURL).size<39000,'Documentation CSS stays below 39 KB');
 await adjacentResponses;
 for(const path of ['/foundations/','/foundations/typography/'])assert.equal(fastRequests.filter(r=>r.url===origin+path&&r.type==='fetch').length,1);
 await click(fastPage,'/foundations/typography/');
 assert.equal(fastRequests.filter(r=>r.url===origin+'/foundations/typography/').length,1,'Adjacent page is reused');
 const pressed=fastPage.locator('.sidebar a[href="/components/email-input/"]');
 const pressedResponse=fastPage.waitForResponse(origin+'/components/email-input/');
 await pressed.dispatchEvent('pointerdown',{pointerType:'touch',isPrimary:true,button:0});await pressedResponse;
 await click(fastPage,'/components/email-input/');
 assert.equal(fastRequests.filter(r=>r.url===origin+'/components/email-input/').length,1,'Touch press and click share the request');
 await fast.close();
 // Save-Data suppresses speculation while keeping explicit navigation functional.
 const saver=await browser.newContext();await saver.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true,effectiveType:'4g'}}));
 const saverPage=await saver.newPage();await saverPage.goto(origin+'/components/buttons/');await ready(saverPage);
 let fetches=0;saverPage.on('request',r=>{if(r.resourceType()==='fetch')fetches++;});
 const saverLink=saverPage.locator('.sidebar a[href="/components/email-input/"]');await saverLink.hover();await saverLink.focus();await saverLink.dispatchEvent('pointerdown',{pointerType:'touch',isPrimary:true,button:0});await saverPage.waitForTimeout(700);assert.equal(fetches,0);
 await click(saverPage,'/components/email-input/');assert.equal(fetches,1);await saver.close();
 // Direct fragments and plain links still work with JavaScript disabled.
 const plain=await browser.newContext({javaScriptEnabled:false});const plainPage=await plain.newPage();
 assert.equal((await plainPage.goto(origin+'/components/buttons/#button-states')).status(),200);
 await plainPage.locator('.sidebar a[href="/components/email-input/"]').click();assert.equal(await plainPage.locator('main h1').textContent(),'Email input');await plain.close();
 // Disposal while a host's beforeOpen callback is pending must not resurrect a removed dialog.
 const fixture=await browser.newPage();await fixture.goto(origin+'/patterns/signup-dialog/');await ready(fixture);
 const bundle=await build({entryPoints:['src/patterns/signup.js'],bundle:true,format:'iife',globalName:'SignupFixture',write:false});
 await fixture.addScriptTag({content:bundle.outputFiles[0].text});
 assert(await fixture.evaluate(async()=>{
  const trigger=document.createElement('button'),overlay=document.querySelector('.signup-overlay').cloneNode(true);document.body.append(trigger,overlay);
  let resolve;const pending=new Promise(r=>resolve=r);
  const mounted=SignupFixture.mountSignup({trigger,overlay,submit:async()=>'',beforeOpen:()=>pending});
  const opening=mounted.open();mounted.dispose();resolve();await opening;
  const hidden=overlay.hidden&&!document.querySelector('#main').inert;trigger.remove();overlay.remove();return hidden;
 }));await fixture.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS: partial navigation across all pages, prefetch/cache reuse, history/fragments/scroll/focus, mobile, listener cleanup, pending signup disposal, latest-click wins, failure/release fallback, native links, Save-Data and no-JS.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
