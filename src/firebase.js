import { initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut as fbSignOut, connectAuthEmulator, signInWithCredential,
} from "firebase/auth";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  connectFirestoreEmulator,
} from "firebase/firestore";

// The web API key is meant to be public; access is controlled by Firestore security rules
// (see firestore.rules in this repo).
const host = typeof location !== "undefined" ? location.hostname : "";
const onFirebaseHosting = /\.(web\.app|firebaseapp\.com)$/.test(host);

const config = {
  apiKey: "AIzaSyD0dFnF9EGp79tu0BBD8SxtSLh_Ka5QScQ",
  // When served from Firebase Hosting, use our own domain so redirect sign-in works in
  // browsers that block third-party storage (iOS Safari / home-screen app).
  authDomain: onFirebaseHosting ? host : "workout-tracker-9bf96.firebaseapp.com",
  projectId: "workout-tracker-9bf96",
  storageBucket: "workout-tracker-9bf96.firebasestorage.app",
  messagingSenderId: "966310189143",
  appId: "1:966310189143:web:5f58609acdaf4870926b12",
};

export const app = initializeApp(config);
export const auth = getAuth(app);

let firestore;
try {
  // Offline cache: writes made offline are queued and synced when back online.
  firestore = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) {
  console.warn("Persistent cache unavailable, using memory cache", e);
  firestore = initializeFirestore(app, { localCache: memoryLocalCache() });
}
export const db = firestore;

// Local testing against the Firebase emulators: open the app with ?emulator=1
export const usingEmulator = typeof location !== "undefined" && /[?&]emulator=1/.test(location.search);
if (usingEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  // Test hook: sign in as a fake Google user without a popup.
  window.__emulatorSignIn = async (sub = "test-user", email = "test@example.com") => {
    return signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub, email, email_verified: true, name: "Test User" })));
  };
}

const provider = new GoogleAuthProvider();

export const isStandalone = () =>
  (typeof matchMedia !== "undefined" && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;

// Popups don't work reliably in an installed home-screen app, so use a full-page redirect there.
export async function signIn() {
  if (isStandalone()) return signInWithRedirect(auth, provider);
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-environment", "auth/web-storage-unsupported"].includes(e?.code)) {
      return signInWithRedirect(auth, provider);
    }
    if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return;
    throw e;
  }
}
export const completeRedirectSignIn = () => getRedirectResult(auth);
export const signOut = () => fbSignOut(auth);
export const onAuth = (cb) => onAuthStateChanged(auth, cb);
