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
 panel.appendChild(layer);
});
const links=[...document.querySelectorAll("[data-panel-link]")];
const year=document.querySelector("#year");
const footerYear=document.querySelector("#footer-year");
const currentYear=new Date().getFullYear();
if(year)year.textContent=currentYear;
if(footerYear)footerYear.textContent=currentYear;

const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let spaceBackground = null;
let spaceBackgroundPromise = null;

function setSpaceBackground(active) {
 if(!active) {
  spaceBackground?.setActive(false);
  return;
 }
 if(spaceBackground) {
  spaceBackground.setActive(true);
  return;
 }
 if(spaceBackgroundPromise) return;

 spaceBackgroundPromise=import("./space-background.js")
  .then(({createSpaceBackground})=>{
   spaceBackground=createSpaceBackground();
   spaceBackground?.setActive(true);
  })
  .catch(error=>{
   console.error("TCS space background could not initialize:",error);
  });
}



/* Canvas meteor field: all meteors and stardust are painted on one responsive canvas. */
const meteorCanvas=document.createElement("canvas");
meteorCanvas.className="tcs-starfield-canvas";
meteorCanvas.setAttribute("aria-hidden","true");
const meteorContext=meteorCanvas.getContext("2d",{alpha:true});
let meteorTimer=0;
let meteorFrame=0;
let meteorPanel=null;
let meteorWidth=0;
let meteorHeight=0;
let meteorDpr=1;
let meteorLastFrame=0;
let meteorShower=[];
let meteorDust=[];
const randomBetween=(min,max)=>min+Math.random()*(max-min);
const randomInteger=(min,max)=>Math.floor(randomBetween(min,max+1));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function resizeMeteorCanvas(){
 if(!meteorContext||!meteorPanel||!meteorCanvas.isConnected)return;
 const bounds=meteorPanel.getBoundingClientRect();
 meteorWidth=Math.max(1,Math.round(bounds.width));
 meteorHeight=Math.max(1,window.innerHeight);
 meteorDpr=Math.min(window.devicePixelRatio||1,2);
 meteorCanvas.width=Math.round(meteorWidth*meteorDpr);
 meteorCanvas.height=Math.round(meteorHeight*meteorDpr);
 meteorCanvas.style.width="100%";
 meteorCanvas.style.height="100vh";
 meteorContext.setTransform(meteorDpr,0,0,meteorDpr,0,0);
 meteorContext.clearRect(0,0,meteorWidth,meteorHeight);
}

function createCanvasMeteor(delay=0){
 const angle=randomBetween(36,49)*Math.PI/180;
 const directionX=Math.cos(angle);
 const directionY=Math.sin(angle);
 const startX=randomBetween(-meteorWidth*.08,meteorWidth*.48);
 const startY=randomBetween(-meteorHeight*.2,meteorHeight*.12);
 const edgeX=(meteorWidth+startX+180)/directionX;
 const edgeY=(meteorHeight+startY+180)/directionY;
 const availableDistance=Math.min(edgeX,edgeY);
 const travelDistance=availableDistance*randomBetween(.68,.86);
 const duration=randomBetween(3500,5400);
 const speed=travelDistance/duration;
 return {
  x:startX,y:startY,startX,startY,
  vx:directionX*speed,vy:directionY*speed,
  angle,length:randomBetween(57,189),
  thickness:randomBetween(.55,1.25),
  headRadius:randomBetween(.7,1.45),
  glow:randomBetween(12,22),
  duration,bornAt:performance.now()+delay,
  elapsed:0,alpha:0,
  dustClock:0
 };
}

function launchMeteorShower(panel){
 if(reducedMotion||document.hidden||panel!==meteorPanel||!panel.classList.contains("is-active"))return;
 const count=randomInteger(1,5);
 let stagger=0;
 for(let i=0;i<count;i++){
  stagger+=i===0?randomInteger(0,180):randomInteger(110,390);
  meteorShower.push(createCanvasMeteor(stagger));
 }
 if(!meteorFrame){
  meteorLastFrame=performance.now();
  meteorFrame=requestAnimationFrame(animateMeteorCanvas);
 }
 meteorTimer=window.setTimeout(
  ()=>launchMeteorShower(panel),
  randomInteger(4600,10200)
 );
}

function startMeteorCanvas(panel){
 window.clearTimeout(meteorTimer);
 meteorPanel=panel;
 if(!meteorContext)return;
 const layer=panel?.querySelector(":scope > .tcs-ornament-layer");
 if(!layer)return;
 if(meteorCanvas.parentNode!==layer)layer.appendChild(meteorCanvas);
 resizeMeteorCanvas();
 meteorShower=[];
 meteorDust=[];
 meteorLastFrame=performance.now();
 if(reducedMotion||document.hidden){
  if(meteorFrame)cancelAnimationFrame(meteorFrame);
  meteorFrame=0;
  meteorContext.clearRect(0,0,meteorWidth,meteorHeight);
  return;
 }
 if(!meteorFrame)meteorFrame=requestAnimationFrame(animateMeteorCanvas);
 meteorTimer=window.setTimeout(
  ()=>launchMeteorShower(panel),
  randomInteger(1400,3800)
 );
}

function emitMeteorDust(meteor,delta){
 meteor.dustClock+=delta;
 while(meteor.dustClock>=.105){
  meteor.dustClock-=.105;
  if(meteorDust.length>260)meteorDust.splice(0,meteorDust.length-260);
  const trailOffset=randomBetween(5,meteor.length*.82);
  meteorDust.push({
   x:meteor.x-meteor.vx*(trailOffset/Math.max(.08,Math.hypot(meteor.vx,meteor.vy))),
   y:meteor.y-meteor.vy*(trailOffset/Math.max(.08,Math.hypot(meteor.vx,meteor.vy))),
   vx:-meteor.vx*randomBetween(.08,.32)+randomBetween(-.025,.025),
   vy:-meteor.vy*randomBetween(.08,.32)+randomBetween(-.025,.025),
   radius:randomBetween(.35,1.25),
   life:randomBetween(.38,1.05),
   age:0,
   alpha:randomBetween(.22,.7)
  });
 }
}

function drawCanvasMeteor(meteor){
 const directionX=Math.cos(meteor.angle);
 const directionY=Math.sin(meteor.angle);
 const tailX=meteor.x-directionX*meteor.length;
 const tailY=meteor.y-directionY*meteor.length;
 const gradient=meteorContext.createLinearGradient(tailX,tailY,meteor.x,meteor.y);
 gradient.addColorStop(0,"rgba(255,246,218,0)");
 gradient.addColorStop(.38,"rgba(224,198,148,.035)");
 gradient.addColorStop(.7,"rgba(239,220,181,.18)");
 gradient.addColorStop(.9,"rgba(255,245,218,.55)");
 gradient.addColorStop(1,"rgba(255,255,255,.96)");
 meteorContext.save();
 meteorContext.globalAlpha=meteor.alpha;
 meteorContext.lineCap="round";
 meteorContext.lineWidth=meteor.thickness;
 meteorContext.strokeStyle=gradient;
 meteorContext.shadowBlur=meteor.glow*.55;
 meteorContext.shadowColor="rgba(255,240,205,.48)";
 meteorContext.beginPath();
 meteorContext.moveTo(tailX,tailY);
 meteorContext.lineTo(meteor.x,meteor.y);
 meteorContext.stroke();
 const headGlow=meteorContext.createRadialGradient(
  meteor.x,meteor.y,0,
  meteor.x,meteor.y,meteor.glow
 );
 headGlow.addColorStop(0,"rgba(255,255,255,1)");
 headGlow.addColorStop(.12,"rgba(255,248,226,.92)");
 headGlow.addColorStop(.4,"rgba(245,224,184,.28)");
 headGlow.addColorStop(1,"rgba(245,224,184,0)");
 meteorContext.shadowBlur=meteor.glow;
 meteorContext.shadowColor="rgba(255,245,220,.95)";
 meteorContext.fillStyle=headGlow;
 meteorContext.beginPath();
 meteorContext.arc(meteor.x,meteor.y,meteor.glow,0,Math.PI*2);
 meteorContext.fill();
 meteorContext.shadowBlur=8;
 meteorContext.fillStyle="rgba(255,255,255,.98)";
 meteorContext.beginPath();
 meteorContext.arc(meteor.x,meteor.y,meteor.headRadius,0,Math.PI*2);
 meteorContext.fill();
 meteorContext.restore();
}

function drawMeteorDust(delta){
 for(let i=meteorDust.length-1;i>=0;i--){
  const particle=meteorDust[i];
  particle.age+=delta;
  if(particle.age>=particle.life){
   meteorDust.splice(i,1);
   continue;
  }
  particle.x+=particle.vx*delta*1000;
  particle.y+=particle.vy*delta*1000;
  const fade=1-particle.age/particle.life;
  const alpha=particle.alpha*fade*fade;
  meteorContext.save();
  meteorContext.globalAlpha=alpha;
  meteorContext.fillStyle="rgba(255,236,195,1)";
  meteorContext.shadowBlur=4;
  meteorContext.shadowColor="rgba(255,226,173,.7)";
  meteorContext.beginPath();
  meteorContext.arc(particle.x,particle.y,particle.radius*fade,0,Math.PI*2);
  meteorContext.fill();
  meteorContext.restore();
 }
}

function animateMeteorCanvas(now){
 if(!meteorPanel||document.hidden||reducedMotion||!meteorPanel.classList.contains("is-active")){
  meteorFrame=0;
  return;
 }
 const delta=Math.min(.05,Math.max(0,(now-meteorLastFrame)/1000));
 meteorLastFrame=now;
 meteorContext.clearRect(0,0,meteorWidth,meteorHeight);
 meteorContext.save();
 meteorContext.globalCompositeOperation="lighter";
 for(let i=meteorShower.length-1;i>=0;i--){
  const meteor=meteorShower[i];
  if(now<meteor.bornAt)continue;
  meteor.elapsed=now-meteor.bornAt;
  const progress=clamp(meteor.elapsed/meteor.duration,0,1);
  meteor.x=meteor.startX+meteor.vx*meteor.elapsed;
  meteor.y=meteor.startY+meteor.vy*meteor.elapsed;
  const fadeIn=clamp(progress/.075,0,1);
  const fadeOut=clamp((1-progress)/.3,0,1);
  meteor.alpha=fadeIn*fadeOut;
  if(meteor.alpha>.01){
   drawCanvasMeteor(meteor);
   if(Math.random()<delta*8)emitMeteorDust(meteor,delta);
  }
  if(progress>=1)meteorShower.splice(i,1);
 }
 drawMeteorDust(delta);
 meteorContext.restore();
 if(meteorShower.length||meteorDust.length){
  meteorFrame=requestAnimationFrame(animateMeteorCanvas);
 }else{
  meteorFrame=0;
 }
}

window.addEventListener("resize",resizeMeteorCanvas,{passive:true});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden){
  window.clearTimeout(meteorTimer);
  if(meteorFrame)cancelAnimationFrame(meteorFrame);
  meteorFrame=0;
 }else if(meteorPanel?.classList.contains("is-active")){
  startMeteorCanvas(meteorPanel);
 }
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
 startMeteorCanvas(target);
 setSpaceBackground(id === "home");

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
