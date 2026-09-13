import {mountTheme} from 'twa-standards';
import {createGallerySections,mountGallery,mountSignup} from 'twa-standards/patterns';
mountTheme(document.querySelector('.theme-toggle'),{storageKey:'twa-standards-theme'});
const categories=[{id:'editorial',key:'editorial',title:'Editorial'},{id:'product',key:'product',title:'Product'}];
const names=['A quiet beginning','Common ground','The next chapter','Field notes','A useful detail','Room to think'];
const data={categories,references:names.map((title,index)=>({id:String(index),categoryId:index<3?'editorial':'product',title,url:'https://example.com',image:{url:new URL(`/assets/example-${index+1}.svg`,location.href).href,thumbnail:`/assets/example-${index+1}.svg`,medium:`/assets/example-${index+1}.svg`,width:1440,height:900,placeholder:window.DEMO_PLACEHOLDER}}))};
const {sections,links}=createGallerySections(data);
const selected=new URL(location.href).searchParams.get('category');
document.getElementById('gallery').replaceChildren(sections.find(section=>section.id===selected)||sections[0]);
document.querySelector('.category-nav').replaceChildren(links);
const viewer=mountGallery(sections);
mountSignup({trigger:document.querySelector('.newsletter-open'),beforeOpen:async()=>{const dialog=document.querySelector('.lightbox');if(dialog.open)await new Promise(resolve=>{dialog.addEventListener('close',resolve,{once:true});viewer.close();});},submit:async()=>{await new Promise(resolve=>setTimeout(resolve,700));return 'Demo complete. No email was saved.';}});

// Documentation context belongs to this demo shell, not the shared gallery.
const contexts={
 'sidebar-footer':{title:'Sidebar and footer',instruction:'Inspect the identity, category navigation and footer. Resize the window to compare the mobile arrangement.'},
 gallery:{title:'Gallery cards and grid',instruction:'Choose a category, open a screenshot, then compare the separate Visit destination.'},
 'image-viewer':{title:'Image viewer',instruction:'Select a screenshot to open the viewer. Use the arrows to browse and Escape to return.'}
};
const context=contexts[new URL(location.href).searchParams.get('from')];
if(context){
 document.querySelector('[data-demo-title]').textContent=context.title+' · Live demonstration';
 document.querySelector('[data-demo-instruction]').textContent=context.instruction;
 const back=document.querySelector('[data-demo-return]');
 const slug=new URL(location.href).searchParams.get('from');back.href='/patterns/'+slug+'/';back.textContent='← Back to '+context.title;
 document.title=context.title+' demonstration — Standards';
}
