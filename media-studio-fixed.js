import { getApps, getApp, initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

let store = { homepageMedia:{}, banners:[], videos:[], announcementSlides:[] };
const slots = [
  ['hero','Hero visual','Primary hero image'],
  ['editorial','Glow Edit / Editorial','Editorial feature image'],
  ['story','Our Story','Brand story visual'],
  ['category1','Skin category','Skin tile'],
  ['category2','Hair category','Hair tile'],
  ['category3','Body category','Body tile'],
  ['category4','Combos category','Combos tile'],
  ['category5','Featured category','Featured tile']
];

function goAdmin(reason='') {
  const q = reason ? `?open=media&error=${encodeURIComponent(reason)}` : '?open=media';
  if (location.pathname.endsWith('/media.html')) location.replace(`admin.html${q}`);
}

async function adminOK(uid) {
  const snap = await getDoc(doc(db, 'admins', uid));
  return snap.exists() && snap.data()?.active === true;
}

async function load() {
  const snap = await getDoc(doc(db, 'settings', 'store'));
  if (snap.exists()) store = { ...store, ...snap.data() };
  store.homepageMedia = store.homepageMedia && typeof store.homepageMedia === 'object' ? store.homepageMedia : {};
  store.banners = Array.isArray(store.banners) ? store.banners : [];
  store.videos = Array.isArray(store.videos) ? store.videos : [];
  store.announcementSlides = Array.isArray(store.announcementSlides) ? store.announcementSlides : [];
}

async function upload(file, path, video=false) {
  if (!file) return '';
  const max = video ? 25 : 5;
  if (video ? !file.type.startsWith('video/') : !file.type.startsWith('image/')) throw Error(video ? 'Please select a video file.' : 'Please select an image file.');
  if (file.size > max * 1024 * 1024) throw Error(`${video ? 'Video' : 'Image'} must be ${max} MB or smaller.`);
  const safe = file.name.replace(/[^a-z0-9._-]/gi, '-');
  const r = ref(storage, `${path}/${Date.now()}-${safe}`);
  await uploadBytes(r, file, { contentType:file.type });
  return getDownloadURL(r);
}

async function clean(url) {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return;
  try { await deleteObject(ref(storage, url)); } catch (e) { console.warn('[Mirella Glow] old media cleanup skipped', e); }
}

async function save(data) {
  await setDoc(doc(db, 'settings', 'store'), { ...data, updatedAt:serverTimestamp() }, { merge:true });
  await load();
  render();
}

function slotCard(key,label,desc) {
  const m = store.homepageMedia[key] || {};
  return `<article class="media-card">
    <img class="preview" src="${esc(m.imageUrl || '')}" alt="${esc(label)}">
    <div class="media-body"><h3>${esc(label)}</h3><div class="muted">${esc(desc)}</div>
      <div class="field"><label>Upload / replace<input type="file" accept="image/*" data-file="${key}"></label></div>
      <div class="field"><label>Image URL<input data-url="${key}" value="${esc(m.imageUrl || '')}" placeholder="https://..."></label></div>
      <div class="row" style="margin-top:12px"><button class="btn" data-save="${key}">Save</button><button class="btn danger" data-del="${key}">Delete</button></div>
      <div class="status" data-status="${key}"></div>
    </div>
  </article>`;
}

function render() {
  renderSlotPanel('heroPanel','Hero media',slots.filter(x=>x[0]==='hero'));
  renderSlotPanel('postersPanel','Promotional posters',[]);
  renderSlotPanel('categoriesPanel','Shop by category media',slots.filter(x=>x[0].startsWith('category')));
  renderSlotPanel('editorialPanel','Editorial media',slots.filter(x=>x[0]==='editorial'));
  renderSlotPanel('storyPanel','Our Story media',slots.filter(x=>x[0]==='story'));
  renderVideos();
  renderAnnouncements();
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>show(b.dataset.tab));
  show(document.querySelector('.tab.active')?.dataset.tab || 'hero');
}

function renderSlotPanel(id,title,list) {
  const el = $(id);
  if (!el) return;
  if (id === 'postersPanel') { renderPosters(); return; }
  el.innerHTML = `<h2>${title}</h2><p class="muted">Upload, replace or delete the media used by this exact storefront section.</p><div class="media-grid">${list.map(x=>slotCard(...x)).join('')}</div>`;
  el.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>saveSlot(b.dataset.save));
  el.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>deleteSlot(b.dataset.del));
}

async function saveSlot(key) {
  const status = document.querySelector(`[data-status="${key}"]`);
  const file = document.querySelector(`[data-file="${key}"]`)?.files?.[0];
  const url = document.querySelector(`[data-url="${key}"]`)?.value.trim();
  try {
    const old = store.homepageMedia[key]?.imageUrl || '';
    const next = file ? await upload(file, `store/homepage/${key}`) : url;
    if (!next) throw Error('Choose an image or enter an image URL.');
    store.homepageMedia[key] = { imageUrl:next };
    await save({ homepageMedia:store.homepageMedia });
    if (file && old && old !== next) await clean(old);
    if (status) status.textContent = 'Saved successfully.';
  } catch (e) { if (status) status.textContent = e.message || 'Save failed.'; }
}

async function deleteSlot(key) {
  if (!confirm('Delete this section media?')) return;
  const old = store.homepageMedia[key]?.imageUrl || '';
  const next = { ...store.homepageMedia }; delete next[key];
  await save({ homepageMedia:next });
  await clean(old);
}

function renderPosters() {
  const el = $('postersPanel');
  if (!el) return;
  el.innerHTML = `<h2>Promotional posters</h2><p class="muted">These appear in the dedicated promotion section on the production storefront.</p><button class="btn" id="addPoster">+ Add poster</button><div class="media-grid">${store.banners.length ? store.banners.map((x,i)=>`<article class="media-card"><img class="preview" src="${esc(x.imageUrl||'')}" alt="Promotion"><div class="media-body"><div class="field"><label>Poster image<input type="file" accept="image/*" data-pf="${i}"></label></div>${[['eyebrow','Eyebrow'],['title','Title'],['subtitle','Subtitle'],['buttonText','Button text'],['buttonLink','Button link']].map(([k,l])=>`<div class="field"><label>${l}<input data-p="${k}" data-i="${i}" value="${esc(x[k]||'')}"></label></div>`).join('')}<div class="row" style="margin-top:12px"><button class="btn" data-ps="${i}">Save</button><button class="btn danger" data-pd="${i}">Delete</button></div></div></article>`).join('') : '<div class="empty">No promotional posters yet.</div>'}</div>`;
  $('addPoster').onclick=()=>{ store.banners.push({imageUrl:'',eyebrow:'Mirella Glow',title:'Beauty, refined.',subtitle:'',buttonText:'Shop now',buttonLink:'#shop'}); renderPosters(); };
  el.querySelectorAll('[data-ps]').forEach(b=>b.onclick=()=>savePoster(+b.dataset.ps));
  el.querySelectorAll('[data-pd]').forEach(b=>b.onclick=()=>deletePoster(+b.dataset.pd));
}

async function savePoster(i) {
  try {
    const p={...store.banners[i]};
    document.querySelectorAll(`[data-p][data-i="${i}"]`).forEach(x=>p[x.dataset.p]=x.value.trim());
    const f=document.querySelector(`[data-pf="${i}"]`)?.files?.[0], old=p.imageUrl||'';
    if(f) p.imageUrl=await upload(f,'store/banners');
    if(!p.imageUrl) throw Error('Poster image is required.');
    store.banners[i]=p; await save({banners:store.banners}); if(f&&old) await clean(old);
  } catch(e) { alert(e.message||'Poster save failed.'); }
}
async function deletePoster(i) { if(!confirm('Delete this poster?'))return; const old=store.banners[i]?.imageUrl||''; store.banners.splice(i,1); await save({banners:store.banners}); await clean(old); }

function renderVideos() {
  const el=$('videosPanel'); if(!el)return;
  el.innerHTML=`<h2>Reels / Videos</h2><p class="muted">Storefront videos autoplay muted and inline. Upload MP4/WebM/MOV files up to 25 MB.</p><button class="btn" id="addVideo">+ Add video</button><div class="media-grid">${store.videos.length?store.videos.map((x,i)=>`<article class="media-card"><video class="preview" src="${esc(x.videoUrl||'')}" poster="${esc(x.posterUrl||'')}" muted loop playsinline controls></video><div class="media-body"><div class="field"><label>Video file<input type="file" accept="video/mp4,video/webm,video/quicktime" data-vf="${i}"></label></div>${[['title','Title'],['tag','Tag'],['subtitle','Subtitle'],['posterUrl','Poster URL']].map(([k,l])=>`<div class="field"><label>${l}<input data-v="${k}" data-i="${i}" value="${esc(x[k]||'')}"></label></div>`).join('')}<div class="row" style="margin-top:12px"><button class="btn" data-vs="${i}">Save</button><button class="btn danger" data-vd="${i}">Delete</button></div></div></article>`).join(''):'<div class="empty">No storefront videos yet.</div>'}</div>`;
  $('addVideo').onclick=()=>{store.videos.push({videoUrl:'',title:'Mirella moment',tag:'Mirella Glow',subtitle:'',posterUrl:''});renderVideos();};
  el.querySelectorAll('[data-vs]').forEach(b=>b.onclick=()=>saveVideo(+b.dataset.vs));
  el.querySelectorAll('[data-vd]').forEach(b=>b.onclick=()=>deleteVideo(+b.dataset.vd));
}
async function saveVideo(i){try{const v={...store.videos[i]};document.querySelectorAll(`[data-v][data-i="${i}"]`).forEach(x=>v[x.dataset.v]=x.value.trim());const f=document.querySelector(`[data-vf="${i}"]`)?.files?.[0],old=v.videoUrl||'';if(f)v.videoUrl=await upload(f,'store/videos',true);if(!v.videoUrl)throw Error('Video file is required.');store.videos[i]=v;await save({videos:store.videos});if(f&&old)await clean(old)}catch(e){alert(e.message||'Video save failed.')}}
async function deleteVideo(i){if(!confirm('Delete this video?'))return;const old=store.videos[i]?.videoUrl||'';store.videos.splice(i,1);await save({videos:store.videos});await clean(old)}

function renderAnnouncements(){const el=$('announcementPanel');if(!el)return;el.innerHTML=`<h2>Announcement bar</h2><p class="muted">Manage the rotating messages shown at the very top of the storefront.</p><button class="btn" id="addAnn">+ Add message</button><div class="media-grid">${store.announcementSlides.map((x,i)=>`<article class="media-card"><div class="media-body"><h3>Message ${i+1}</h3><div class="field"><label>Text<input data-a="${i}" value="${esc(typeof x==='string'?x:x?.text||'')}"></label></div><div class="row" style="margin-top:12px"><button class="btn" data-as="${i}">Save</button><button class="btn danger" data-ad="${i}">Delete</button></div></div></article>`).join('')}</div>`;$('addAnn').onclick=()=>{store.announcementSlides.push('New Mirella Glow announcement');renderAnnouncements()};el.querySelectorAll('[data-as]').forEach(b=>b.onclick=()=>saveAnn(+b.dataset.as));el.querySelectorAll('[data-ad]').forEach(b=>b.onclick=()=>deleteAnn(+b.dataset.ad));}
async function saveAnn(i){store.announcementSlides[i]=document.querySelector(`[data-a="${i}"]`).value.trim();await save({announcementSlides:store.announcementSlides})}
async function deleteAnn(i){store.announcementSlides.splice(i,1);await save({announcementSlides:store.announcementSlides})}

function show(tab){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));['hero','posters','categories','editorial','story','videos','announcement'].forEach(x=>$(x+'Panel')?.classList.toggle('hidden',x!==tab));}

$('logout')?.addEventListener('click',()=>signOut(auth));

(async()=>{
  try {
    await setPersistence(auth,browserLocalPersistence);
  } catch(e) { console.warn('[Mirella Glow] Could not enable auth persistence',e); }
  onAuthStateChanged(auth,async user=>{
    if(!user){ $('login')?.classList.remove('hidden'); $('app')?.classList.add('hidden'); goAdmin('login-required'); return; }
    try {
      if(!(await adminOK(user.uid))) throw Error('NOT_ADMIN');
      $('login')?.classList.add('hidden'); $('app')?.classList.remove('hidden'); if($('adminEmail'))$('adminEmail').textContent=user.email||'';
      await load(); render();
    } catch(e) {
      console.error('[Mirella Glow] Media Studio access check failed',e);
      await signOut(auth); goAdmin('not-admin');
    }
  });
})();
