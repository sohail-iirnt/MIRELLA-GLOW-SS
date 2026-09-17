import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app = getApps().length ? getApp() : null;
if (!app) throw new Error('Mirella Firebase app is unavailable.');
const db = getFirestore(app);
const $ = id => document.getElementById(id);
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function getCart(){try{const v=JSON.parse(localStorage.getItem('mirella-cart')||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
function validCart(){return getCart().filter(x=>!x.unavailable&&Number(x.qty||0)>0)}
function subtotal(items){return items.reduce((s,x)=>s+Number(x.price||0)*Number(x.qty||0),0)}
function shipping(sub){return sub>=999?0:99}
function compressProof(file){return new Promise((resolve,reject)=>{
  if(!file)return reject(new Error('Please upload your successful UPI payment screenshot.'));
  if(!file.type.startsWith('image/'))return reject(new Error('Payment proof must be an image.'));
  if(file.size>5*1024*1024)return reject(new Error('Payment screenshot must be 5 MB or smaller.'));
  const reader=new FileReader(); reader.onerror=()=>reject(new Error('Could not read the payment screenshot.'));
  reader.onload=()=>{const img=new Image(); img.onerror=()=>reject(new Error('The selected image could not be processed.'));
    img.onload=()=>{const max=1400,scale=Math.min(1,max/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);let quality=.78,data=canvas.toDataURL('image/jpeg',quality);while(data.length>900000&&quality>.45){quality-=.08;data=canvas.toDataURL('image/jpeg',quality)}if(data.length>950000)return reject(new Error('This screenshot is too large. Please choose a smaller screenshot.'));resolve(data)};img.src=reader.result}; reader.readAsDataURL(file);
})}

async function placeOrderWithoutStorage(event){
  event.preventDefault();
  const form=event.currentTarget || $('checkoutForm');
  const items=validCart();
  if(!items.length){alert('Your bag is empty.');return;}
  if(!form.reportValidity())return;
  const button=$('mgPlaceOrder'),error=$('mgCheckoutError');
  if(!button)return;
  button.disabled=true;button.textContent='Placing your order…';if(error)error.textContent='';
  try{
    const payment=document.querySelector('input[name="mgPayment"]:checked')?.value||'cod';
    const customer={name:$('mgName')?.value.trim()||'',phone:$('mgPhone')?.value.trim()||'',email:$('mgEmail')?.value.trim()||'',address:$('mgAddress')?.value.trim()||'',city:$('mgCity')?.value.trim()||'',state:$('mgState')?.value.trim()||'',pincode:$('mgPincode')?.value.trim()||''};
    let proofDataUrl=''; if(payment==='upi')proofDataUrl=await compressProof($('mgProof')?.files?.[0]);
    const orderItems=items.map(x=>({productId:x.id,name:x.name,price:Number(x.price||0),qty:Number(x.qty||0),imageUrl:x.imageUrl||''}));
    const sub=subtotal(orderItems),ship=shipping(sub);const orderNumber=`MG-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    const upiId=document.querySelector('.mg-upi b')?.textContent?.trim()||'';
    const order={orderNumber,customer,items:orderItems,subtotal:sub,shipping:ship,total:sub+ship,status:'new',paymentStatus:'pending',paymentMethod:payment,paymentProofDataUrl:proofDataUrl,paymentProofStorageStatus:payment==='upi'?'firestore-fallback':'not-required',upiId:payment==='upi'?upiId:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    await addDoc(collection(db,'orders'),order);
    localStorage.removeItem('mirella-cart');form.style.display='none';
    const result=$('checkoutResult');if(result)result.innerHTML=`<div class="mg-success"><span class="eyebrow">Order received</span><h2>Thank you.</h2><div class="number">${esc(orderNumber)}</div><p>${payment==='upi'?'Your payment screenshot has been received securely. The Mirella team will verify the payment and process your order.':'Your COD order has been recorded successfully. The Mirella team will contact you using the details provided.'}</p><button type="button" class="hero-cta" id="mgContinue">Continue shopping</button></div>`;
    $('mgContinue')?.addEventListener('click',()=>{$('checkoutModal')?.classList.remove('open');location.hash='shop'});
    document.dispatchEvent(new CustomEvent('mirella:cart-updated'));
  }catch(e){console.error('[Mirella Glow] payment-proof v3 checkout failed',e);if(error)error.textContent=e?.code==='permission-denied'?'The store is not currently accepting orders. Please contact Mirella Glow support.':(e.message||'We could not place the order. Please check your details and try again.');button.disabled=false;button.textContent=`Place order · ${money(subtotal(items)+shipping(subtotal(items)))}`}
}

function patch(){const form=$('checkoutForm');if(!form)return;form.dataset.mgPaymentProofV3='1';form.onsubmit=placeOrderWithoutStorage;const card=$('checkoutModal')?.querySelector('.modal-card');if(card){card.classList.add('mg-checkout-card');card.style.maxHeight='calc(100dvh - 36px)';card.style.overflow='hidden'}form.style.overflowY='auto';form.style.minHeight='0';form.style.maxHeight='calc(100dvh - 120px)'}

patch();new MutationObserver(patch).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',patch);setTimeout(patch,100);setTimeout(patch,500);setTimeout(patch,1500);
