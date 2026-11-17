const panels=[...document.querySelectorAll("#home > [data-panel]")];
const ornamentDesigns={
 home:[
  ["orbital","orbital-home"],
  ["constellation","constellation-home"],
  ["crosshair","crosshair-home"],
  ["spark","spark-one"]
 ],
 studio:[
  ["coordinate-grid","grid-studio"],["orbital","orbital-studio"],
  ["orbital-reverse","orbital-reverse-studio"],["constellation","constellation-studio"],
  ["crosshair","crosshair-studio"],["spark","spark-one"]
 ],
 "founder-profile":[
  ["portrait-frame","portrait-frame-founder"],["orbital","orbital-founder"],
  ["orbital-reverse","orbital-reverse-founder"],["constellation","constellation-founder"],
  ["crosshair","crosshair-founder"]
 ],
 work:[
  ["index-grid","grid-work"],["orbital","orbital-work"],
  ["orbital-reverse","orbital-reverse-work"],["constellation","constellation-work"],
  ["crosshair","crosshair-work"]
 ],
 principles:[
  ["coordinate-grid","grid-principles"],["orbital","orbital-principles"],
  ["orbital-reverse","orbital-reverse-principles"],["constellation","constellation-principles"],
  ["crosshair","crosshair-principles"]
 ],
 footer:[
  ["portrait-frame","portrait-frame-footer"],["orbital","orbital-footer"],
  ["orbital-reverse","orbital-reverse-footer"],["constellation","constellation-footer"],
  ["crosshair","crosshair-footer"]
 ]
};
panels.forEach(panel=>{
 const panelId=panel.dataset.panel;
 if(panel.querySelector(":scope > .tcs-ornament-layer"))return;
 panel.querySelectorAll(":scope > .tcs-ornament").forEach(ornament=>ornament.remove());
 const layer=document.createElement("div");
 layer.className="tcs-ornament-layer tcs-ornament-layer--"+panelId;
 layer.setAttribute("aria-hidden","true");
 (ornamentDesigns[panelId]||ornamentDesigns.home).forEach(names=>{
  const ornament=document.createElement("span");
  ornament.className="tcs-ornament "+names.map(name=>"tcs-ornament--"+name).join(" ");
  layer.appendChild(ornament);
 });
 const meteorField=document.createElement("div");
 meteorField.className="tcs-meteor-field";
 meteorField.setAttribute("aria-hidden","true");
 layer.appendChild(meteorField);
 panel.appendChild(layer);
});
const links=[...document.querySelectorAll("[data-panel-link]")];
const year=document.querySelector("#year");
const footerYear=document.querySelector("#footer-year");
const currentYear=new Date().getFullYear();
if(year)year.textContent=currentYear;
if(footerYear)footerYear.textContent=currentYear;

const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Random meteor showers are generated only for the currently visible page. */
let meteorTimer=0;
let meteorPanel=null;
const randomBetween=(min,max)=>min+Math.random()*(max-min);
const randomInteger=(min,max)=>Math.floor(randomBetween(min,max+1));

function createMeteor(panel,delay){
 const field=panel.querySelector(".tcs-meteor-field");
 if(!field)return;
 const meteor=document.createElement("span");
 meteor.className="tcs-meteor";
 meteor.setAttribute("aria-hidden","true");
 const duration=randomInteger(2600,4200);
 const width=panel.clientWidth||window.innerWidth;
 const height=panel.clientHeight||window.innerHeight;
 meteor.style.left=randomBetween(-12,18)+"%";
 meteor.style.top=randomBetween(-14,13)+"%";
 const travelX=Math.round(width*randomBetween(1.0,1.22));
 const travelY=Math.round(height*randomBetween(1.0,1.22));
 meteor.style.setProperty("--meteor-x",travelX+"px");
 meteor.style.setProperty("--meteor-y",travelY+"px");
 meteor.style.setProperty("--meteor-early-x",Math.round(travelX*.44)+"px");
 meteor.style.setProperty("--meteor-early-y",Math.round(travelY*.44)+"px");
 meteor.style.setProperty("--meteor-mid-x",Math.round(travelX*.76)+"px");
 meteor.style.setProperty("--meteor-mid-y",Math.round(travelY*.76)+"px");
 meteor.style.setProperty("--meteor-late-x",Math.round(travelX*.9328)+"px");
 meteor.style.setProperty("--meteor-late-y",Math.round(travelY*.9328)+"px");
 meteor.style.setProperty("--meteor-angle",randomBetween(34,48)+"deg");
 meteor.style.setProperty("--meteor-length",randomBetween(57,189)+"px");
 meteor.style.setProperty("--meteor-thickness",randomBetween(.1,1.5)+"px");
 meteor.style.setProperty("--meteor-glow",randomBetween(.55,1)+"");
 meteor.style.animationDuration=duration+"ms";
 meteor.style.animationDelay=delay+"ms";
 field.appendChild(meteor);
 window.setTimeout(()=>meteor.remove(),duration+delay+220);
}

function launchMeteorShower(panel){
 if(reducedMotion||document.hidden||panel!==meteorPanel||!panel.classList.contains("is-active"))return;
 const count=randomInteger(1,5);
 let delay=0;
 for(let i=0;i<count;i++){
  delay+=i===0?randomInteger(0,260):randomInteger(90,320);
  createMeteor(panel,delay);
 }
 meteorTimer=window.setTimeout(
  ()=>launchMeteorShower(panel),
  randomInteger(4200,9800)
 );
}

function startMeteorScheduler(panel){
 window.clearTimeout(meteorTimer);
 meteorPanel=panel;
 if(reducedMotion||document.hidden)return;
 meteorTimer=window.setTimeout(
  ()=>launchMeteorShower(panel),
  randomInteger(1300,3900)
 );
}

document.addEventListener("visibilitychange",()=>{
 if(document.hidden)window.clearTimeout(meteorTimer);
 else if(meteorPanel?.classList.contains("is-active"))startMeteorScheduler(meteorPanel);
});

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
 if(!target)return false;

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

 if(options.updateHash!==false&&location.hash!=="#"+id){
  history.replaceState(null,"","#"+id);
 }

 if(options.scroll!==false){
  target.scrollTop=0;
 }

 revealPanel(target);
 startMeteorScheduler(target);

 if(options.focus){
  target.focus({preventScroll:true});
 }
 return true;
}

function navigatePanel(id,focus=true){
 return activatePanel(id,{focus});
}

panels.forEach(panel=>{
 if(!panel.hasAttribute("tabindex"))panel.setAttribute("tabindex","0");
});

links.forEach(link=>link.addEventListener("click",event=>{
 event.preventDefault();
 navigatePanel(link.dataset.panelLink,true);
}));

document.querySelectorAll('a[href^="#"]').forEach(link=>{
 if(link.dataset.panelLink)return;
 link.addEventListener("click",event=>{
  const id=link.getAttribute("href").slice(1);
  if(navigatePanel(id,true))event.preventDefault();
 });
});

const initial=decodeURIComponent(location.hash.slice(1));
activatePanel(panels.some(panel=>panel.dataset.panel===initial)?initial:"home",{
 updateHash:false,
 scroll:true,
 focus:false
});

window.addEventListener("hashchange",()=>{
 const id=decodeURIComponent(location.hash.slice(1));
 if(panels.some(panel=>panel.dataset.panel===id)){
  activatePanel(id,{updateHash:false,scroll:true,focus:false});
 }
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
