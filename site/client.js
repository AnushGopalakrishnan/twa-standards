import {mountTheme} from 'twa-standards';
import {examples} from './examples.mjs';
mountTheme(document.querySelector('.sidebar .theme-toggle'),{storageKey:'twa-standards-theme'});
for (const root of document.querySelectorAll('[data-example]')) {
  const setup=examples[root.dataset.example]?.setup;
  if(setup) Promise.resolve(setup(root)).catch(error=>{
    const status=document.createElement('p');status.setAttribute('role','status');status.textContent='This example could not start. Reload to try again.';root.append(status);console.error(error);
  });
}

document.documentElement.dataset.standardsReady='true';
