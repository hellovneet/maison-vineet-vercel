const PRODUCT_CATALOG={
  RFID_TAG_001:{brand:"Maison Vineet",name:"Emerald Silk Blazer",color:"Cool / Winter Deep Green",sizes:["S","M","L"],stockStatus:"In Stock (3 Left)"},
  RFID_TAG_002:{brand:"Luxe",name:"Terracotta Oversized Hoodie",color:"Warm / Autumn Earthy Orange",sizes:["M","XL"],stockStatus:"Low Stock (1 Left)"},
  RFID_TAG_003:{brand:"Maison Vineet",name:"Charcoal Tailored Vest",color:"Neutral / Minimalist Slate",sizes:["S","L","XL"],stockStatus:"In Stock (5 Left)"}
};
const UNDERTONES=[
  {type:"Warm (Amber / Earthy)",palette:"Earth Tones (Warm Amber, Olive, Terracotta)",rec:"Maison Vineet Sahara Beige Trench",class:"warm"},
  {type:"Cool (Jewel Tones)",palette:"Jewel Tones (Emerald, Sapphire, Deep Plum)",rec:"Maison Vineet Emerald Silk Blazer",class:"cool"},
  {type:"Neutral (Balanced)",palette:"Universal Tones (Teal, Dust Rose, Charcoal)",rec:"Luxe Minimalist Dust Rose Tee",class:"neutral"}
];

let cameraStream=null;
let cameraStarting=false;
async function initWebcam(){
  const video=document.getElementById('webcam');
  const status=document.getElementById('cameraStatus');
  if(!video || cameraStarting) return;
  cameraStarting=true;
  const setStatus=(text,ok=false)=>{
    if(status){status.innerHTML=`<span></span> ${text}`;status.classList.toggle('camera-ok',ok);}
  };
  if(!window.isSecureContext){setStatus('HTTPS REQUIRED');cameraStarting=false;return;}
  if(!navigator.mediaDevices?.getUserMedia){setStatus('CAMERA NOT SUPPORTED');cameraStarting=false;return;}
  try{
    if(cameraStream) cameraStream.getTracks().forEach(t=>t.stop());
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});
    video.srcObject=cameraStream; video.autoplay=true; video.muted=true; video.playsInline=true;
    video.style.display='block'; await video.play(); setStatus('LIVE CAMERA',true); startRealCameraAnalysis(video);
  }catch(err){
    console.error('Camera error:',err);
    setStatus(err?.name==='NotAllowedError'?'ALLOW CAMERA':err?.name==='NotFoundError'?'NO CAMERA':'CAMERA ERROR');
  }finally{cameraStarting=false;}
}

let tagKeys=Object.keys(PRODUCT_CATALOG),currentTagIdx=0,undertoneIdx=0;
function cycleKioskState(){
  currentTagIdx=(currentTagIdx+1)%tagKeys.length;
  const activeTag=tagKeys[currentTagIdx],item=PRODUCT_CATALOG[activeTag];
  const set=(id,text,cls)=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.textContent=text;
    if(cls) el.className=cls;
  };
  // Skin analysis is controlled by the real camera analyser below.
  set('rfid-tag-label',`HELD ITEM · ${activeTag}`);
  set('item-brand',`${item.brand} · ${item.name}`);
  set('item-color',`Color Profile: ${item.color}`);
  set('item-sizes',`Sizes Available: ${item.sizes.join(', ')}`);
  set('item-stock',`Inventory: ${item.stockStatus}`);
}

// ---------- Demo browser authentication ----------
const USERS_KEY='maisonVineetUsers',SESSION_KEY='maisonVineetSession',PROFILE_KEY='maisonVineetProfiles';
const getUsers=()=>JSON.parse(localStorage.getItem(USERS_KEY)||'[]');
const saveUsers=u=>localStorage.setItem(USERS_KEY,JSON.stringify(u));
const getProfiles=()=>JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}');
const saveProfiles=p=>localStorage.setItem(PROFILE_KEY,JSON.stringify(p));
const getSession=()=>JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
function setSession(user){localStorage.setItem(SESSION_KEY,JSON.stringify({name:user.name,email:user.email}));updateAuthUI();}
function clearSession(){localStorage.removeItem(SESSION_KEY);updateAuthUI();}
function updateAuthUI(){
  const session=getSession(),authButton=document.getElementById('authButton'),menu=document.getElementById('userMenu'),greeting=document.getElementById('userGreeting');
  if(session){const profile=getProfiles()[session.email]||{};authButton.classList.add('hidden');menu.classList.remove('hidden');greeting.textContent=`Hi, ${(profile.name||session.name).split(' ')[0]}`;}
  else{authButton.classList.remove('hidden');menu.classList.add('hidden');}
}
function profileKey(){const s=getSession();return s?s.email:null;}
function latestSkinLabel(){const r=REAL_SKIN_ANALYSIS.lastResult;return r?`${r.tone} · ${r.undertone}`:'Not analysed';}
function openProfile(){
  const session=getSession();
  if(!session){openAuth('login');return;}
  const modal=document.getElementById('profileModal'), profiles=getProfiles(), saved=profiles[session.email]||{};
  document.getElementById('profileName').value=saved.name||session.name||'';
  document.getElementById('profileStyle').value=saved.style||'Minimal';
  document.getElementById('profileSkinType').value=saved.skinType||'Not sure';
  document.getElementById('profileColor').value=saved.color||'';
  document.getElementById('profileBio').value=saved.bio||'';
  document.getElementById('profileEmail').textContent=session.email;
  document.getElementById('profileTone').textContent=latestSkinLabel();
  const initials=(saved.name||session.name||'MV').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('profileAvatar').textContent=initials;
  document.getElementById('profileMessage').textContent='';
  document.getElementById('profileMessage').className='profile-message';
  modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');
}
function closeProfile(){const modal=document.getElementById('profileModal');if(!modal)return;modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');}
function saveProfile(e){
  e.preventDefault();const session=getSession();if(!session){return;}
  const name=document.getElementById('profileName').value.trim(), message=document.getElementById('profileMessage');
  if(name.length<2){message.textContent='Please enter your name.';message.className='profile-message error';return;}
  const profiles=getProfiles();profiles[session.email]={name,style:document.getElementById('profileStyle').value,skinType:document.getElementById('profileSkinType').value,color:document.getElementById('profileColor').value.trim(),bio:document.getElementById('profileBio').value.trim(),updatedAt:new Date().toISOString()};saveProfiles(profiles);
  localStorage.setItem(SESSION_KEY,JSON.stringify({name,email:session.email}));updateAuthUI();
  document.getElementById('profileAvatar').textContent=name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
  message.textContent='Profile saved successfully.';message.className='profile-message success';
}

function openAuth(mode='login'){
  const modal=document.getElementById('authModal'); modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); switchAuthMode(mode); setTimeout(()=>document.getElementById('email').focus(),80);
}
function closeAuth(){const modal=document.getElementById('authModal');modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');document.getElementById('authMessage').textContent='';}
function switchAuthMode(mode){
  const signup=mode==='signup'; document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.mode===mode));
  document.getElementById('authTitle').textContent=signup?'Create your account.':'Welcome back.';
  document.querySelector('.auth-intro').textContent=signup?'Create a member account to save your mirror preferences and styling session.':'Sign in to save your mirror preferences and styling session.';
  document.getElementById('nameField').classList.toggle('hidden-field',!signup); document.getElementById('confirmField').classList.toggle('hidden-field',!signup); document.getElementById('authSubmitText').textContent=signup?'Create account':'Login';
  document.getElementById('authForm').dataset.mode=mode; document.getElementById('authMessage').textContent='';
}
function handleAuth(e){
  e.preventDefault(); const form=e.currentTarget,mode=form.dataset.mode||'login',email=document.getElementById('email').value.trim().toLowerCase(),password=document.getElementById('password').value,name=document.getElementById('name').value.trim(),confirm=document.getElementById('confirmPassword').value,message=document.getElementById('authMessage');
  if(!email||!/^\S+@\S+\.\S+$/.test(email)){message.textContent='Please enter a valid email.';return;}
  if(password.length<6){message.textContent='Password must be at least 6 characters.';return;}
  const users=getUsers();
  if(mode==='signup'){
    if(name.length<2){message.textContent='Please enter your name.';return;}
    if(password!==confirm){message.textContent='Passwords do not match.';return;}
    if(users.some(u=>u.email===email)){message.textContent='An account with this email already exists.';return;}
    const user={name,email,password}; users.push(user); saveUsers(users); setSession(user); closeAuth();
  }else{
    const user=users.find(u=>u.email===email&&u.password===password);
    if(!user){message.textContent='Incorrect email or password. If new, create an account first.';return;}
    setSession(user); closeAuth();
  }
}

/* ---------- Real camera skin-colour analysis ---------- */
const REAL_SKIN_ANALYSIS={samples:[],lastResult:null,maxSamples:12,controller:null};

function rgbToHsv(r,g,b){
  r/=255;g/=255;b/=255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  let h=0;
  if(d){
    if(mx===r) h=((g-b)/d)%6;
    else if(mx===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h*=60;if(h<0)h+=360;
  }
  return {h,s:mx?d/mx*100:0,v:mx*100};
}
function likelySkin(r,g,b){
  const q=rgbToHsv(r,g,b);
  return q.h<=55 && q.s>=12 && q.s<=78 && q.v>=22 && q.v<=98 &&
         r>=g*.88 && g>=b*.72 && r>=b*1.05;
}
function median(a){
  if(!a.length)return 0;
  a=[...a].sort((x,y)=>x-y);
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function toneFromRgb(r,g,b){
  const y=(.2126*r+.7152*g+.0722*b)/255;
  if(y<.27)return "Deep";
  if(y<.40)return "Tan / Deep";
  if(y<.54)return "Medium";
  if(y<.68)return "Light / Medium";
  return "Light";
}
function undertoneFromRgb(r,g,b){
  if(r-g>18 && g-b>10 && r-b>35)return "Warm (Amber / Earthy)";
  if(b>r*.93 && g-b<12)return "Cool (Jewel Tones)";
  return "Neutral (Balanced)";
}
function paletteForUndertone(u){
  if(u.startsWith("Warm"))return ["Earth Tones (Warm Amber, Olive, Terracotta)","Maison Vineet Sahara Beige Trench","warm"];
  if(u.startsWith("Cool"))return ["Jewel Tones (Emerald, Sapphire, Deep Plum)","Maison Vineet Emerald Silk Blazer","cool"];
  return ["Universal Tones (Teal, Dust Rose, Charcoal)","Luxe Minimalist Dust Rose Tee","neutral"];
}
function analyseCameraSkin(video){
  if(!video||!video.videoWidth||!video.videoHeight)return null;
  const c=document.createElement("canvas"),w=160,h=Math.max(90,Math.round(160*video.videoHeight/video.videoWidth));
  c.width=w;c.height=h;
  const ctx=c.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(video,0,0,w,h);
  const data=ctx.getImageData(0,0,w,h).data,rs=[],gs=[],bs=[];
  // Cheek/central face regions. These are intentionally conservative to avoid background pixels.
  const regions=[[.34,.28,.16,.16],[.50,.28,.16,.16],[.41,.36,.18,.12]];
  for(const [rx,ry,rw,rh] of regions){
    const x0=Math.floor(w*rx),y0=Math.floor(h*ry),x1=Math.min(w,Math.floor(w*(rx+rw))),y1=Math.min(h,Math.floor(h*(ry+rh)));
    for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){
      const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2];
      if(likelySkin(r,g,b)){rs.push(r);gs.push(g);bs.push(b);}
    }
  }
  if(rs.length<20)return null;
  const sample={r:Math.round(median(rs)),g:Math.round(median(gs)),b:Math.round(median(bs))};
  REAL_SKIN_ANALYSIS.samples.push(sample);
  if(REAL_SKIN_ANALYSIS.samples.length>REAL_SKIN_ANALYSIS.maxSamples)REAL_SKIN_ANALYSIS.samples.shift();
  const a=REAL_SKIN_ANALYSIS.samples;
  const r=Math.round(median(a.map(x=>x.r))),g=Math.round(median(a.map(x=>x.g))),b=Math.round(median(a.map(x=>x.b)));
  const undertone=undertoneFromRgb(r,g,b), tone=toneFromRgb(r,g,b);
  const result={tone,undertone,r,g,b,confidence:Math.min(99,Math.round(55+Math.min(40,rs.length/8)))};
  REAL_SKIN_ANALYSIS.lastResult=result;
  return result;
}
function applyRealSkinResult(r){
  if(!r)return;
  const toneEl=document.getElementById("skin-tone-status");
  const underEl=document.getElementById("undertone-status");
  const paletteEl=document.getElementById("palette-text");
  const recEl=document.getElementById("ai-rec");
  if(underEl){
    const p=paletteForUndertone(r.undertone);
    underEl.textContent=`${r.undertone} · ${r.tone}`;
    underEl.className=`value ${p[2]}`;
    if(paletteEl)paletteEl.textContent=`Skin Tone: ${r.tone} · Palette: ${p[0]}`;
    if(recEl)recEl.textContent=`AI Pick: ${p[1]}`;
  }
  if(toneEl)toneEl.textContent=r.tone;
}
function startRealCameraAnalysis(video){
  if(!video)return;
  REAL_SKIN_ANALYSIS.samples=[];
  if(REAL_SKIN_ANALYSIS.controller)clearInterval(REAL_SKIN_ANALYSIS.controller);
  REAL_SKIN_ANALYSIS.controller=setInterval(()=>{
    const r=analyseCameraSkin(video);
    if(r)applyRealSkinResult(r);
  },250);
}

window.addEventListener('DOMContentLoaded',()=>{
  initWebcam(); setInterval(cycleKioskState,5000); updateAuthUI();
  document.getElementById('cameraButton')?.addEventListener('click',initWebcam);
  document.getElementById('authButton').addEventListener('click',()=>openAuth('login'));
  document.getElementById('logoutButton').addEventListener('click',clearSession);
  document.getElementById('profileButton')?.addEventListener('click',openProfile);
  document.getElementById('profileForm')?.addEventListener('submit',saveProfile);
  document.querySelectorAll('[data-close-profile]').forEach(el=>el.addEventListener('click',closeProfile));
  document.getElementById('authForm').addEventListener('submit',handleAuth);
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>switchAuthMode(t.dataset.mode)));
  document.querySelectorAll('[data-close-auth]').forEach(el=>el.addEventListener('click',closeAuth));
  document.getElementById('skinGuideButton')?.addEventListener('click',()=>openSkinGuide());
  document.getElementById('skinAskButton')?.addEventListener('click',askSkinGuide);
  document.querySelectorAll('[data-close-skin]').forEach(el=>el.addEventListener('click',closeSkinGuide));
  document.querySelectorAll('[data-skin-q]').forEach(btn=>btn.addEventListener('click',()=>openSkinGuide(btn.dataset.skinQ)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAuth();closeSkinGuide();closeProfile()}});
});


// ---------- Skin guidance (general information, not diagnosis) ----------
const SKIN_GUIDANCE=[
  {keys:['acne','pimple','pimples','breakout','blackhead','whitehead'],title:'For acne / pimples',text:'Keep the routine gentle: wash with a mild cleanser, avoid picking or squeezing, use non-comedogenic moisturizer and daytime SPF 30+ sunscreen. If breakouts are persistent, painful, cystic, or leaving scars, consider a dermatologist.'},
  {keys:['dry','dryness','flaky','peeling','tight skin'],title:'For dry / flaky skin',text:'Use a gentle fragrance-free cleanser and a thicker moisturizer, especially after washing. Avoid very hot water and harsh scrubs. If the skin is persistently cracked, bleeding, very itchy, or not improving, get professional advice.'},
  {keys:['itch','itchy','itching'],title:'For itchy skin',text:'Avoid scratching and new fragranced products, and use a gentle moisturizer. A cool compress can be soothing. Persistent, widespread, severe, or unexplained itching should be assessed by a clinician.'},
  {keys:['dark spot','dark spots','pigmentation','hyperpigmentation','marks'],title:'For dark spots / pigmentation',text:'Daily broad-spectrum SPF 30+ is one of the most useful steps. Avoid picking at spots and irritating products. New, changing, bleeding, or unusual pigmented marks should be checked by a dermatologist.'},
  {keys:['redness','red','irritation','irritated','burning'],title:'For redness / irritation',text:'Pause any product that seems to trigger the irritation and switch to a simple fragrance-free routine. Avoid scrubs and strong active ingredients until the skin settles. Persistent or painful redness needs professional assessment.'},
  {keys:['rash','hives','swelling'],title:'For a rash / swelling',text:'A rash can have many causes, so the mirror cannot safely identify it from text alone. Keep the routine gentle and avoid suspected triggers. Rapid swelling, facial/eye swelling, breathing difficulty, or a severe reaction needs urgent medical attention.'}
];
function getSkinGuidance(question){
  const q=question.toLowerCase();
  const match=SKIN_GUIDANCE.find(item=>item.keys.some(k=>q.includes(k)));
  if(match) return `<strong>${match.title}</strong><p>${match.text}</p>`;
  return `<strong>General skin-care guidance</strong><p>Keep your routine simple: gentle cleanser, moisturizer suited to your skin, and broad-spectrum SPF 30+ in the daytime. Avoid picking, harsh scrubs, and adding many new products at once. If the problem is persistent, worsening, painful, infected-looking, or you are unsure what it is, a dermatologist can assess it properly.</p>`;
}
function openSkinGuide(prefill=''){const m=document.getElementById('skinModal');m.classList.remove('hidden');m.setAttribute('aria-hidden','false');const input=document.getElementById('skinQuestion');input.value=prefill;document.getElementById('skinAnswer').innerHTML='';setTimeout(()=>input.focus(),80);}
function closeSkinGuide(){const m=document.getElementById('skinModal');m.classList.add('hidden');m.setAttribute('aria-hidden','true');}
function askSkinGuide(){const input=document.getElementById('skinQuestion');const q=input.value.trim();const answer=document.getElementById('skinAnswer');if(!q){answer.innerHTML='<p>Please describe your skin concern first.</p>';return;}answer.innerHTML=getSkinGuidance(q);}
