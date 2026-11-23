(() => {
"use strict";
const ENDPOINT="https://chocoai.thechocostudios.bond/api/license?feature=tcs-public";
const SITE=document.currentScript?.dataset.site||"tcs-website";
function sessionId(key){
 try{let value=sessionStorage.getItem(key);if(!value){value=crypto.randomUUID();sessionStorage.setItem(key,value);}return value;}
 catch{return crypto.randomUUID();}
}
const visitorId=sessionId("tcs_analytics_visitor_v1");
const session=sessionId("tcs_analytics_session_v1");
function send(payload){
 const data=JSON.stringify({siteKey:SITE,visitorId,sessionId:session,...payload});
 try{if(navigator.sendBeacon&&navigator.sendBeacon(ENDPOINT,new Blob([data],{type:"application/json"})))return;}catch{}
 fetch(ENDPOINT,{method:"POST",mode:"cors",credentials:"omit",keepalive:true,headers:{"Content-Type":"application/json"},body:data}).catch(()=>{});
}
function addNotice(){
 try{if(sessionStorage.getItem("tcs_analytics_notice")==="dismissed")return;}catch{}
 const style=document.createElement("style");
 style.textContent=".tcs-analytics-notice{position:fixed;z-index:9998;left:18px;bottom:18px;display:flex;align-items:center;gap:16px;width:min(520px,calc(100vw - 36px));padding:14px 16px;border:1px solid rgba(201,174,126,.36);border-radius:3px;background:rgba(15,14,12,.97);color:#e9e2d5;font:12px/1.65 Manrope,system-ui,sans-serif;box-shadow:0 18px 52px rgba(0,0,0,.34);opacity:0;transform:translateY(-16px);animation:tcsAnalyticsNoticeEnter .42s cubic-bezier(.2,.72,.2,1) forwards;backdrop-filter:blur(14px)}"+
".tcs-analytics-notice button{flex:0 0 auto;min-height:38px;padding:0 10px;border:1px solid rgba(201,174,126,.35);border-radius:2px;background:transparent;color:#dfc99f;cursor:pointer;font:600 10px/1 IBM Plex Mono,monospace;letter-spacing:.08em}"+
".tcs-analytics-notice button:hover{border-color:#dfc99f;background:rgba(201,174,126,.08)}.tcs-analytics-notice button:focus-visible{outline:2px solid #dfc99f;outline-offset:3px}"+
"@keyframes tcsAnalyticsNoticeEnter{to{opacity:1;transform:translateY(0)}}@keyframes tcsAnalyticsNoticeExit{to{opacity:0;transform:translateY(22px)}}"+
"@media(max-width:600px){.tcs-analytics-notice{left:12px;bottom:12px;width:calc(100vw - 24px);align-items:flex-start;gap:10px;padding:12px;font-size:11px}.tcs-analytics-notice button{min-height:34px}}"+
"@media(prefers-reduced-motion:reduce){.tcs-analytics-notice{animation:none;opacity:1;transform:none}}"+
".tcs-download-dialog{max-width:440px;width:calc(100% - 32px);border:1px solid #40516c;border-radius:16px;background:#101b2b;color:#edf3fc;padding:22px;font:14px/1.55 system-ui,sans-serif}.tcs-download-dialog::backdrop{background:#020712bb}.tcs-download-dialog label{display:grid;gap:5px;margin:12px 0}.tcs-download-dialog input{padding:10px;border:1px solid #40516c;border-radius:8px;background:#091321;color:#fff}.tcs-download-dialog button{padding:10px 13px;border:1px solid #647896;border-radius:8px;background:#dce8fa;color:#101827;cursor:pointer;margin:8px 6px 0 0}.tcs-download-dialog .secondary{background:transparent;color:#edf3fc}.tcs-download-dialog .hint{color:#aebbd0;font-size:12px}";
 document.head.append(style);
 const box=document.createElement("aside");
 box.className="tcs-analytics-notice";
 box.setAttribute("role","note");
 box.setAttribute("aria-live","polite");
 const message=document.createElement("span");
 message.textContent="Kami menggunakan analitik kunjungan untuk mengukur sesi dan mengidentifikasi aktivitas bot. Data disimpan tanpa menyimpan alamat IP mentah.";
 const close=document.createElement("button");
 close.type="button";
 close.textContent="Tutup";
 let timer=0,closed=false;
 const dismiss=()=>{
  if(closed)return;
  closed=true;
  window.clearTimeout(timer);
  try{sessionStorage.setItem("tcs_analytics_notice","dismissed");}catch{}
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){box.remove();return;}
  box.style.animation="tcsAnalyticsNoticeExit .34s cubic-bezier(.4,0,.7,.3) forwards";
  window.setTimeout(()=>box.remove(),360);
 };
 close.addEventListener("click",dismiss);
 box.append(message,close);
 document.body.append(box);
 timer=window.setTimeout(dismiss,5000);
}
send({event:"visit",path:location.pathname,referrer:document.referrer||""});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addNotice,{once:true});else addNotice();
function continueDownload(url,target,productCode,productName,version,name,email,dialog,link){
 send({event:"download",productCode,productName,version,url,name,email});
 dialog?.close();dialog?.remove();
 if(link){link.dataset.tcsTrackingHandled="1";link.click();delete link.dataset.tcsTrackingHandled;}
 else if(target==="_blank")window.open(url,"_blank","noopener,noreferrer");else location.assign(url);
}
document.addEventListener("click",event=>{
 const link=event.target?.closest?.("a[data-tcs-download],a[download],a[href*='/releases/download/']");
 if(!link||link.dataset.tcsTrackingHandled)return;
 const url=link.href;if(!/^https:\/\//i.test(url))return;
 event.preventDefault();link.dataset.tcsTrackingHandled="true";
 const label=(link.dataset.tcsProductName||link.textContent||"Unduhan produk").trim().replace(/\s+/g," ").slice(0,180);
 const code=(link.dataset.tcsProductCode||url.split("/").filter(Boolean).slice(-2,-1)[0]||label).toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-|-$/g,"").slice(0,100)||"tcs-download";
 const version=link.dataset.tcsVersion||"";
 const dialog=document.createElement("dialog");dialog.className="tcs-download-dialog";
 dialog.innerHTML='<h2>Catat unduhan produk</h2><p class="hint">Nama dan email bersifat opsional. Jika dilewati, unduhan akan tercatat sebagai anonim.</p><form method="dialog"><label>Nama (opsional)<input name="name" maxlength="120" autocomplete="name"></label><label>Email (opsional)<input name="email" type="email" maxlength="254" autocomplete="email"></label><p class="hint" data-error></p><button type="submit">Lanjutkan unduhan</button><button class="secondary" type="button" data-skip>Lewati dan unduh</button></form>';
 document.body.append(dialog);
 const form=dialog.querySelector("form");
 form.addEventListener("submit",e=>{
  e.preventDefault();
  const name=form.elements.name.value.trim(),email=form.elements.email.value.trim().toLowerCase();
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){dialog.querySelector("[data-error]").textContent="Alamat email tidak valid.";return;}
  continueDownload(url,link.target,code,label,version,name,email,dialog,link);
 });
 dialog.querySelector("[data-skip]").addEventListener("click",()=>continueDownload(url,link.target,code,label,version,"","",dialog,link));
 dialog.addEventListener("cancel",e=>{e.preventDefault();continueDownload(url,link.target,code,label,version,"","",dialog,link);});
 if(typeof dialog.showModal==="function")dialog.showModal();else continueDownload(url,link.target,code,label,version,"","",dialog,link);
});
})();