export const firebaseConfig = {
  apiKey: "AIzaSyCF4JC5Rhjq0E2Zh2rehVPCfklKXjBxG4E",
  authDomain: "mirella-glow-6a3f1.firebaseapp.com",
  projectId: "mirella-glow-6a3f1",
  storageBucket: "mirella-glow-6a3f1.firebasestorage.app",
  messagingSenderId: "728355246638",
  appId: "1:728355246638:web:930656169ecf8298a245bf"
};
if(typeof window!=='undefined') window.MIRELLA_FIREBASE_CONFIG=firebaseConfig;
if(typeof document!=='undefined'){
  if(document.getElementById('concernGrid')) import('./storefront-slider.js');
  if(location.pathname==='/'||location.pathname==='/index.html'){
    const style=document.createElement('style');
    style.textContent='.story-art.has-store-image{background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important;background-color:#f7e9e3!important}.story-art.has-store-image:after{display:none!important}.story-art.has-store-image span{display:none!important}.brand img{width:auto!important;height:auto!important;max-width:58px!important;max-height:58px!important;object-fit:contain!important;object-position:center!important;flex:0 0 auto!important}';
    document.head.appendChild(style);
    setTimeout(()=>import('./storefront-checkout-ui-v2.js').catch(e=>console.error('[Mirella Glow] checkout UI failed to load',e)),0);
    setTimeout(()=>import('./storefront-checkout-fixes.js').catch(e=>console.error('[Mirella Glow] checkout fixes failed to load',e)),250);
    setTimeout(()=>import('./storefront-payment-proof-fix-v3.js').catch(e=>console.error('[Mirella Glow] payment proof v3 failed to load',e)),750);
  }
  if(location.pathname.endsWith('/admin.html')&&new URLSearchParams(location.search).get('open')==='media') setTimeout(()=>import('./admin-media-bridge.js').catch(e=>console.error('[Mirella Glow] media redirect bridge failed',e)),0);
}
