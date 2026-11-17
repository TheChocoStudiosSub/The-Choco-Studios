const panels=[...document.querySelectorAll("#home > [data-panel]")];
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

function setActivePanel(id){
 panels.forEach(panel=>panel.classList.toggle("is-active",panel.dataset.panel===id));
 links.forEach(link=>{
  const active=link.dataset.panelLink===id;
  link.classList.toggle("is-current",active);
  if(active)link.setAttribute("aria-current","page");
  else link.removeAttribute("aria-current");
 });
}

function updateActivePanel(){
 if(!panels.length)return;
 const marker=Math.max(1,Math.min(window.innerHeight*.42,window.innerHeight-1));
 let current=panels.find(panel=>{
  const rect=panel.getBoundingClientRect();
  return rect.top<=marker&&rect.bottom>marker;
 });
 if(!current){
  current=panels.reduce((nearest,panel)=>{
   const distance=Math.abs(panel.getBoundingClientRect().top-marker);
   return distance<nearest.distance?{panel,distance}:nearest;
  },{panel:panels[0],distance:Infinity}).panel;
 }
 setActivePanel(current.dataset.panel);
}

let scrollUpdatePending=false;
function scheduleActivePanelUpdate(){
 if(scrollUpdatePending)return;
 scrollUpdatePending=true;
 requestAnimationFrame(()=>{
  scrollUpdatePending=false;
  updateActivePanel();
 });
}
window.addEventListener("scroll",scheduleActivePanelUpdate,{passive:true});
window.addEventListener("resize",scheduleActivePanelUpdate,{passive:true});

if("IntersectionObserver" in window){
 const revealObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
   if(!entry.isIntersecting)return;
   revealPanel(entry.target);
   revealObserver.unobserve(entry.target);
  });
 },{threshold:.12});
 panels.forEach(panel=>revealObserver.observe(panel));
}else{
 panels.forEach(revealPanel);
}

function navigateToPanel(id){
 const target=id==="home"
  ?document.querySelector("#home")
  :panels.find(panel=>panel.id===id||panel.dataset.panel===id);
 if(!target)return false;
 history.replaceState(null,"","#"+id);
 target.scrollIntoView({behavior:reducedMotion?"auto":"smooth",block:"start"});
 return true;
}

links.forEach(link=>link.addEventListener("click",event=>{
 event.preventDefault();
 navigateToPanel(link.dataset.panelLink);
}));

document.querySelectorAll('a[href^="#"]:not([data-panel-link])').forEach(link=>{
 link.addEventListener("click",event=>{
  const id=link.getAttribute("href").slice(1);
  if(navigateToPanel(id))event.preventDefault();
 });
});

const initialId=decodeURIComponent(location.hash.slice(1));
if(initialId&&navigateToPanelOnLoad(initialId)){
 requestAnimationFrame(()=>scheduleActivePanelUpdate());
}else{
 requestAnimationFrame(updateActivePanel);
}

function navigateToPanelOnLoad(id){
 const target=id==="home"
  ?document.querySelector("#home")
  :panels.find(panel=>panel.id===id||panel.dataset.panel===id);
 if(!target)return false;
 requestAnimationFrame(()=>target.scrollIntoView({behavior:"auto",block:"start"}));
 return true;
}

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
