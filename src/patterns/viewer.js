import {updateCounter as renderCounter} from '../counter.js';

/** Mount once per document. Sections are detached or mounted DOM from createGallerySections. */
export function mountGallery(sections) {
    var gallery=document.getElementById('gallery');
    var categoryLinks=Array.prototype.slice.call(document.querySelectorAll('.category-nav a[data-category]'));
    var dialog=document.getElementById('lightbox');
    var previews=[];
    var activeSectionId='';

    function categoryFromURL(){
      var url=new URL(location.href);
      if(!url.searchParams.has('category')&&sections.some(function(section){return section.id===url.hash.slice(1);})) {
        url.searchParams.set('category',url.hash.slice(1));
        url.hash='';
        history.replaceState(history.state,'',url);
      }
      return url.searchParams.get('category');
    }

    function selectCategory(id,scroll){
      var section=sections.find(function(section){return section.id===id;})||sections[0];
      if(!section||section.id===activeSectionId){return;}
      // Keep the current viewer's cards until its close animation finishes.
      if(dialog.open){return;}
      if(typeof openTransitionToken==='number'){openTransitionToken+=1;}
      if(nearbyImages){clearPreloads();}
      prepareCategoryImages(section,'high');
      activeSectionId=section.id;
      gallery.replaceChildren(section);
      previews=Array.prototype.slice.call(section.querySelectorAll('.preview'));
      categoryLinks.forEach(function(link){
        if(link.dataset.category===section.id){link.setAttribute('aria-current','location');}
        else{link.removeAttribute('aria-current');}
      });
      if(scroll){gallery.scrollIntoView({behavior:'instant',block:'start'});}
    }

    selectCategory(categoryFromURL(),false);
    categoryLinks.forEach(function(link){
      link.addEventListener('click',function(event){
        if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey){return;}
        event.preventDefault();
        var url=new URL(location.href);
        url.searchParams.set('category',link.dataset.category);
        url.hash='';
        if(location.href!==url.href){history.pushState(null,'',url);}
        if(dialog.open){returnFocus=link;closeViewer();return;}
        selectCategory(link.dataset.category,true);
      });
    });
    window.addEventListener('popstate',function(){selectCategory(categoryFromURL(),true);});
    window.addEventListener('hashchange',function(){selectCategory(categoryFromURL(),true);});

    if(!dialog||typeof dialog.show!=='function'||!previews.length){return {close: function(){}};}
    var viewerImage=dialog.querySelector('.lightbox-image');
    var peekImage=dialog.querySelector('.lightbox-peek');
    var peekButton=peekImage.parentElement;
    var previousPeekButton=dialog.querySelector('.lightbox-peek-previous');
    var previousPeekImage=previousPeekButton.querySelector('img');
    var title=dialog.querySelector('.lightbox-title');
    var category=dialog.querySelector('.lightbox-category');
    var count=dialog.querySelector('.lightbox-count');
    var status=dialog.querySelector('.lightbox-status');
    var announcement=dialog.querySelector('.lightbox-announcement');
    var stage=dialog.querySelector('.lightbox-stage');
    var copyButton=dialog.querySelector('.lightbox-copy');
    var downloadLink=dialog.querySelector('.lightbox-download');
    var liveLink=dialog.querySelector('.lightbox-live');
    var closeButton=dialog.querySelector('.lightbox-close');
    var previousButton=dialog.querySelector('.lightbox-prev');
    var nextButton=dialog.querySelector('.lightbox-next');
    var viewerPageOverflow='';
    var sidebar=document.querySelector('.sidebar');
    var contentArea=document.querySelector('.content');
    var skipLink=document.querySelector('.skip');
    function setViewerBackground(active){
      contentArea.inert=active;
      sidebar.inert=active&&window.matchMedia('(max-width:1249px)').matches;
      skipLink.inert=active;
      if(sidebar.inert&&sidebar.contains(document.activeElement)){dialog.focus({preventScroll:true});}
    }
    window.addEventListener('resize',function(){if(dialog.open){setViewerBackground(true);}});
    var currentIndex=-1;
    var returnFocus=null;
    var pointerStartX=null;
    var openTransitionImage=null;
    var activeSourceFrame=null;
    var activeSourceIndex=-1;
    var openTransitionToken=0;
    var copyResetTimer=0;
    var closeAnimationTimer=0;
    var navigationToken=0;
    var navigationLayers=[];
    var navigationIncoming=null;
    var requestedIndex=-1;
    var nearbyImages=new Map();
    var preloadWorkers=0;
    var sharpToken=0;
    // Use the same request mode as gallery thumbnails so cached previews remain reusable.
    viewerImage.crossOrigin='anonymous';
    peekImage.crossOrigin='anonymous';
    previousPeekImage.crossOrigin='anonymous';
    var placeholder=document.createElement('img');
    placeholder.crossOrigin='anonymous';
    placeholder.className='lightbox-placeholder';
    placeholder.alt='';
    placeholder.setAttribute('aria-hidden','true');
    viewerImage.parentNode.appendChild(placeholder);

    function clearNavigation(){
      navigationToken+=1;
      navigationLayers.forEach(function(layer){layer.getAnimations().forEach(function(animation){animation.cancel();});layer.remove();});
      navigationLayers=[];
      navigationIncoming=null;
      dialog.classList.remove('is-switching');
    }

    function interruptOpening(){
      if(!dialog.classList.contains('is-opening')||!openTransitionImage){return null;}
      var rect=openTransitionImage.getBoundingClientRect();
      openTransitionToken+=1;
      openTransitionImage.getAnimations().forEach(function(animation){animation.cancel();});
      openTransitionImage.remove();
      openTransitionImage=null;
      dialog.classList.remove('is-opening','is-open-handoff');
      return rect;
    }

    function cardSource(preview){
      var image=preview.querySelector('img');
      var screen=preview.querySelector('.screen');
      var painted=!screen||!screen.classList.contains('has-placeholder')||screen.classList.contains('is-loaded');
      return painted&&image&&image.complete&&image.naturalWidth?(image.currentSrc||image.src):(preview.dataset.placeholder||(image?image.src:''));
    }

    function itemAt(index){
      var wrapped=(index+previews.length)%previews.length;
      var preview=previews[wrapped];
      var image=preview.querySelector('img');
      return {index:wrapped,preview:preview,src:preview.dataset.viewerSrc||preview.href,originalSrc:preview.href,placeholder:preview.dataset.placeholder||'',site:preview.dataset.site||'',category:preview.dataset.category||'',live:preview.dataset.liveUrl||'',alt:image?image.alt:''};
    }

    function allowSpeculation(){
      var connection=navigator.connection;
      return !(connection&&(connection.saveData||/slow-2g|2g/.test(connection.effectiveType)));
    }

    function warmScreenshot(index,priority){
      var item=itemAt(index);
      if(!dialog.open&&!nearbyImages.has(index)){clearPreloads();}
      var entry=nearbyImages.get(index);
      if(!entry){
        var image=new Image();
        image.decoding='async';
        image.crossOrigin='anonymous';
        entry={image:image,src:item.src,started:false,ready:false};
        nearbyImages.set(index,entry);
      }
      entry.image.fetchPriority=priority;
      if(!entry.started){
        entry.started=true;
        entry.image.src=entry.src;
        entry.image.decode().then(function(){entry.ready=true;},function(){
          if(nearbyImages.get(index)===entry){nearbyImages.delete(index);}
        });
      }
    }

    function prepareCategoryImages(section,priority){
      // Use the mounted grid's geometry; detached categories share this layout.
      var grid=gallery.querySelector('.grid');
      var card=grid&&grid.querySelector('.card');
      if(!card){return;}
      var gridStyle=getComputedStyle(grid);
      var columns=gridStyle.gridTemplateColumns.split(' ').length;
      var heading=gallery.querySelector('.section-head');
      var top=parseFloat(getComputedStyle(gallery).paddingTop)+heading.getBoundingClientRect().height+parseFloat(getComputedStyle(heading).marginBottom);
      var rowHeight=card.getBoundingClientRect().height+(parseFloat(gridStyle.rowGap)||0);
      var rows=Math.max(1,Math.ceil((window.innerHeight-top)/Math.max(1,rowHeight)));
      // Bound the screenful on unusually tall windows; keep the rest lazy.
      var limit=Math.min(18,columns*rows);
      Array.prototype.slice.call(section.querySelectorAll('.preview img'),0,limit).forEach(function(image){
        image.fetchPriority=priority;
        image.loading='eager';

      });
    }

    function warmCategory(link){
      var section=sections.find(function(section){return section.id===link.dataset.category;});
      if(!section||section.id===activeSectionId){return;}
      // Category intent is stronger than incidental card hover; avoid queuing
      // these small thumbnails behind the current category's offscreen images.
      prepareCategoryImages(section,'high');
    }

    var intentTimer=0;
    var restoringGalleryFocus=false;
    function prepareIntent(target){
      if(dialog.open||restoringGalleryFocus||!allowSpeculation()){return;}
      if(target.matches('.category-nav a')){warmCategory(target);}
      else{var index=previews.indexOf(target);if(index>=0){warmScreenshot(index,'low');}}
    }
    [gallery,document.querySelector('.category-nav')].forEach(function(root){
      function targetOf(event){return event.target.closest('.preview,.category-nav a');}
      root.addEventListener('pointerover',function(event){
        var target=targetOf(event);
        if(event.pointerType!=='mouse'||!target||target.contains(event.relatedTarget)){return;}
        clearTimeout(intentTimer);
        intentTimer=setTimeout(function(){prepareIntent(target);},target.matches('.category-nav a')?40:100);
      });
      root.addEventListener('pointerout',function(event){
        var target=targetOf(event);
        if(target&&!target.contains(event.relatedTarget)){clearTimeout(intentTimer);}
      });
      root.addEventListener('focusin',function(event){var target=targetOf(event);if(target){prepareIntent(target);}});
      root.addEventListener('pointerdown',function(event){
        clearTimeout(intentTimer);
        var target=targetOf(event);if(target){prepareIntent(target);}
      },{passive:true});
    });

    function drainPreloads(){
      nearbyImages.forEach(function(entry){
        if(entry.started||preloadWorkers>=2){return;}
        entry.started=true;
        preloadWorkers+=1;
        entry.image.src=entry.src;
        entry.image.decode().then(function(){entry.ready=true;},function(){}).finally(function(){
          preloadWorkers-=1;
          if(dialog.open&&!dialog.classList.contains('is-closing')){drainPreloads();}
        });
      });
    }

    function preloadWindow(index){
      var offsets=allowSpeculation()?[-1,1]:[];
      var keep=new Set(offsets.concat([0]).map(function(offset){return itemAt(index+offset).index;}));
      nearbyImages.forEach(function(entry,key){
        if(!keep.has(key)){entry.image.removeAttribute('src');nearbyImages.delete(key);}
      });
      offsets.forEach(function(offset){
        var item=itemAt(index+offset);
        if(nearbyImages.has(item.index)){return;}
        var image=new Image();
        image.decoding='async';
        image.crossOrigin='anonymous';
        image.fetchPriority='low';
        nearbyImages.set(item.index,{image:image,src:item.src,started:false,ready:false});
      });
      drainPreloads();
    }

    function clearPreloads(){
      nearbyImages.forEach(function(entry){entry.image.removeAttribute('src');});
      nearbyImages.clear();
    }

    function setActiveSource(index,frame){
      var nextFrame=frame||previews[index].querySelector('.screen');
      if(activeSourceFrame&&activeSourceFrame!==nextFrame){activeSourceFrame.classList.remove('is-shared-source');}
      activeSourceFrame=nextFrame;
      activeSourceIndex=index;
      if(activeSourceFrame){activeSourceFrame.classList.add('is-shared-source');}
    }

    function clearActiveSource(){
      if(activeSourceFrame){activeSourceFrame.classList.remove('is-shared-source');}
      activeSourceFrame=null;
      activeSourceIndex=-1;
    }

    function updateCounter(nextIndex){
      var direction=nextIndex>currentIndex?1:-1;
      if(currentIndex===previews.length-1&&nextIndex===0){direction=1;}
      if(currentIndex===0&&nextIndex===previews.length-1){direction=-1;}
      renderCounter(count,nextIndex+1,previews.length,{trend:direction,animated:dialog.open&&!dialog.classList.contains('is-closing')});
    }

    function render(index,options){
      options=options||{};
      sharpToken+=1;
      placeholder.hidden=true;
      placeholder.classList.remove('is-visible');
      var item=itemAt(index);
      var previous=itemAt(item.index-1);
      var next=itemAt(item.index+1);
      if(dialog.open&&item.index!==activeSourceIndex){setActiveSource(item.index);}
      updateCounter(item.index);
      currentIndex=item.index;
      title.textContent=item.site;
      category.textContent=item.category;
      downloadLink.href=item.originalSrc;
      downloadLink.setAttribute('download',item.originalSrc.split('/').pop()||'screenshot.png');
      liveLink.href=item.live;
      liveLink.setAttribute('aria-label','View '+item.site+' live page in a new tab');
      previousButton.setAttribute('aria-label','Previous screenshot: '+previous.site);
      nextButton.setAttribute('aria-label','Next screenshot: '+next.site);
      peekButton.setAttribute('aria-label','Next screenshot: '+next.site);
      peekImage.src=cardSource(next.preview);
      previousPeekButton.setAttribute('aria-label','Previous screenshot: '+previous.site);
      previousPeekImage.src=cardSource(previous.preview);
      window.clearTimeout(copyResetTimer);
      copyButton.textContent='Copy image';
      copyButton.disabled=true;
      viewerImage.classList.add('is-loading');
      status.textContent='';
      announcement.textContent='';
      viewerImage.onload=function(){viewerImage.classList.remove('is-loading');copyButton.disabled=viewerImage.src!==item.src;status.textContent='';announcement.textContent=item.site+' — '+item.category+', '+String(item.index+1)+' of '+String(previews.length);};
      viewerImage.onerror=function(){viewerImage.classList.remove('is-loading');status.textContent='Screenshot could not be loaded';announcement.textContent=item.site+' screenshot could not be loaded';};
      viewerImage.alt=item.alt;
      var cached=nearbyImages.get(item.index);
      var initial=options.imageSrc||(cached&&cached.ready?item.src:cardSource(item.preview));
      placeholder.src=initial;
      // Only an actual tiny placeholder is blurred. Never blur a loaded thumbnail.
      placeholder.hidden=initial!==item.placeholder;
      placeholder.classList.toggle('is-visible',!placeholder.hidden);
      viewerImage.src=initial;
      if(viewerImage.complete&&viewerImage.naturalWidth){viewerImage.classList.remove('is-loading');copyButton.disabled=viewerImage.src!==item.src;status.textContent='';}
    }

    async function moveViewer(delta){
      if(!dialog.open||dialog.classList.contains('is-closing')){return;}
      if(!delta){return;}
      var destination=itemAt((requestedIndex<0?currentIndex:requestedIndex)+delta);
      requestedIndex=destination.index;
      var reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(reduceMotion){interruptOpening();clearNavigation();dialog.classList.remove('has-navigation-layers');render(destination.index);scheduleSharpImage(destination.index,openTransitionToken);requestedIndex=-1;dialog.classList.add('is-peek-ready');return;}
      var token=++navigationToken;
      dialog.classList.add('is-switching');
      // Reverse or redirect using a bitmap already on screen. Re-decoding the
      // full-size file here lets the old slide finish before input takes effect.
      var readyImage=navigationLayers.find(function(image){return Number(image.dataset.index)===destination.index;});
      var cached=nearbyImages.get(destination.index);
      if(!readyImage&&cached&&cached.ready){readyImage=cached.image;}
      if(!readyImage&&destination.index===itemAt(currentIndex+1).index){readyImage=peekImage;}
      if(!readyImage&&destination.index===itemAt(currentIndex-1).index){readyImage=previousPeekImage;}
      if(!readyImage||!readyImage.complete||!readyImage.naturalWidth){readyImage=destination.preview.querySelector('img');}
      var navigationSrc=readyImage&&readyImage.complete&&readyImage.naturalWidth?(readyImage.currentSrc||readyImage.src):cardSource(destination.preview);
      if(!readyImage||!readyImage.complete||!readyImage.naturalWidth){
        navigationLayers.forEach(function(image){image.getAnimations().forEach(function(animation){animation.pause();});});
        var decoded=new Image();
        decoded.crossOrigin='anonymous';
        decoded.src=navigationSrc;
        try{await decoded.decode();}catch(error){
          if(token===navigationToken){clearNavigation();dialog.classList.remove('has-navigation-layers');requestedIndex=-1;status.textContent='Screenshot could not be loaded';}
          return;
        }
      }
      if(token!==navigationToken||!dialog.open){return;}
      var openingRect=interruptOpening();
      var primaryRect=viewerImage.getBoundingClientRect();
      var peekRect=peekImage.getBoundingClientRect();
      var previousPeekRect=previousPeekImage.getBoundingClientRect();
      var stageRect=stage.getBoundingClientRect();
      var outgoingSrc=viewerImage.currentSrc||viewerImage.src;
      var oldPeekSrc=peekImage.currentSrc||peekImage.src;
      var direction=delta>0?1:-1;
      var travel=peekRect.left-primaryRect.left;
      // Sample the painted positions before cancelling: a reversal reuses the
      // same screenshots wherever they are, without waiting for them to land.
      var snapshots=navigationLayers.length?navigationLayers.map(function(image){
        return {src:image.src,index:Number(image.dataset.index),rect:image.getBoundingClientRect(),opacity:Number(getComputedStyle(image).opacity)};
      }):[
        {src:outgoingSrc,index:currentIndex,rect:openingRect||primaryRect,opacity:1},
        {src:oldPeekSrc,index:itemAt(currentIndex+1).index,rect:peekRect,opacity:.58},
        {src:previousPeekImage.currentSrc||previousPeekImage.src,index:itemAt(currentIndex-1).index,rect:previousPeekRect,opacity:.58}
      ];
      navigationLayers.forEach(function(image){image.getAnimations().forEach(function(animation){animation.cancel();});image.remove();});
      navigationLayers=[];
      function shifted(rect,x){return {left:rect.left+x,top:rect.top,width:rect.width,height:rect.height};}
      function layer(src,from,to,fromOpacity,toOpacity,index){
        var image=document.createElement('img');
        image.crossOrigin='anonymous';
        image.className='lightbox-slide';
        image.dataset.index=String(index);
        image.alt='';
        image.src=src;
        image.style.filter=src===itemAt(index).placeholder?'blur(12px)':'none';
        image.style.left=(to.left-stageRect.left+stage.scrollLeft)+'px';
        image.style.top=(to.top-stageRect.top+stage.scrollTop)+'px';
        image.style.width=to.width+'px';
        image.style.height=to.height+'px';
        stage.appendChild(image);
        navigationLayers.push(image);
        var animation=image.animate([
          {transform:'translate('+ (from.left-to.left)+'px,'+(from.top-to.top)+'px) scale('+(from.width/to.width)+','+(from.height/to.height)+')',opacity:fromOpacity},
          {transform:'translate(0,0) scale(1,1)',opacity:toOpacity}
        ],{duration:280,easing:'cubic-bezier(.2,0,0,1)',fill:'both'});
        return {image:image,animation:animation};
      }
      render(destination.index,{imageSrc:navigationSrc});
      var targetRect=viewerImage.getBoundingClientRect();
      var visibleDestination=snapshots.find(function(snapshot){return snapshot.index===destination.index;});
      var nextIndex=itemAt(destination.index+1).index;
      var previousIndex=itemAt(destination.index-1).index;
      snapshots.forEach(function(snapshot){
        if(snapshot===visibleDestination){return;}
        var becomesPeek=snapshot.index===nextIndex||snapshot.index===previousIndex;
        var target=snapshot.index===nextIndex?peekRect:snapshot.index===previousIndex?previousPeekRect:shifted(snapshot.rect,direction>0?-stageRect.width:stageRect.width);
        layer(snapshot.src,snapshot.rect,target,snapshot.opacity,becomesPeek?.58:snapshot.opacity,snapshot.index);
      });
      var entry=direction>0?shifted(targetRect,Math.max(travel,...snapshots.map(function(snapshot){return snapshot.rect.right-targetRect.left+16;}))):shifted(targetRect,-travel);
      var incoming=layer(navigationSrc,visibleDestination?visibleDestination.rect:entry,targetRect,visibleDestination?visibleDestination.opacity:1,1,destination.index);
      navigationIncoming=incoming.image;
      dialog.classList.add('has-navigation-layers');
      incoming.animation.onfinish=function(){
        if(token!==navigationToken){return;}
        requestedIndex=-1;
        dialog.classList.remove('has-navigation-layers');
        clearNavigation();
        scheduleSharpImage(destination.index,openTransitionToken);
        requestAnimationFrame(function(){
          if(!dialog.open||dialog.classList.contains('is-closing')){return;}
          dialog.classList.add('is-peek-ready');
        });
      };
    }

    function scheduleSharpImage(index,token){
      var item=itemAt(index);
      var request=++sharpToken;
      var cached=nearbyImages.get(item.index);
      var sharpImage=cached&&cached.started?cached.image:new Image();
      sharpImage.decoding='async';
      sharpImage.crossOrigin='anonymous';
      sharpImage.fetchPriority='high';
      if(sharpImage.src!==item.src){sharpImage.src=item.src;}
      var isCurrent=function(){return request===sharpToken&&token===openTransitionToken&&dialog.open&&!dialog.classList.contains('is-closing')&&currentIndex===item.index;};
      sharpImage.decode().then(async function(){
        if(!isCurrent()){return;}
        // Paint the decoded element itself; assigning a new src can clear the
        // displayed bitmap for a frame even when another Image already decoded it.
        sharpImage.className='lightbox-image';
        sharpImage.alt=item.alt;
        sharpImage.width=1440;
        sharpImage.height=900;
        viewerImage.replaceWith(sharpImage);
        viewerImage=sharpImage;
        nearbyImages.delete(item.index);
          placeholder.classList.remove('is-visible');
        viewerImage.classList.remove('is-loading');
        copyButton.disabled=false;
        status.textContent='';
        preloadWindow(item.index);
      },function(){
        if(isCurrent()){
          status.textContent='Full screenshot could not load. Showing preview.';
          announcement.textContent=status.textContent;
        }
      });
    }

    async function finishOpenTransition(token,transitionImage,index){
      // Keep the landed proxy painted until the actual display element has
      // decoded its asset, including on a cold cache or a fast reopen.
      if(transitionImage&&typeof viewerImage.decode==='function'){
        try{await viewerImage.decode();}catch(error){}
      }
      if(token!==openTransitionToken){
        if(transitionImage){transitionImage.remove();}
        return;
      }
      dialog.classList.add('is-open-handoff');
      dialog.classList.remove('is-opening');
      // Decode is not a paint. Leave the landed proxy covering the viewer
      // for a complete frame after making the viewer visible.
      await new Promise(function(resolve){requestAnimationFrame(function(){requestAnimationFrame(resolve);});});
      if(token!==openTransitionToken||!dialog.open||dialog.classList.contains('is-closing')){
        if(transitionImage){transitionImage.remove();}
        return;
      }
      if(transitionImage){transitionImage.remove();}
      openTransitionImage=null;
      dialog.classList.remove('is-open-handoff');
      dialog.classList.add('is-peek-ready');
      if(dialog.open){
        closeButton.focus();
        scheduleSharpImage(index,token);
      }
    }

    async function openViewer(index,trigger){
      clearTimeout(intentTimer);
      // Fetch and decode during the opening animation; promotion stays atomic.
      warmScreenshot(index,'high');
      window.clearTimeout(closeAnimationTimer);
      dialog.classList.remove('is-closing','is-peek-ready');
      returnFocus=trigger;
      var sourceImage=trigger.querySelector('img');
      var sourceFrame=trigger.querySelector('.screen')||sourceImage;
      var sourceRect=sourceFrame?sourceFrame.getBoundingClientRect():null;
      var reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var canAnimate=sourceImage&&sourceFrame&&sourceRect&&sourceRect.width&&sourceRect.height&&!reduceMotion&&typeof sourceFrame.animate==='function';
      var token=++openTransitionToken;
      var sourceUrl=cardSource(trigger);
      var transitionImage=null;
      if(canAnimate){
        transitionImage=sourceFrame.cloneNode(true);
        var transitionMedia=transitionImage.querySelector('img');
        transitionImage.className='lightbox-transition-frame';
        transitionImage.setAttribute('aria-hidden','true');
        if(transitionMedia){
          transitionMedia.alt='';
          transitionMedia.removeAttribute('loading');
          transitionMedia.decoding='sync';
          transitionMedia.removeAttribute('srcset');
          transitionMedia.removeAttribute('sizes');
          transitionMedia.src=sourceUrl;
          transitionMedia.style.opacity='1';
          transitionMedia.style.filter=sourceUrl===trigger.dataset.placeholder?'blur(12px)':'none';
        }
        // A cloned cached image still needs its own decode before its first paint.
        // Keep the original card visible until the moving copy is ready.
        try{await transitionMedia.decode();}catch(error){canAnimate=false;transitionImage=null;}
        if(token!==openTransitionToken){return;}
        sourceRect=sourceFrame.getBoundingClientRect();
      }
      render(index,{imageSrc:sourceUrl});
      setActiveSource(index,sourceFrame);
      if(!dialog.open){
        viewerPageOverflow=document.body.style.overflow;
        document.body.style.overflow='hidden';
        dialog.show();
        setViewerBackground(true);
      }
      dialog.focus({preventScroll:true});
      document.body.getBoundingClientRect();
      document.body.classList.add('lightbox-page-shift');
      if(!canAnimate){finishOpenTransition(token,null,index);return;}
      var dialogRect=dialog.getBoundingClientRect();
      var targetRect=viewerImage.getBoundingClientRect();
      if(!targetRect.width||!targetRect.height){finishOpenTransition(token,null,index);return;}
      transitionImage.style.left=(targetRect.left-dialogRect.left)+'px';
      transitionImage.style.top=(targetRect.top-dialogRect.top)+'px';
      transitionImage.style.width=targetRect.width+'px';
      transitionImage.style.height=targetRect.height+'px';
      var offsetX=sourceRect.left-targetRect.left;
      var offsetY=sourceRect.top-targetRect.top;
      var scaleX=sourceRect.width/targetRect.width;
      var scaleY=sourceRect.height/targetRect.height;
      var invertedTransform='translate3d('+offsetX+'px,'+offsetY+'px,0) scale('+scaleX+','+scaleY+')';
      transitionImage.style.transform=invertedTransform;
      dialog.appendChild(transitionImage);
      openTransitionImage=transitionImage;
      transitionImage.getBoundingClientRect();
      dialog.classList.add('is-opening');
      var animation=transitionImage.animate([
        {transform:invertedTransform},
        {transform:'translate3d(0,0,0) scale(1,1)'}
      ],{duration:280,easing:'cubic-bezier(.2,0,0,1)',fill:'forwards'});
      animation.onfinish=function(){finishOpenTransition(token,transitionImage,index);};
      animation.oncancel=function(){finishOpenTransition(token,transitionImage,index);};
    }

    function revealCurrentCard(){
      var preview=previews[currentIndex];
      if(!preview){return;}
      if(!returnFocus||!sidebar.contains(returnFocus)){returnFocus=preview;}
      var card=preview.closest('.card')||preview;
      var rect=card.getBoundingClientRect();
      var inset=16;
      var delta=0;
      if(rect.top<inset||rect.height>window.innerHeight-inset*2){delta=rect.top-inset;}
      else if(rect.bottom>window.innerHeight-inset){delta=rect.bottom-window.innerHeight+inset;}
      // Scroll the gallery before measuring the reverse animation's destination.
      // Explicit instant behavior overrides the page's smooth anchor scrolling.
      if(delta){window.scrollBy({top:delta,left:0,behavior:'instant'});}
    }

    function closeViewer(){
      if(!dialog.open||dialog.classList.contains('is-closing')){return;}
      clearPreloads();
      var movingRect=navigationIncoming?navigationIncoming.getBoundingClientRect():interruptOpening();
      requestedIndex=-1;
      clearNavigation();
      dialog.classList.remove('has-navigation-layers');
      var reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      revealCurrentCard();
      var sourceFrame=activeSourceFrame;
      var sourceRect=sourceFrame?sourceFrame.getBoundingClientRect():null;
      var targetRect=movingRect||viewerImage.getBoundingClientRect();
      var content=document.querySelector('.content');
      var contentTransform=getComputedStyle(content).transform;
      var contentShift=contentTransform&&contentTransform!=='none'?new DOMMatrix(contentTransform).m41:0;
      var canAnimate=sourceFrame&&sourceRect&&sourceRect.width&&sourceRect.height&&targetRect.width&&targetRect.height&&!reduceMotion&&typeof sourceFrame.animate==='function';
      if(!canAnimate){document.body.classList.remove('lightbox-page-shift');clearActiveSource();dialog.close();return;}
      var token=++openTransitionToken;
      var dialogRect=dialog.getBoundingClientRect();
      var transitionImage=sourceFrame.cloneNode(true);
      var transitionMedia=transitionImage.querySelector('img');
      transitionImage.className='lightbox-transition-frame';
      transitionImage.setAttribute('aria-hidden','true');
      if(transitionMedia){
        transitionMedia.alt='';
        transitionMedia.removeAttribute('loading');
        transitionMedia.decoding='sync';
        transitionMedia.removeAttribute('srcset');
        transitionMedia.removeAttribute('sizes');
        transitionMedia.src=viewerImage.currentSrc||viewerImage.src;
        transitionMedia.style.opacity='1';
        transitionMedia.style.filter=transitionMedia.src===itemAt(currentIndex).placeholder?'blur(12px)':'none';
      }
      transitionImage.style.left=(targetRect.left-dialogRect.left)+'px';
      transitionImage.style.top=(targetRect.top-dialogRect.top)+'px';
      transitionImage.style.width=targetRect.width+'px';
      transitionImage.style.height=targetRect.height+'px';
      dialog.appendChild(transitionImage);
      openTransitionImage=transitionImage;
      transitionImage.getBoundingClientRect();
      dialog.classList.remove('is-opening','is-open-handoff');
      dialog.classList.remove('is-peek-ready');
      dialog.classList.add('is-closing');
      document.body.classList.remove('lightbox-page-shift');
      var destinationX=sourceRect.left-contentShift-targetRect.left;
      var destinationY=sourceRect.top-targetRect.top;
      var destinationTransform='translate3d('+destinationX+'px,'+destinationY+'px,0) scale('+(sourceRect.width/targetRect.width)+','+(sourceRect.height/targetRect.height)+')';
      var animation=transitionImage.animate([
        {transform:'translate3d(0,0,0) scale(1,1)'},
        {transform:destinationTransform}
      ],{duration:280,easing:'cubic-bezier(.2,0,0,1)',fill:'forwards'});
      var finish=function(){
        if(token!==openTransitionToken){if(transitionImage){transitionImage.remove();}return;}
        window.clearTimeout(closeAnimationTimer);
        // The close event is queued by the browser. Restore the gallery in
        // this paint, before removing the dialog and its last visible image.
        clearActiveSource();
        if(dialog.open){dialog.close();}
      };
      animation.onfinish=finish;
      animation.oncancel=finish;
      closeAnimationTimer=window.setTimeout(function(){
        clearActiveSource();
        if(dialog.open){dialog.close();}
      },400);
    }

    gallery.addEventListener('click',function(event){
      var preview=event.target.closest('.preview');
      if(!preview||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey){return;}
      event.preventDefault();
      openViewer(previews.indexOf(preview),preview);
    });

    previousButton.addEventListener('click',function(){moveViewer(-1);});
    nextButton.addEventListener('click',function(){moveViewer(1);});
    peekButton.addEventListener('click',function(){moveViewer(1);});
    previousPeekButton.addEventListener('click',function(){moveViewer(-1);});
    closeButton.addEventListener('click',closeViewer);
    copyButton.addEventListener('click',async function(){
      if(copyButton.disabled||!viewerImage.naturalWidth){return;}
      window.clearTimeout(copyResetTimer);
      copyButton.disabled=true;
      copyButton.textContent='Copying…';
      try{
        if(!navigator.clipboard||typeof navigator.clipboard.write!=='function'||typeof ClipboardItem==='undefined'){
          throw new Error('Image clipboard is not supported');
        }
        var canvas=document.createElement('canvas');
        canvas.width=viewerImage.naturalWidth;
        canvas.height=viewerImage.naturalHeight;
        var context=canvas.getContext('2d');
        context.drawImage(viewerImage,0,0,canvas.width,canvas.height);
        var blob=await new Promise(function(resolve,reject){
          canvas.toBlob(function(result){
            if(result){resolve(result);}else{reject(new Error('Could not create image data'));}
          },'image/png');
        });
        await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
        copyButton.textContent='Copied';
        announcement.textContent='Screenshot copied to clipboard';
      }catch(error){
        copyButton.textContent='Copy failed';
        announcement.textContent='Screenshot could not be copied to the clipboard';
      }
      copyButton.disabled=false;
      copyResetTimer=window.setTimeout(function(){
        copyButton.textContent='Copy image';
        copyButton.disabled=!viewerImage.naturalWidth;
      },1500);
    });
    dialog.addEventListener('close',function(){
      setViewerBackground(false);
      document.body.style.overflow=viewerPageOverflow;
      clearPreloads();
      requestedIndex=-1;
      clearNavigation();
      dialog.classList.remove('has-navigation-layers');
      window.clearTimeout(closeAnimationTimer);
      openTransitionToken+=1;
      dialog.classList.remove('is-opening','is-closing','is-open-handoff','is-peek-ready');
      document.body.classList.remove('lightbox-page-shift');
      if(openTransitionImage){openTransitionImage.remove();openTransitionImage=null;}
      clearActiveSource();
      restoringGalleryFocus=true;
      if(returnFocus){returnFocus.focus({preventScroll:true});}
      restoringGalleryFocus=false;
      selectCategory(categoryFromURL(),true);
    });
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape'&&dialog.open&&(!document.querySelector('.signup-overlay')||document.querySelector('.signup-overlay').hidden)){event.preventDefault();closeViewer();}
    });
    dialog.addEventListener('cancel',function(event){
      event.preventDefault();
      closeViewer();
    });
    dialog.addEventListener('keydown',function(event){
      if(event.key==='ArrowLeft'){event.preventDefault();moveViewer(-1);}
      if(event.key==='ArrowRight'){event.preventDefault();moveViewer(1);}
      if(event.key==='Home'){event.preventDefault();moveViewer(-(requestedIndex<0?currentIndex:requestedIndex));}
      if(event.key==='End'){event.preventDefault();moveViewer(previews.length-1-(requestedIndex<0?currentIndex:requestedIndex));}
    });
    stage.addEventListener('click',function(event){
      if(event.target.closest('.lightbox-image,.lightbox-peek-button,.lightbox-nav')){return;}
      closeViewer();
    });
    stage.addEventListener('pointerdown',function(event){
      if(event.pointerType!=='mouse'){pointerStartX=event.clientX;}
    });
    stage.addEventListener('pointerup',function(event){
      if(pointerStartX===null){return;}
      var distance=event.clientX-pointerStartX;
      pointerStartX=null;
      if(Math.abs(distance)<55){return;}
      moveViewer(distance<0?1:-1);
    });
    stage.addEventListener('pointercancel',function(){pointerStartX=null;});

    return {close: closeViewer};
}
