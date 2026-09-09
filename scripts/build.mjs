import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {pages,route} from '../site/pages.mjs';
import {examples,themeMarkup} from '../site/examples.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
const read=file=>fs.readFileSync(file,'utf8');
const version=JSON.parse(read('package.json')).version;
let revision='development';try{revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch(_){}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const write=(file,data)=>{fs.mkdirSync(path.dirname(path.join(out,file)),{recursive:true});fs.writeFileSync(path.join(out,file),data);};
const signup=read('src/patterns/signup.html').replace('__SIGNUP_TITLE__','Try the signup form').replace('__SIGNUP_DESCRIPTION__','A local demonstration. No email is sent or saved.');
const fontURL=read('src/fonts.css').match(/url\("([^"]+)"\)/)[1];
const sharedCSS=['src/fonts.css','src/foundations.css','src/components.css','src/patterns/specimen.css'].map(read).join('\n');
function stylesheet(name, css) {
 const hash=createHash('sha256').update(css).digest('hex').slice(0,16);
 const file=`assets/immutable/${name}-${hash}.css`;
 write(file,css);return '/'+file;
}
const standardsCSS=stylesheet('standards',sharedCSS+'\n'+read('site/site.css'));
const patternsCSS=stylesheet('patterns',sharedCSS);
const bundle=await build({entryPoints:['site/client.js','site/gallery-demo.js'],bundle:true,splitting:true,format:'esm',minify:true,metafile:true,outdir:path.join(out,'assets/immutable'),entryNames:'[name]-[hash]',chunkNames:'chunks/[name]-[hash]',target:['es2022'],logLevel:'warning'});
const entryURL=entry=>'/'+path.relative(out,path.resolve(Object.entries(bundle.metafile.outputs).find(([,info])=>info.entryPoint===entry)[0])).split(path.sep).join('/');

const head=(title,url,css=standardsCSS)=>`<!doctype html><html lang="en" data-standards-version="${version}" data-standards-revision="${revision}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Tomorrow We Are’s working reference for foundations, components and interface patterns."><title>${escape(title)} — Standards</title><link rel="canonical" href="https://standards.tomorrowweare.com${url}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="preload" href="${fontURL}" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="${css}"><script>try{var theme=localStorage.getItem('twa-standards-theme');if(theme==='light'||theme==='dark')document.documentElement.dataset.theme=theme}catch(e){}</script></head>`;
const groups=['Foundations','Components','Patterns','Project'];
const nav=current=>groups.map(group=>`<div class="nav-group"><h2>${group}</h2>${pages.filter(page=>page.group===group).map(page=>`<a href="${route(page)}"${route(page)===current?' aria-current="location"':''}>${page.title}</a>`).join('')}</div>`).join('');
function demo(key){const example=examples[key];if(!example)throw Error('Missing example: '+key);const script=example.setup?`\n\n// Run once after mounting this markup.\n(${example.setup.toString().replace(/^(async )?setup\(/,(_,async='')=>`${async}function (`)})(document.querySelector('[data-example="${key}"]'));`:'';return `<section class="demo-block" id="${key}"><div class="demo-header"><h2>${example.title}</h2><a href="#${key}" aria-label="Link to ${example.title}">Link ↗</a></div><div class="demo-surface" data-example="${key}">${example.html}</div><details class="demo-code"><summary>Show code</summary><pre><code>${escape((example.setup?(read('site/examples.mjs').match(/^import .+$/gm)||[]).filter(line=>example.setup.toString().includes(line.includes('mountSignup')?'mountSignup':'mountTheme')).join('\n')+'\n\n':'')+'<div data-example="'+key+'">\n'+example.html+'\n</div>'+script+(key==='signup'?'\n\n<!-- Include this shared template once, outside main. -->\n'+signup:'')+(key==='gallery'?'\n\n// Complete demonstration source:\n'+read('site/gallery-demo.js')+'\n\n<!-- Include the shared viewer template once. -->\n'+read('src/patterns/viewer.html'):''))}</code></pre></details></section>`;}
for(const [index,page] of pages.entries()){
 const url=route(page);
 const html=head(page.title,url)+`<body class="standards"><a class="skip" href="#main">Skip to content</a><aside class="sidebar"><div class="brand"><h1><a href="/">Tomorrow We Are—Standards</a></h1><p>Working reference · ${version}</p></div><nav class="category-nav" aria-label="Documentation">${nav(url)}</nav><footer class="sidebar-foot">${themeMarkup}<p><a href="https://github.com/AnushGopalakrishnan/twa-standards">Source on GitHub ↗</a></p><p>Copyright © Tomorrow We Are 2026</p></footer></aside><main class="content" id="main" tabindex="-1"><header class="doc-heading"><p class="eyebrow">${page.group} / ${String(index+1).padStart(2,'0')}</p><h1>${page.title}</h1><p class="purpose">${page.purpose}</p></header>${page.examples.map(demo).join('')}<div class="doc-body">${page.body.replaceAll('RELEASE_COMMIT',revision)}</div><nav class="doc-pagination" aria-label="Next and previous pages">${index>0?`<a href="${route(pages[index-1])}"><small>Previous</small>${pages[index-1].title}</a>`:''}${index<pages.length-1?`<a href="${route(pages[index+1])}"><small>Next</small>${pages[index+1].title} ↗</a>`:''}</nav></main>${page.examples.includes('signup')?signup:''}<script type="module" src="${entryURL('site/client.js')}"></script></body></html>`;
 write(url.slice(1)+'index.html',html);
 if(index===0)write('index.html',html.replace('href="https://standards.tomorrowweare.com/foundations/"','href="https://standards.tomorrowweare.com/"'));
}
const placeholder=fs.readFileSync('site/placeholder.webp').toString('base64');
write('assets/placeholder.webp',fs.readFileSync('site/placeholder.webp'));
const colors=[['#E8E5DD','#34342F'],['#CCD0BE','#343D34'],['#CDC7E3','#353041'],['#E6D6C7','#46352E'],['#CAD6D6','#263E42'],['#DDDABB','#414027']];
colors.forEach(([bg,ink],i)=>write(`assets/example-${i+1}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" viewBox="0 0 1440 900"><rect width="1440" height="900" fill="${bg}"/><g fill="${ink}" font-family="Arial,sans-serif"><text x="80" y="96" font-size="24">FIELD STUDIES</text><text x="1180" y="96" font-size="24">INDEX / 0${i+1}</text><path d="M80 140h1280" stroke="${ink}" stroke-opacity=".3"/><text x="80" y="390" font-size="100" letter-spacing="-4">${['A quiet beginning.','Common ground.','The next chapter.','Field notes.','A useful detail.','Room to think.'][i]}</text><text x="84" y="460" font-size="24">A synthetic layout for the Standards working reference.</text><rect x="84" y="534" width="236" height="64" fill="${ink}"/><text x="116" y="575" font-size="22" fill="${bg}">Explore the study ↗</text><path d="M80 784h1280" stroke="${ink}" stroke-opacity=".3"/><text x="84" y="840" font-size="20">TOMORROW WE ARE</text><text x="1150" y="840" font-size="20">DEMONSTRATION</text></g></svg>`));
write('examples/gallery/index.html',head('Gallery demonstration','/examples/gallery/',patternsCSS)+`<body><a class="skip" href="#gallery">Skip to gallery</a><aside class="sidebar"><div class="sidebar-head"><div class="brand"><h1 class="wordmark">Tomorrow We Are—Standards</h1><p>Gallery demonstration · 6</p></div></div><div class="intro"><p>Six synthetic references for trying the shared gallery and viewer.</p><p><a href="/patterns/gallery/">← Back to the documentation</a></p><div class="newsletter"><p class="newsletter-copy">Try the signup interaction.</p><div class="newsletter-actions"><button class="button button--primary newsletter-open" type="button">Sign up</button></div></div></div><nav class="category-nav" aria-label="Example categories"></nav><footer class="sidebar-foot">${themeMarkup}<p>Synthetic data. No email is sent or saved.</p><p>Captured at 1440 × 900</p></footer></aside><main class="content" id="gallery"></main>${signup}${read('src/patterns/viewer.html')}<script>window.DEMO_PLACEHOLDER='data:image/webp;base64,${placeholder}';</script><script type="module" src="${entryURL('site/gallery-demo.js')}"></script></body></html>`);
write('favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#1b1b1b"/><path d="M8 10h16M16 10v14" fill="none" stroke="#cec9ff" stroke-width="3"/></svg>');
write('_headers','/*\n  Cache-Control: no-transform\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Content-Security-Policy: default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; connect-src \'self\'; font-src \'self\' https://content.tomorrowweare.com/standards/fonts/; form-action \'none\'; frame-ancestors \'none\'; object-src \'none\'; base-uri \'self\'\n');
write('404.html',head('Page not found','/404/')+'<body class="standards"><main style="padding:48px"><h1>Page not found</h1><p><a href="/">Return to the foundations overview ↗</a></p></main></body></html>');
// Combine the global no-transform directive with exactly one freshness policy.
// Separate immutable assets from HTML and unversioned images to avoid conflicting max-age values.
fs.appendFileSync(path.join(out,'_headers'),['/','/foundations/*','/components/*','/patterns/*','/examples/*','/installation/','/changelog/','/release.json','/404.html','/favicon.svg','/assets/:file'].map(url=>`${url}\n  Cache-Control: public, max-age=0, must-revalidate\n`).join('')+'/assets/immutable/*\n  Cache-Control: public, max-age=31536000, immutable\n');
write('release.json',JSON.stringify({package:'twa-standards',version,revision})+'\n');
console.log(`Built ${pages.length} documentation pages and a synthetic gallery demo · ${version} · ${revision.slice(0,12)}`);
