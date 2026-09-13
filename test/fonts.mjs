import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {createServer} from '../scripts/serve.mjs';
const fontCSS=fs.readFileSync('src/fonts.css','utf8');
const fontURL=fontCSS.match(/url\("([^"]+)"\)/)[1];
assert(!/src:[^}]*local\(/.test(fontCSS),'The hosted font must not depend on an installed face.');
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const loaded=page.waitForResponse(fontURL);
  await page.goto(origin+'/foundations/typography/');const response=await loaded;assert.equal(response.status(),200);await response.finished();
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('link[as="font"]').getAttribute('href'),fontURL);
  const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const {root}=await cdp.send('DOM.getDocument');
  for(const selector of ['main h1','.sidebar .brand a','.type-large']){
   const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
   const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
   assert(fonts.some(font=>font.isCustomFont&&font.postScriptName==='PPNeueMontreal-Medium'&&font.glyphCount>0),`${selector} must render downloaded Neue Montreal at ${width}`);
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // Page changes keep the already loaded FontFace available.
  let fontRequests=0;page.on('request',r=>{if(r.url()===fontURL)fontRequests++;});
  if(width===390)await page.locator('.docs-menu-toggle').click();
  await page.locator('.sidebar a[href="/components/buttons/"]').click();await page.waitForSelector('[data-example="button"]');
  await page.evaluate(()=>document.fonts.ready);assert.equal(fontRequests,0);
  assert.deepEqual(errors,[]);await context.close();
 }
 const offline=await browser.newContext();await offline.route(fontURL,route=>route.abort());const page=await offline.newPage();
 await page.goto(origin+'/components/buttons/');await page.evaluate(()=>document.fonts.ready);
 assert(await page.locator('main h1').isVisible());
 await page.locator('[data-example="button"] button').click();assert.equal(await page.locator('[data-example="button"] [role="status"]').textContent(),'Action completed.');
 assert(await page.evaluate(()=>getComputedStyle(document.querySelector('main h1')).fontFamily.includes('Arial')));await offline.close();
 console.log('PASS: downloaded Neue Montreal renders on desktop/mobile, matches preload, survives partial navigation without another font request, and keeps readable fallback text on failure.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
