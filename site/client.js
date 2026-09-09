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
