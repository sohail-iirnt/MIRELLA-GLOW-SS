import {getApps,getApp,initializeApp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {getFirestore,getDoc,doc} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';

const app=getApps().length?getApp():initializeApp(firebaseConfig),db=getFirestore(app);
const $=id=>document.getElementById(id);
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let product=null,qty=1;

function showError(title,message){
  const page=$('page');
  if(page) page.innerHTML=`<div class="empty"><span class="eyebrow">Mirella Glow</span><h1>${esc(title)}</h1><p>${esc(message)}</p><a class="cta" href="index.html#shop">Back to shop</a></div>`;
}
function toast(m){const t=$('toast');if(!t)return; t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}
async function loadStore(){try{const s=await getDoc(doc(db,'settings','store'));if(s.exists()&&s.data().logoUrl&&$('logo'))$('logo').src=s.data().logoUrl}catch(e){console.warn('[Mirella Glow] store settings unavailable',e)}}
function imagesFor(p){return[p.imageUrl,...(Array.isArray(p.gallery)?p.gallery:[])].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i)}
function addToCart(){const cart=JSON.parse(localStorage.getItem('mirella-cart')||'[]');const existing=cart.find(x=>x.id===product.id);const max=Number(product.stock||0);if(max<1)return toast('This product is currently sold out.');if(existing)existing.qty=Math.min(existing.qty+qty,max);else cart.push({id:product.id,name:product.name,price:Number(product.price||0),imageUrl:product.imageUrl||'',qty});localStorage.setItem('mirella-cart',JSON.stringify(cart));toast(`${product.name} added to your bag`)}
function render(){
 const imgs=imagesFor(product),stock=Number(product.stock||0),compare=Number(product.compareAtPrice||product.comparePrice||0),price=Number(product.price||0),save=compare>price?Math.round((1-price/compare)*100):0;
 document.title=`${product.name} — Mirella Glow`;
 const meta=document.querySelector('meta[name="description"]');if(meta)meta.content=product.description||'Mirella Glow beauty product';
 $('page').innerHTML=`<div class="crumbs"><a href="index.html">Home</a> / <a href="index.html#shop">Shop</a> / ${esc(product.name)}</div><div class="product"><div class="gallery"><div class="thumbs">${imgs.map((src,i)=>`<button type="button" class="thumb ${i===0?'active':''}" data-thumb="${i}"><img src="${esc(src)}" alt="${esc(product.name)} image ${i+1}" loading="lazy"></button>`).join('')}</div><div class="main-image" id="mainImage"><img id="mainImg" src="${esc(imgs[0]||'')}" alt="${esc(product.name)}"><span class="zoom-label">Click to enlarge</span></div></div><article><span class="eyebrow">${esc(product.badge||product.category||'Mirella Glow')}</span><h1>${esc(product.name)}</h1><div class="rating">★★★★★ <span>${product.reviewsCount?`${esc(product.reviewsCount)} reviews`:'Loved by Mirella Glow customers'}</span></div><div><span class="price">${money(price)}</span>${compare?`<span class="compare">${money(compare)}</span>`:''}${save?`<span class="saving">SAVE ${save}%</span>`:''}</div><p class="intro">${esc(product.description||'A thoughtfully selected beauty essential designed to make your everyday ritual feel a little more beautiful.')}</p><div class="meta-grid"><div class="meta"><b>Availability</b><span>${stock>0?`${stock} in stock`:'Currently sold out'}</span></div><div class="meta"><b>Category</b><span>${esc(product.category||'Beauty')}</span></div>${product.skinType?`<div class="meta"><b>Skin / hair type</b><span>${esc(product.skinType)}</span></div>`:''}${product.concern?`<div class="meta"><b>Best for</b><span>${esc(product.concern)}</span></div>`:''}</div><div class="purchase"><div class="qty"><button type="button" id="minus">−</button><span id="qty">1</span><button type="button" id="plus">+</button></div><button type="button" class="cta" id="add">${stock>0?'Add to bag':'Sold out'}</button></div><div class="accordions">${product.benefits?`<details open><summary>Why you'll love it</summary><p>${esc(product.benefits)}</p></details>`:''}${product.ingredients?`<details><summary>Ingredients / details</summary><p>${esc(product.ingredients)}</p></details>`:''}${product.howToUse?`<details><summary>How to use</summary><p>${esc(product.howToUse)}</p></details>`:''}<details><summary>Delivery & payment</summary><p>Order online through the Mirella Glow checkout. UPI payment supports QR, Google Pay and PhonePe with payment-proof verification.</p></details></div></article></div>`;
 const main=$('mainImg');document.querySelectorAll('[data-thumb]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-thumb]').forEach(x=>x.classList.remove('active'));b.classList.add('active');main.src=imgs[Number(b.dataset.thumb)]});
 $('mainImage').onclick=()=>{$('lightboxImage').src=main.src;$('lightbox').classList.add('open')};
 $('minus').onclick=()=>{qty=Math.max(1,qty-1);$('qty').textContent=qty};$('plus').onclick=()=>{qty=Math.min(stock||1,qty+1);$('qty').textContent=qty};$('add').onclick=addToCart;if(stock<1)$('add').disabled=true;
}
async function init(){
 await loadStore();
 const params=new URLSearchParams(location.search),id=params.get('id');
 if(!id)return showError('Choose a product.','Select a product from the shop to view its full details.');
 try{
   const snap=await getDoc(doc(db,'products',id));
   if(!snap.exists())return showError('Product unavailable.','This product does not exist in the live catalog.');
   const data=snap.data();
   if(data.active===false)return showError('Product unavailable.','This product is currently not available in the store.');
   product={id:snap.id,...data};render();
 }catch(e){console.error('[Mirella Glow] product load failed',e);showError('Product could not load.','Please refresh the page and try again.');}
}
$('closeLightbox')?.addEventListener('click',()=>$('lightbox')?.classList.remove('open'));
$('lightbox')?.addEventListener('click',e=>{if(e.target===$('lightbox'))$('lightbox').classList.remove('open')});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('lightbox')?.classList.remove('open')});
init();