import { getApps, getApp, initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const params = new URLSearchParams(location.search);
if (params.get('open') === 'media') {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  let redirected = false;
  const redirect = () => { if (!redirected) { redirected = true; location.replace('media.html'); } };
  (async()=>{
    try { await setPersistence(auth, browserLocalPersistence); } catch(e) { console.warn('[Mirella Glow] Auth persistence setup failed',e); }
    onAuthStateChanged(auth, async user=>{
      if (!user || redirected) return;
      try {
        const snap = await getDoc(doc(db,'admins',user.uid));
        if (snap.exists() && snap.data()?.active === true) redirect();
      } catch(e) { console.warn('[Mirella Glow] Media access check failed',e); }
    });
  })();
}
