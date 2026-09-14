import fs from 'node:fs';
import postcss from 'postcss';
const base=new URL('../src/patterns/',import.meta.url);
const original=postcss.parse(fs.readFileSync(new URL('specimen.css',base),'utf8'));
const result=postcss.root();
function extract(container,out){
  for(const node of container.nodes){
    if(node.type==='rule'){
      const selectors=node.selectors.filter(selector=>selector.includes('lightbox')||selector==='.screen.is-shared-source');
      if(selectors.length)out.append(node.clone({selector:selectors.join(',')}));
    }else if(node.type==='atrule'&&node.name==='keyframes'&&node.params.startsWith('lightbox'))out.append(node.clone());
    else if(node.type==='atrule'&&node.nodes){
      const copy=node.clone({nodes:[]});extract(node,copy);if(copy.nodes.length)out.append(copy);
    }
  }
}
extract(original,result);
fs.writeFileSync(new URL('viewer.css',base),'/* Generated from specimen.css by scripts/extract-viewer-css.mjs. Do not edit. */\n'+result.toString()+'\n.lightbox[data-standalone]{left:0;width:100vw}\n.lightbox.is-single-image .lightbox-nav,.lightbox.is-single-image .lightbox-peek-button{display:none}\n');
