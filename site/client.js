import {mountTheme} from 'twa-standards';
import {examples} from './examples.mjs';
import {mountNavigation} from './navigation.js';
mountTheme(document.querySelector('.sidebar .theme-toggle'),{storageKey:'twa-standards-theme'});
function mountPage() {
  let active=true;
  const cleanups=[];
  document.documentElement.dataset.standardsReady='false';
  Promise.all([...document.querySelectorAll('[data-example]')].map(async root => {
    try {
      const cleanup=await examples[root.dataset.example]?.setup?.(root);
      if(typeof cleanup==='function') {if(active)cleanups.push(cleanup);else cleanup();}
    } catch(error) {
      if(!active)return;
      const status=document.createElement('p');status.setAttribute('role','status');status.textContent='This example could not start. Reload to try again.';root.append(status);console.error(error);
    }
  })).then(()=>{if(active)document.documentElement.dataset.standardsReady='true';});
  return ()=>{active=false;cleanups.forEach(cleanup=>cleanup());};
}
mountNavigation({mountPage});

// Documentation controls are mounted once; delegation also covers partial page updates.
const menuButton=document.querySelector('.docs-menu-toggle');
menuButton.addEventListener('click',()=>menuButton.setAttribute('aria-expanded',String(menuButton.getAttribute('aria-expanded')!=='true')));
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&menuButton.getAttribute('aria-expanded')==='true'&&matchMedia('(max-width:760px)').matches){
  menuButton.setAttribute('aria-expanded','false');menuButton.focus();
 }
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('.copy-code');if(!button)return;
 const section=button.closest('.code-section'),status=section.querySelector('.copy-status');
 try{await navigator.clipboard.writeText(section.querySelector('code').textContent);status.textContent='Copied.';}
 catch{status.textContent='Copy unavailable. Select the code to copy it.';}
});
