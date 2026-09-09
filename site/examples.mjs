import {mountTheme} from 'twa-standards';
import {mountSignup} from 'twa-standards/patterns/signup.js';
export const arrow = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg>';
export const previous = arrow.replace('M7 17 17 7M7 7h10v10','M19 12H5M12 5l-7 7 7 7');
export const next = arrow.replace('M7 17 17 7M7 7h10v10','M5 12h14M12 5l7 7-7 7');
export const themeMarkup = '<button class="theme-toggle" type="button" aria-label="Switch to light mode"><span class="theme-toggle-label">Light mode</span><span class="theme-toggle-icon" aria-hidden="true">◐</span></button>';
export const examples = {
  button: {
    title:'Primary', html:'<button class="button button--primary" type="button">Sign up</button>\n<p class="signup-status" role="status" aria-live="polite"></p>',
    setup(root) { root.querySelector('button').addEventListener('click', () => { root.querySelector('[role="status"]').textContent = 'Action completed.'; }); }
  },
  'button-states': {
    title:'Disabled and loading', html:'<div class="demo-row"><button class="button button--primary" type="button" disabled>Subscribe</button>\n<button class="button button--primary" type="button" data-loading>Subscribe</button></div>\n<label class="demo-setting"><input type="checkbox" data-state> Simulate loading</label>\n<p class="signup-status" role="status" aria-live="polite"></p>',
    setup(root) {const control=root.querySelector('[data-state]'), button=root.querySelector('[data-loading]');control.addEventListener('change',()=>{button.disabled=control.checked;button.setAttribute('aria-busy',String(control.checked));root.querySelector('[role="status"]').textContent=control.checked?'Subscribing…':'';});button.addEventListener('click',()=>{root.querySelector('[role="status"]').textContent='Action completed.';});}
  },
  'text-actions': {
    title:'Links and actions', html:`<div class="demo-row"><a class="text-action" href="/foundations/">View foundations ${arrow}</a>\n<button class="text-action" type="button">Copy text</button></div>\n<p class="signup-status" role="status" aria-live="polite"></p>`,
    setup(root) {root.querySelector('button').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('Tomorrow We Are');root.querySelector('[role="status"]').textContent='Text copied.';}catch(_){root.querySelector('[role="status"]').textContent='Copy unavailable in this browser.';}});}
  },
  icons: {
    title:'Directional controls',html:`<div class="demo-row"><button class="icon-control" type="button" aria-label="Previous example">${previous}</button>\n<button class="icon-control" type="button" aria-label="Next example">${next}</button></div>\n<p class="signup-status" role="status" aria-live="polite">Example 1 of 3</p>`,
    setup(root) {let i=0;root.querySelectorAll('button').forEach((button,index)=>button.addEventListener('click',()=>{i=(i+(index?1:2))%3;root.querySelector('[role="status"]').textContent=`Example ${i+1} of 3`;}));}
  },
  email: {
    title:'Email address',html:'<form novalidate><label for="example-email">Email address</label>\n<input class="signup-field" id="example-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" aria-describedby="email-help" required>\n<p id="email-help" class="demo-caption">Used only in this demonstration.</p>\n<button class="button button--primary" type="submit">Check email</button>\n<p class="signup-status" role="status" aria-live="polite"></p></form>',
    setup(root) {const form=root.querySelector('form'),input=form.elements.email;form.addEventListener('submit',e=>{e.preventDefault();input.setAttribute('aria-invalid',String(!input.validity.valid));root.querySelector('[role="status"]').textContent=input.validity.valid?'Email format accepted.':'Enter a valid email address.';if(!input.validity.valid)input.focus();});input.addEventListener('input',()=>input.removeAttribute('aria-invalid'));}
  },
  theme: {
    title:'Light and dark', html:themeMarkup,
    setup(root) {return mountTheme(root.querySelector('button'),{storageKey:'twa-standards-theme'});}
  },
  navigation: {
    title:'Current location',html:'<nav class="category-nav example-nav" aria-label="Example navigation">\n<a href="#navigation" aria-current="location"><span>Hero</span><span>12</span></a>\n<a href="#navigation"><span>Call to action</span><span>6</span></a>\n</nav>',
    setup(root) {root.querySelectorAll('a').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();root.querySelector('[aria-current]')?.removeAttribute('aria-current');link.setAttribute('aria-current','location');}));}
  },
  counter: {
    title:'Position in a collection',html:'<div class="demo-row"><span class="lightbox-count" aria-live="polite" aria-atomic="true"></span>\n<button class="text-action" type="button">Next reference</button></div>',
    setup(root) {const ready=import('twa-standards/counter');let value=1;const count=root.querySelector('.lightbox-count');const initial=ready.then(({updateCounter})=>updateCounter(count,value,12,{animated:false}));root.querySelector('button').addEventListener('click',async()=>{const {updateCounter}=await ready;value=value%12+1;updateCounter(count,value,12);});return initial;}
  },
  divider: {title:'Quiet separation',html:'<p>Collection details</p>\n<hr class="divider">\n<p class="demo-caption">Related actions</p>'},
  status: {
    title:'Loading, success and error',html:'<label for="status-choice">Simulated response</label>\n<select id="status-choice"><option value="loading">Loading</option><option value="success">Success</option><option value="error">Error</option></select>\n<p class="signup-status" role="status" aria-live="polite">Subscribing…</p>',
    setup(root) {root.querySelector('select').addEventListener('change',event=>{root.querySelector('[role="status"]').textContent={loading:'Subscribing…',success:'You’re subscribed.',error:'Could not subscribe. Try again.'}[event.target.value];});}
  },
  signup: {
    title:'Signup dialog',html:'<button class="button button--primary" type="button" data-signup>Sign up</button>\n<label class="demo-setting"><input type="checkbox" data-error> Simulate a failed submission</label>\n<p class="demo-caption">Synthetic demo. No email is sent or saved.</p>',
    setup(root) {return mountSignup({trigger:root.querySelector('[data-signup]'),submit:async()=>{await new Promise(resolve=>setTimeout(resolve,700));if(root.querySelector('[data-error]').checked)throw new Error('Could not subscribe. Try again.');return 'Demo complete. No email was saved.';}}).dispose;}
  },
  gallery: {title:'Cards, category navigation and viewer',html:`<a class="button button--primary demo-launch" href="/examples/gallery/">Open gallery demo ${arrow}</a><p class="demo-caption">Six synthetic references. Includes image loading, theme switching, signup and viewer navigation.</p>`},
  retry: {
    title:'Unavailable collection',html:'<div data-result><p class="empty-gallery">The collection couldn’t load. Please try again.</p>\n<button class="text-action" type="button">Retry</button></div>\n<label class="demo-setting"><input type="checkbox" checked data-error> Simulate an error</label>\n<p class="signup-status" role="status" aria-live="polite"></p>',
    setup(root) {const status=root.querySelector('[role="status"]');root.querySelector('button').addEventListener('click',async event=>{event.target.disabled=true;status.textContent='Loading collection…';await new Promise(resolve=>setTimeout(resolve,650));status.textContent=root.querySelector('[data-error]').checked?'The collection couldn’t load. Please try again.':'Collection loaded. Six references available.';event.target.disabled=false;});}
  },
  placeholder: {
    title:'Inline preview to decoded image',html:'<div class="demo-placeholder"><span class="screen has-placeholder" style="--image-placeholder:url(\'/assets/placeholder.webp\')"><img src="/assets/example-1.svg" width="1440" height="900" alt="Synthetic editorial layout"></span></div>\n<button class="text-action" type="button">Reveal decoded image</button>\n<p class="signup-status" role="status" aria-live="polite">Showing the inline preview.</p>',
    setup(root) {root.querySelector('button').addEventListener('click',async event=>{const screen=root.querySelector('.screen');if(screen.classList.contains('is-loaded')){screen.classList.remove('is-loaded');event.target.textContent='Reveal decoded image';root.querySelector('[role="status"]').textContent='Showing the inline preview.';return;}try{await root.querySelector('img').decode();screen.classList.add('is-loaded');event.target.textContent='Show placeholder';root.querySelector('[role="status"]').textContent='Showing the decoded image.';}catch(_){root.querySelector('[role="status"]').textContent='Image unavailable. The preview is retained.';}});}
  },
  motion: {title:'Screenshot hover',html:'<article class="card"><a class="preview" href="/patterns/image-viewer/"><span class="screen"><img src="/assets/example-1.svg" width="1440" height="900" alt="Synthetic editorial layout"></span></a></article><p class="demo-caption">Hover to lift the image by 4px. Reduced motion removes the lift.</p>'}
};
