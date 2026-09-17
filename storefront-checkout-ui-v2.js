import { getApps, getApp, initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getFirestore, collection, getDocs, getDoc, doc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';

const cfg = window.MIRELLA_FIREBASE_CONFIG;
if (!cfg) throw new Error('Mirella Firebase configuration is unavailable.');
const app = getApps().length ? getApp() : initializeApp(cfg);
const db = getFirestore(app);
const storage = getStorage(app);
const $ = id => document.getElementById(id);
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let cart = [];
let catalog = [];
let store = { upiId:'', qrUrl:'' };
let catalogLoaded = false;

function readCart(){
  try { const value = JSON.parse(localStorage.getItem('mirella-cart') || '[]'); cart = Array.isArray(value) ? value : []; }
  catch { cart = []; }
}
function writeCart(){ localStorage.setItem('mirella-cart', JSON.stringify(cart)); updateCount(); }
function updateCount(){ const n=cart.reduce((s,x)=>s+Number(x.qty||0),0); if($('cartCount')) $('cartCount').textContent=n; }
function toast(message){ const t=$('toast'); if(!t){ alert(message); return; } t.textContent=message; t.classList.add('show'); clearTimeout(window.__mgToast); window.__mgToast=setTimeout(()=>t.classList.remove('show'),2600); }
function subtotal(){ return cart.reduce((s,x)=>s+Number(x.price||0)*Number(x.qty||0),0); }
function shipping(){ return subtotal() >= 999 ? 0 : 99; }
function grand(){ return subtotal()+shipping(); }

async function loadData(){
  readCart();
  try {
    const [p,s] = await Promise.all([getDocs(collection(db,'products')), getDoc(doc(db,'settings','store'))]);
    catalog = p.docs.map(d=>({id:d.id,...d.data()}));
    catalogLoaded = true;
    if(s.exists()) store = {...store,...s.data()};
    syncCatalogFields();
  } catch(e) {
    console.warn('[Mirella Glow] Checkout catalog read failed; keeping local bag intact.',e);
    catalogLoaded = false;
  }
}
function syncCatalogFields(){
  if(!catalogLoaded) return;
  cart = cart.map(item=>{
    const p=catalog.find(x=>x.id===item.id);
    if(!p || p.active===false) return {...item, unavailable:true};
    return {...item,name:p.name||item.name,price:Number(p.price||item.price||0),imageUrl:p.imageUrl||item.imageUrl||'',maxStock:Number(p.stock||0),unavailable:Number(p.stock||0)<=0};
  });
  writeCart();
}
function validCart(){ return cart.filter(x=>!x.unavailable && Number(x.qty||0)>0); }

function injectStyle(){
  if($('mirellaCheckoutUiV2')) return;
  const style=document.createElement('style'); style.id='mirellaCheckoutUiV2';
  style.textContent=`
  .mg-bag-title{font:500 38px/1 'Playfair Display';margin:0}.mg-kicker{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:700}.mg-empty{padding:58px 12px;text-align:center}.mg-empty strong{display:block;font:500 31px 'Playfair Display';margin:10px 0}.mg-empty span{display:block;color:var(--muted);font-size:11px;line-height:1.7}.mg-item{display:grid;grid-template-columns:78px minmax(0,1fr) auto;gap:13px;padding:16px 0;border-bottom:1px solid var(--line);align-items:center}.mg-item img{width:78px;height:94px;object-fit:cover;border-radius:11px;background:#f2e6e0}.mg-item-name{font:500 17px 'Playfair Display';margin:4px 0}.mg-item-price{font-size:10px;color:var(--muted)}.mg-line{font-weight:700;font-size:13px;white-space:nowrap}.mg-qty{display:flex;align-items:center;gap:8px;margin-top:10px}.mg-qty button{width:28px;height:28px;border:1px solid var(--line);background:#fff;border-radius:50%}.mg-remove{border:0;background:none;padding:4px 0;margin-top:4px;color:var(--muted);font-size:8px;letter-spacing:.12em;text-transform:uppercase}.mg-progress{margin:17px 0;padding:13px;border:1px solid var(--line);border-radius:12px;background:#f8eee9;font-size:10px;line-height:1.5}.mg-progress b{color:var(--accent)}.mg-summary{border-top:1px solid var(--line);padding-top:15px}.mg-row{display:flex;justify-content:space-between;gap:12px;margin:8px 0;font-size:11px;color:var(--muted)}.mg-row.total{font-size:15px;color:var(--ink);font-weight:700;margin-top:13px}.mg-checkout{width:100%;margin-top:15px}.mg-warning{margin-top:12px;padding:11px;border-radius:10px;background:#fff1ed;color:#8f4c45;font-size:10px;line-height:1.5}.mg-checkout-card{width:min(780px,100%)!important;padding:0!important;overflow:hidden!important}.mg-shell{padding:30px}.mg-top{display:flex;justify-content:space-between;gap:18px;padding-bottom:20px;border-bottom:1px solid var(--line)}.mg-title{font:500 40px/1.02 'Playfair Display';margin:5px 0}.mg-sub{max-width:540px;color:var(--muted);font-size:11px;line-height:1.7}.mg-steps{display:flex;gap:7px;margin:19px 0}.mg-step{padding:7px 11px;border-radius:99px;background:#f3e7e1;color:var(--muted);font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}.mg-step.active{background:var(--dark);color:#fff}.mg-form{display:grid;gap:13px}.mg-section{padding:19px;background:#fff;border:1px solid var(--line);border-radius:15px}.mg-section h3{font:500 24px 'Playfair Display';margin:0 0 4px}.mg-section>p{margin:0 0 14px;color:var(--muted);font-size:10px;line-height:1.55}.mg-fields{display:grid;grid-template-columns:1fr 1fr;gap:11px}.mg-field.full{grid-column:1/-1}.mg-field label{display:block;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4f4440}.mg-field input,.mg-field textarea,.mg-field select{width:100%;margin-top:6px;border:1px solid var(--line);background:#fffaf7;border-radius:9px;padding:12px;outline:none;font-size:12px}.mg-field textarea{min-height:86px;resize:vertical}.mg-field input:focus,.mg-field textarea:focus,.mg-field select:focus{border-color:var(--accent);box-shadow:0 0 0 3px #a45e5612}.mg-payment-choice{display:grid;grid-template-columns:1fr 1fr;gap:9px}.mg-pay-option{position:relative}.mg-pay-option input{position:absolute;opacity:0}.mg-pay-option label{display:block;padding:14px;border:1px solid var(--line);border-radius:11px;background:#fff;cursor:pointer}.mg-pay-option input:checked+label{border-color:var(--accent);background:#fbefeb;box-shadow:0 0 0 2px #a45e5612}.mg-pay-option b{display:block;font-size:11px;margin-bottom:3px}.mg-pay-option span{display:block;color:var(--muted);font-size:9px;line-height:1.4}.mg-payment-panel{margin-top:12px;padding:15px;border:1px solid var(--line);border-radius:12px;background:#f8eee9}.mg-payment-amount{display:flex;justify-content:space-between;align-items:center;font-size:11px}.mg-payment-amount strong{font-size:18px}.mg-qr{text-align:center;margin:13px 0}.mg-qr img{width:150px;height:150px;object-fit:contain;background:#fff;border-radius:10px;padding:7px}.mg-upi{text-align:center;font-size:11px}.mg-pay-actions{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.mg-pay-actions a{flex:1;min-width:100px;text-align:center;border:1px solid var(--dark);background:#fff;border-radius:99px;padding:10px;font-size:9px;font-weight:700}.mg-proof{margin-top:9px;color:var(--muted);font-size:9px;line-height:1.5}.mg-review{padding:18px;background:var(--dark);color:#fff;border-radius:15px}.mg-review .mg-row{color:#cfc1bc}.mg-review .mg-row.total{color:#fff}.mg-place{width:100%;margin-top:13px}.mg-secure{text-align:center;color:var(--muted);font-size:9px;margin-top:10px}.mg-error{min-height:17px;color:#a44e45;font-size:10px;line-height:1.5;margin-top:8px}.mg-success{text-align:center;padding:35px 20px}.mg-success .eyebrow{display:block}.mg-success h2{font:500 44px 'Playfair Display';margin:8px 0}.mg-success .number{font-weight:800;letter-spacing:.1em}.mg-success p{max-width:480px;margin:10px auto;color:var(--muted);font-size:11px;line-height:1.7}@media(max-width:620px){.mg-shell{padding:20px}.mg-fields,.mg-payment-choice{grid-template-columns:1fr}.mg-field.full{grid-column:auto}.mg-title{font-size:33px}.mg-item{grid-template-columns:64px minmax(0,1fr)}.mg-item img{width:64px;height:78px}.mg-line{grid-column:2}.mg-checkout-card{max-height:95vh}}
  `; document.head.appendChild(style);
}

function renderBag(){
  readCart(); updateCount();
  const items=$('cartItems'), summary=$('cartSummary'); if(!items||!summary)return;
  const active=validCart();
  if(!active.length){
    const unavailable=cart.some(x=>x.unavailable);
    items.innerHTML=`<div class="mg-empty"><span class="mg-kicker">Your edit</span><strong>Your bag is waiting.</strong><span>Add a few beautiful essentials and your order will appear here.</span></div>${unavailable?'<div class="mg-warning">One or more saved items are currently unavailable. They have been kept out of the order until stock is restored.</div>':''}`;
    summary.innerHTML=''; return;
  }
  cart=active; writeCart();
  items.innerHTML=cart.map(x=>`<article class="mg-item"><img src="${esc(x.imageUrl||'')}" alt="${esc(x.name)}"><div><div class="mg-kicker">Mirella Glow</div><div class="mg-item-name">${esc(x.name)}</div><div class="mg-item-price">${money(x.price)} each</div><div class="mg-qty"><button type="button" data-mg-dec="${esc(x.id)}">−</button><b>${x.qty}</b><button type="button" data-mg-inc="${esc(x.id)}">+</button></div><button type="button" class="mg-remove" data-mg-remove="${esc(x.id)}">Remove</button></div><div class="mg-line">${money(Number(x.price||0)*Number(x.qty||0))}</div></article>`).join('');
  const sub=subtotal(), ship=shipping();
  summary.innerHTML=`<div class="mg-progress">${sub>=999?'<b>Free shipping unlocked.</b> Your order qualifies for complimentary delivery.':`Add <b>${money(999-sub)}</b> more for free shipping.`}</div><div class="mg-summary"><div class="mg-row"><span>Subtotal</span><span>${money(sub)}</span></div><div class="mg-row"><span>Shipping</span><span>${ship?money(ship):'Free'}</span></div><div class="mg-row total"><span>Total</span><span>${money(grand())}</span></div><button type="button" class="hero-cta mg-checkout" id="mgCheckoutBtn">Complete your order</button></div>`;
  document.querySelectorAll('[data-mg-inc]').forEach(b=>b.onclick=()=>changeQty(b.dataset.mgInc,1));
  document.querySelectorAll('[data-mg-dec]').forEach(b=>b.onclick=()=>changeQty(b.dataset.mgDec,-1));
  document.querySelectorAll('[data-mg-remove]').forEach(b=>b.onclick=()=>removeItem(b.dataset.mgRemove));
  $('mgCheckoutBtn').onclick=openCheckout;
}
function changeQty(id,delta){ const item=cart.find(x=>x.id===id); if(!item)return; const max=Number(item.maxStock||999); item.qty+=delta; if(item.qty<=0)cart=cart.filter(x=>x.id!==id); else item.qty=Math.min(item.qty,max); writeCart(); renderBag(); }
function removeItem(id){cart=cart.filter(x=>x.id!==id);writeCart();renderBag();}

function checkoutMarkup(){
  const sub=subtotal(),ship=shipping();
  return `<div class="mg-shell"><div class="mg-top"><div><div class="mg-kicker">Mirella Glow checkout</div><div class="mg-title">Complete your order.</div><div class="mg-sub">Enter your delivery details, choose your payment method and review the total before placing your order.</div></div><button type="button" class="close" id="mgCheckoutClose" aria-label="Close checkout">×</button></div><div class="mg-steps"><span class="mg-step active">01 Details</span><span class="mg-step">02 Payment</span><span class="mg-step">03 Confirm</span></div><div class="mg-form"><section class="mg-section"><h3>Delivery details</h3><p>These details are used only to process and deliver this order.</p><div class="mg-fields"><div class="mg-field"><label for="mgName">Full name</label><input id="mgName" required autocomplete="name" placeholder="Your full name"></div><div class="mg-field"><label for="mgPhone">Mobile number</label><input id="mgPhone" type="tel" required autocomplete="tel" inputmode="numeric" pattern="[0-9+()\\- ]{10,}" placeholder="10-digit mobile number"></div><div class="mg-field"><label for="mgEmail">Email <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></label><input id="mgEmail" type="email" autocomplete="email" placeholder="you@example.com"></div><div class="mg-field"><label for="mgPincode">PIN code</label><input id="mgPincode" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="6-digit PIN code"></div><div class="mg-field full"><label for="mgAddress">Full address</label><textarea id="mgAddress" required autocomplete="street-address" placeholder="House / flat, street, area"></textarea></div><div class="mg-field"><label for="mgCity">City</label><input id="mgCity" required autocomplete="address-level2" placeholder="City"></div><div class="mg-field"><label for="mgState">State</label><input id="mgState" required autocomplete="address-level1" placeholder="State"></div></div></section><section class="mg-section"><h3>Payment</h3><p>Choose one payment method. UPI orders require a successful payment screenshot for verification.</p><div class="mg-payment-choice"><div class="mg-pay-option"><input id="mgCod" name="mgPayment" type="radio" value="cod" checked><label for="mgCod"><b>Cash on delivery</b><span>Pay when your order is delivered.</span></label></div>${store.upiId?`<div class="mg-pay-option"><input id="mgUpi" name="mgPayment" type="radio" value="upi"><label for="mgUpi"><b>UPI — Pay now</b><span>Pay through your preferred UPI app.</span></label></div>`:''}</div><div id="mgPaymentPanel"></div></section><section class="mg-review"><div class="mg-row"><span>Subtotal</span><span>${money(sub)}</span></div><div class="mg-row"><span>Shipping</span><span>${ship?money(ship):'Free'}</span></div><div class="mg-row total"><span>Order total</span><span>${money(sub+ship)}</span></div><button class="hero-cta mg-place" id="mgPlaceOrder" type="submit">Place order · ${money(sub+ship)}</button><div class="mg-secure">Your order will be recorded securely in the Mirella Glow store system.</div><div id="mgCheckoutError" class="mg-error"></div></section></div></div>`;
}
function paymentPanel(method){
  const panel=$('mgPaymentPanel'); if(!panel)return;
  if(method!=='upi'){panel.innerHTML='';return;}
  const amount=grand();
  const base=`pa=${encodeURIComponent(store.upiId||'')}&pn=Mirella%20Glow&am=${amount.toFixed(2)}&cu=INR`;
  panel.innerHTML=`<div class="mg-payment-panel"><div class="mg-payment-amount"><span>Pay exactly</span><strong>${money(amount)}</strong></div>${store.qrUrl?`<div class="mg-qr"><img src="${esc(store.qrUrl)}" alt="Mirella Glow UPI QR"></div>`:''}<div class="mg-upi">UPI ID: <b>${esc(store.upiId||'Not configured')}</b></div><div class="mg-pay-actions"><a href="upi://pay?${base}">Open UPI</a><a href="tez://upi/pay?${base}">Google Pay</a><a href="phonepe://pay?${base}">PhonePe</a></div><div class="mg-field"><label for="mgProof">Payment screenshot</label><input id="mgProof" type="file" accept="image/*" required><div class="mg-proof">Complete the payment first, then upload the successful screenshot. Maximum 5 MB.</div></div></div>`;
}
function openCheckout(){
  readCart();
  if(!validCart().length){toast('Your bag is empty.');return;}
  const modal=$('checkoutModal'),form=$('checkoutForm');
  if(!modal||!form){toast('Checkout is temporarily unavailable. Please refresh and try again.');return;}
  if($('cartDrawer'))$('cartDrawer').classList.remove('open');
  const card=modal.querySelector('.modal-card'); if(card)card.classList.add('mg-checkout-card');
  const result=$('checkoutResult'); if(result)result.innerHTML='';
  form.style.display='block'; form.innerHTML=checkoutMarkup(); modal.classList.add('open');
  $('mgCheckoutClose').onclick=()=>modal.classList.remove('open');
  document.querySelectorAll('input[name="mgPayment"]').forEach(r=>r.onchange=()=>paymentPanel(r.value));
  paymentPanel('cod'); form.onsubmit=placeOrder;
}
async function uploadProof(file){
  if(!file)throw Error('Please upload your successful UPI payment screenshot.');
  if(!file.type.startsWith('image/'))throw Error('Payment proof must be an image.');
  if(file.size>5*1024*1024)throw Error('Payment screenshot must be 5 MB or smaller.');
  const safe=file.name.replace(/[^a-z0-9._-]/gi,'-');
  const r=ref(storage,`payment-proofs/${Date.now()}-${safe}`);
  await uploadBytes(r,file,{contentType:file.type});
  return getDownloadURL(r);
}
async function placeOrder(event){
  event.preventDefault(); readCart(); const form=event.currentTarget; if(!validCart().length){toast('Your bag is empty.');return;}
  if(!form.reportValidity())return;
  const button=$('mgPlaceOrder'), error=$('mgCheckoutError'); button.disabled=true; button.textContent='Placing your order…'; if(error)error.textContent='';
  try{
    const payment=document.querySelector('input[name="mgPayment"]:checked')?.value||'cod';
    const customer={name:$('mgName').value.trim(),phone:$('mgPhone').value.trim(),email:$('mgEmail').value.trim(),address:$('mgAddress').value.trim(),city:$('mgCity').value.trim(),state:$('mgState').value.trim(),pincode:$('mgPincode').value.trim()};
    let proof=''; if(payment==='upi')proof=await uploadProof($('mgProof')?.files?.[0]);
    const items=validCart().map(x=>({productId:x.id,name:x.name,price:Number(x.price||0),qty:Number(x.qty||0),imageUrl:x.imageUrl||''}));
    const sub=items.reduce((s,x)=>s+x.price*x.qty,0), ship=sub>=999?0:99;
    const orderNumber=`MG-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    const order={orderNumber,customer,items,subtotal:sub,shipping:ship,total:sub+ship,status:'new',paymentStatus:'pending',paymentMethod:payment,paymentProofUrl:proof,upiId:payment==='upi'?store.upiId:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    await addDoc(collection(db,'orders'),order);
    cart=[];writeCart();form.style.display='none';
    const result=$('checkoutResult'); if(result)result.innerHTML=`<div class="mg-success"><span class="eyebrow">Order received</span><h2>Thank you.</h2><div class="number">${esc(orderNumber)}</div><p>${payment==='upi'?'Your payment screenshot has been received. The Mirella team will verify the payment and process your order.':'Your COD order has been recorded successfully. The Mirella team will contact you using the details provided.'}</p><button type="button" class="hero-cta" id="mgContinue">Continue shopping</button></div>`;
    $('mgContinue').onclick=()=>{modalClose();location.hash='shop';};
    renderBag();
  }catch(e){console.error('[Mirella Glow] order placement failed',e);if(error)error.textContent=e?.code==='permission-denied'?'The store is not currently accepting orders. Please contact Mirella Glow support.':(e.message||'We could not place the order. Please check your details and try again.');button.disabled=false;button.textContent=`Place order · ${money(grand())}`;}
}
function modalClose(){ $('checkoutModal')?.classList.remove('open'); }

function bind(){
  injectStyle(); readCart(); updateCount();
  const card=$('checkoutModal')?.querySelector('.modal-card'); if(card)card.classList.add('mg-checkout-card');
  if($('cartBtn'))$('cartBtn').onclick=()=>{renderBag();$('cartDrawer')?.classList.add('open');};
  if($('closeCart'))$('closeCart').onclick=()=>$('cartDrawer')?.classList.remove('open');
  if($('closeCheckout'))$('closeCheckout').onclick=modalClose;
  renderBag();
}

(async()=>{await loadData();bind();})();
