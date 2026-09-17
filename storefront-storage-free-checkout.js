import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app=getApps().length?getApp():null;
if(!app)throw new Error('Mirella Firebase app is unavailable.');
const db=getFirestore(app);
const $=id=>document.getElementById(id);
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
let shippingFee=99;
let shippingLoaded=false;

async function loadShipping(){
  if(shippingLoaded)return;
  try{
    const snap=await getDoc(doc(db,'settings','store'));
    const value=Number(snap.exists()?snap.data()?.shippingFee:NaN);
    if(Number.isFinite(value)&&value>=0)shippingFee=Math.round(value);
  }catch(e){console.warn('[Mirella Glow] shipping setting unavailable; using fallback.',e)}
  shippingLoaded=true;
}
function cart(){try{const v=JSON.parse(localStorage.getItem('mirella-cart')||'[]');return Array.isArray(v)?v.filter(x=>!x.unavailable&&Number(x.qty||0)>0):[]}catch{return[]}}
function subtotal(items){return items.reduce((s,x)=>s+Number(x.price||0)*Number(x.qty||0),0)}
function compressImage(file){return new Promise((resolve,reject)=>{
  if(!file)return reject(new Error('Please upload your successful UPI payment screenshot.'));
  if(!file.type.startsWith('image/'))return reject(new Error('Payment proof must be an image.'));
  if(file.size>5*1024*1024)return reject(new Error('Payment screenshot must be 5 MB or smaller.'));
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('Could not read the payment screenshot.'));
  reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('The selected image could not be processed.'));img.onload=()=>{
    const max=1400,scale=Math.min(1,max/Math.max(img.width,img.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);
    let quality=.78,data=canvas.toDataURL('image/jpeg',quality);
    while(data.length>850000&&quality>.45){quality-=.06;data=canvas.toDataURL('image/jpeg',quality)}
    if(data.length>900000)return reject(new Error('This screenshot is too large. Please choose a smaller screenshot.'));
    resolve(data);
  };img.src=reader.result};reader.readAsDataURL(file);
})}
function setStatus(text){const e=$('mgCheckoutError');if(e)e.textContent=text}
function success(orderNumber,payment){const form=$('checkoutForm');if(form)form.style.display='none';const result=$('checkoutResult');if(result)result.innerHTML=`<div class="mg-success"><span class="eyebrow">Order received</span><h2>Thank you.</h2><div class="number">${esc(orderNumber)}</div><p>${payment==='upi'?'Your payment screenshot has been received securely. The Mirella team will verify the payment and process your order.':'Your COD order has been recorded successfully. The Mirella team will contact you using the details provided.'}</p><button type="button" class="hero-cta" id="mgContinue">Continue shopping</button></div>`;$('mgContinue')?.addEventListener('click',()=>{$('checkoutModal')?.classList.remove('open');location.hash='shop'});document.dispatchEvent(new CustomEvent('mirella:cart-updated'))}
let busy=false;
async function handleSubmit(event){
  if(event.target?.id!=='checkoutForm'||busy)return;
  event.preventDefault();event.stopImmediatePropagation();
  const form=event.target,items=cart();
  if(!items.length){alert('Your bag is empty.');return}
  if(!form.reportValidity())return;
  const button=$('mgPlaceOrder');if(!button)return;
  busy=true;button.disabled=true;button.textContent='Placing your order…';setStatus('');
  try{
    await loadShipping();
    const payment=document.querySelector('input[name="mgPayment"]:checked')?.value||'cod';
    const customer={name:$('mgName')?.value.trim()||'',phone:$('mgPhone')?.value.trim()||'',email:$('mgEmail')?.value.trim()||'',address:$('mgAddress')?.value.trim()||'',city:$('mgCity')?.value.trim()||'',state:$('mgState')?.value.trim()||'',pincode:$('mgPincode')?.value.trim()||''};
    const proof=payment==='upi'?await compressImage($('mgProof')?.files?.[0]):'';
    const orderItems=items.map(x=>({productId:x.id,name:x.name,price:Number(x.price||0),qty:Number(x.qty||0),imageUrl:x.imageUrl||''}));
    const sub=subtotal(orderItems),ship=shippingFee,total=sub+ship;
    const orderNumber=`MG-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    const snap=await getDoc(doc(db,'settings','store'));const upiId=snap.exists()?String(snap.data()?.upiId||''):'';
    await addDoc(collection(db,'orders'),{orderNumber,customer,items:orderItems,subtotal:sub,shipping:ship,total,status:'new',paymentStatus:'pending',paymentMethod:payment,paymentProofDataUrl:proof,paymentProofStorageStatus:payment==='upi'?'firestore-fallback':'not-required',upiId:payment==='upi'?upiId:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    localStorage.removeItem('mirella-cart');success(orderNumber,payment);
  }catch(e){console.error('[Mirella Glow] storage-free checkout failed',e);setStatus(e?.code==='permission-denied'?'The store is not currently accepting orders. Please contact Mirella Glow support.':(e.message||'We could not place the order. Please check your details and try again.'));button.disabled=false;button.textContent='Place order';}
  finally{busy=false}
}
document.addEventListener('submit',handleSubmit,true);

const refresh=async()=>{await loadShipping();document.querySelectorAll('.mg-row').forEach(row=>{const label=row.querySelector('span:first-child')?.textContent?.trim().toLowerCase(),value=row.querySelector('span:last-child');if(!value)return;if(label==='shipping')value.textContent=shippingFee?'₹'+shippingFee.toLocaleString('en-IN'):'Free';});const form=$('checkoutForm');const button=$('mgPlaceOrder');if(form&&button){const items=cart(),sub=subtotal(items),total=sub+shippingFee;button.textContent=`Place order · ${money(total)}`}};
new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true});
refresh();
