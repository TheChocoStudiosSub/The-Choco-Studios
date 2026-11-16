const panels=[...document.querySelectorAll("[data-panel]")];
const links=[...document.querySelectorAll("[data-panel-link]")];
const year=document.querySelector("#year");
const footerYear=document.querySelector("#footer-year");
const currentYear=new Date().getFullYear();
if(year)year.textContent=currentYear;
if(footerYear)footerYear.textContent=currentYear;
const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const loader=document.querySelector("#luxury-loader");
const loaderStarted=performance.now();

function dismissLoader(){
 if(!loader||loader.classList.contains("is-dismissed"))return;
 const minimum=reducedMotion?180:1050;
 window.setTimeout(()=>{
  loader.classList.add("is-dismissed");
  loader.setAttribute("aria-hidden","true");
  window.setTimeout(()=>loader.remove(),950);
 },Math.max(0,minimum-(performance.now()-loaderStarted)));
}
if(document.readyState==="complete")dismissLoader();
else window.addEventListener("load",dismissLoader,{once:true});
window.setTimeout(dismissLoader,3200);

function revealPanel(panel){
 if(!panel)return;
 panel.classList.remove("is-entered");
 void panel.offsetWidth;
 requestAnimationFrame(()=>{
  panel.classList.add("is-entered");
  if(panel.matches(".hero")){
   document.documentElement.classList.add("motion-ready");
   panel.classList.add("motion-armed");
  }
  const animated=panel.querySelectorAll(".statement,.founder-portrait,.founder-copy,.work-index-row,.principles-list article,.footer-links a");
  animated.forEach((item,index)=>{
   item.style.setProperty("--reveal-order",String(index));
   item.classList.remove("is-revealed");
   requestAnimationFrame(()=>item.classList.add("is-revealed"));
  });
 });
}

function activatePanel(id,options={}){
 const target=panels.find(panel=>panel.dataset.panel===id);
 if(!target)return;
 panels.forEach(panel=>{
  const active=panel===target;
  panel.classList.toggle("is-active",active);
  panel.setAttribute("aria-hidden",String(!active));
  if("inert" in panel)panel.inert=!active;
 });
 links.forEach(link=>{
  const active=link.dataset.panelLink===id;
  link.classList.toggle("is-current",active);
  if(active)link.setAttribute("aria-current","page");
  else link.removeAttribute("aria-current");
 });
 if(options.updateHash!==false&&location.hash!=="#"+id)history.replaceState(null,"","#"+id);
 if(options.scroll!==false)window.scrollTo({top:0,behavior:reducedMotion?"auto":"smooth"});
 revealPanel(target);
 if(options.focus){
  target.setAttribute("tabindex","-1");
  target.focus({preventScroll:true});
 }
}
function navigatePanel(id,focus=false){
 if(panels.some(panel=>panel.dataset.panel===id))activatePanel(id,{focus});
}
links.forEach(link=>link.addEventListener("click",event=>{
 event.preventDefault();
 navigatePanel(link.dataset.panelLink,true);
}));
document.querySelectorAll('a[href^="#"]').forEach(link=>{
 if(link.dataset.panelLink)return;
 link.addEventListener("click",event=>{
  const id=link.getAttribute("href").slice(1);
  if(panels.some(panel=>panel.dataset.panel===id)){
   event.preventDefault();
   navigatePanel(id,true);
  }
 });
});
const initial=location.hash.slice(1);
activatePanel(panels.some(panel=>panel.dataset.panel===initial)?initial:"home",{updateHash:false,scroll:false});

document.addEventListener("keydown",event=>{
 if(event.altKey||event.ctrlKey||event.metaKey)return;
 if(event.key!=="ArrowDown"&&event.key!=="ArrowUp")return;
 const active=document.activeElement;
 if(active?.tagName==="INPUT"||active?.tagName==="TEXTAREA"||active?.isContentEditable)return;
 const current=links.findIndex(link=>link.classList.contains("is-current"));
 if(current<0)return;
 event.preventDefault();
 const next=(current+(event.key==="ArrowDown"?1:-1)+links.length)%links.length;
 links[next].focus();
});

const workIndex=document.querySelector("#work .work-index");
const workPreview=document.querySelector("#work .work-preview");
if(workIndex&&workPreview&&!reducedMotion&&window.matchMedia("(hover: hover) and (pointer: fine)").matches){
 const previewImage=workPreview.querySelector("img");
 const rows=[...workIndex.querySelectorAll(".work-index-row[data-preview]")];
 let pointerX=0,pointerY=0,renderX=0,renderY=0,rafId=0,showTimer=0,hideTimer=0,active=false;
 const animatePreview=()=>{
  if(!active){rafId=0;return;}
  renderX+=(pointerX-renderX)*.09;
  renderY+=(pointerY-renderY)*.09;
  workPreview.style.transform="translate3d("+renderX+"px,"+renderY+"px,0)";
  rafId=requestAnimationFrame(animatePreview);
 };
 const startFrame=()=>{
  if(!rafId){renderX=pointerX;renderY=pointerY;rafId=requestAnimationFrame(animatePreview);}
 };
 const enterRow=row=>{
  clearTimeout(showTimer);clearTimeout(hideTimer);
  previewImage.src=row.dataset.preview;
  previewImage.alt=row.dataset.previewAlt||"";
  workPreview.classList.remove("is-leaving");
  showTimer=setTimeout(()=>{
   active=true;
   workPreview.classList.add("is-visible");
   startFrame();
  },140);
 };
 const leaveRow=()=>{
  clearTimeout(showTimer);
  active=false;
  workPreview.classList.remove("is-visible");
  workPreview.classList.add("is-leaving");
  hideTimer=setTimeout(()=>{
   workPreview.classList.remove("is-leaving");
   previewImage.removeAttribute("src");
   if(rafId){cancelAnimationFrame(rafId);rafId=0;}
  },900);
 };
 rows.forEach(row=>{
  row.addEventListener("pointerenter",event=>{pointerX=event.clientX+28;pointerY=event.clientY+24;enterRow(row);});
  row.addEventListener("pointermove",event=>{pointerX=event.clientX+28;pointerY=event.clientY+24;if(active&&!rafId)startFrame();});
  row.addEventListener("pointerleave",leaveRow);
  row.addEventListener("focus",()=>enterRow(row));
  row.addEventListener("blur",leaveRow);
 });
}
