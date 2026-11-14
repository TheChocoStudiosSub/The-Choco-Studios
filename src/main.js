const panels=[...document.querySelectorAll("[data-panel]")];
const links=[...document.querySelectorAll("[data-panel-link]")];
const year=document.querySelector("#year");
if(year) year.textContent=new Date().getFullYear();
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

document.addEventListener("keydown",event=>{if(event.altKey||event.ctrlKey||event.metaKey)return;const index=links.findIndex(link=>link.classList.contains("is-current"));const active=document.activeElement;if((event.key==="ArrowDown"||event.key==="ArrowUp")&&active?.tagName!=="INPUT"&&active?.tagName!=="TEXTAREA"){event.preventDefault();const next=(index+(event.key==="ArrowDown"?1:-1)+links.length)%links.length;links[next].focus();}if(event.key==="Enter"&&document.activeElement?.dataset?.panelLink)void navigatePanel(document.activeElement.dataset.panelLink,{focus:true});});