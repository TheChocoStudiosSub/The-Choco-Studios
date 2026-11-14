const panels=[...document.querySelectorAll("[data-panel]")];
const links=[...document.querySelectorAll("[data-panel-link]")];
const year=document.querySelector("#year");
if(year) year.textContent=new Date().getFullYear();
const footerYear=document.querySelector("#footer-year");
if(footerYear) footerYear.textContent=new Date().getFullYear();
function activatePanel(id,{updateHash=true,focus=false}={}){
 const target=panels.find(panel=>panel.dataset.panel===id);if(!target)return;
 panels.forEach(panel=>{const active=panel===target;panel.classList.toggle("is-active",active);panel.setAttribute("aria-hidden",String(!active));if("inert" in panel)panel.inert=!active;});
 links.forEach(link=>{const active=link.dataset.panelLink===id;link.classList.toggle("is-current",active);if(active)link.setAttribute("aria-current","page");else link.removeAttribute("aria-current");});
 const home=document.querySelector("#home");
 if(home)home.scrollTop=0;
 if(updateHash&&location.hash!=="#"+id)history.replaceState(null,"","#"+id);
 if(focus){target.setAttribute("tabindex","-1");target.focus({preventScroll:true});}
}

function navigatePanel(id,{focus=false}={}){
 const targetIndex=panels.findIndex(panel=>panel.dataset.panel===id);
 if(targetIndex<0)return;
 activatePanel(id,{focus});
}

links.forEach(link=>link.addEventListener("click",event=>{event.preventDefault();void navigatePanel(link.dataset.panelLink,{focus:true});}));
document.querySelectorAll('a[href^="#"]').forEach(link=>{if(link.dataset.panelLink)return;link.addEventListener("click",event=>{const id=link.getAttribute("href").slice(1);if(panels.some(panel=>panel.dataset.panel===id)){event.preventDefault();void navigatePanel(id,{focus:true});}});});
const initial=location.hash.slice(1);activatePanel(panels.some(panel=>panel.dataset.panel===initial)?initial:"home",{updateHash:false});

const hero=document.querySelector(".hero[data-panel='home']");
if(hero){
 const home=document.querySelector("#home");
 const enterHero=()=>{
  if(hero.classList.contains("is-entered"))return;
  requestAnimationFrame(()=>{
   document.documentElement.classList.add("motion-ready");
   hero.classList.add("motion-armed");
   requestAnimationFrame(()=>hero.classList.add("is-entered"));
  });
 };
 if("IntersectionObserver" in window){
  const heroObserver=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){
    enterHero();
    heroObserver.disconnect();
   }
  },{root:home,threshold:.01});
  heroObserver.observe(hero);
 }else enterHero();
}

const statement=document.querySelector("#studio .statement");
if(statement){
 const reveal=()=>{
  if(statement.classList.contains("is-entered"))return;
  requestAnimationFrame(()=>statement.classList.add("is-entered"));
 };
 statement.classList.add("is-reveal-armed");
 if("IntersectionObserver" in window){
  const statementObserver=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){
    reveal();
    statementObserver.disconnect();
   }
  },{root:document.querySelector("#home"),threshold:.12});
  statementObserver.observe(statement);
 }else reveal();
}

document.addEventListener("keydown",event=>{if(event.altKey||event.ctrlKey||event.metaKey)return;const index=links.findIndex(link=>link.classList.contains("is-current"));const active=document.activeElement;if((event.key==="ArrowDown"||event.key==="ArrowUp")&&active?.tagName!=="INPUT"&&active?.tagName!=="TEXTAREA"){event.preventDefault();const next=(index+(event.key==="ArrowDown"?1:-1)+links.length)%links.length;links[next].focus();}if(event.key==="Enter"&&document.activeElement?.dataset?.panelLink)void navigatePanel(document.activeElement.dataset.panelLink,{focus:true});});

const workIndex=document.querySelector("#work .work-index");
const workPreview=document.querySelector("#work .work-preview");
if(workIndex&&workPreview&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches&&window.matchMedia("(hover: hover) and (pointer: fine)").matches){
 const previewImage=workPreview.querySelector("img");
 const rows=[...workIndex.querySelectorAll(".work-index-row[data-preview]")];
 let pointerX=0,pointerY=0,renderX=0,renderY=0,rafId=0,showTimer=0,hideTimer=0,active=false;
 const animatePreview=()=>{
  if(!active){rafId=0;return;}
  renderX+=(pointerX-renderX)*.08;
  renderY+=(pointerY-renderY)*.08;
  workPreview.style.transform=`translate3d(${renderX}px,${renderY}px,0)`;
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
  },120);
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
  row.addEventListener("pointerenter",event=>{
   pointerX=event.clientX+28;pointerY=event.clientY+24;
   enterRow(row);
  });
  row.addEventListener("pointermove",event=>{
   pointerX=event.clientX+28;pointerY=event.clientY+24;
   if(active&&!rafId)startFrame();
  });
  row.addEventListener("pointerleave",leaveRow);
  row.addEventListener("focus",()=>enterRow(row));
  row.addEventListener("blur",leaveRow);
 });
}
