import{initializeApp,getApps,getApp}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';import{getAuth,onAuthStateChanged}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';import{getFirestore,doc,getDoc}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';import{firebaseConfig}from'./firebase-config.js';
if(new URLSearchParams(location.search).get('open')==='media'){
 const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
 onAuthStateChanged(auth,async user=>{if(!user)return;try{const s=await getDoc(doc(db,'admins',user.uid));if(s.exists()&&s.data().active===true)location.replace('media.html')}catch(e){console.warn('[Mirella Glow] Media redirect check failed',e)}});
}
