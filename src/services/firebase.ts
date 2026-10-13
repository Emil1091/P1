import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Firestore } from 'firebase/firestore';
import type { OLTDevice } from '../types/ftth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyMockApiKey_DemoPurposeOnly_FtthApp",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ftth-designer-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ftth-designer-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ftth-designer-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: Firestore | null = null;
let isConfigured = false;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
  isConfigured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);
} catch (e) {
  console.warn("Firebase inicializado en modo Offline/Local:", e);
}

export { auth, db, isConfigured };

export async function loginWithGoogle(): Promise<User | null> {
  if (!auth) throw new Error("Firebase Auth no disponible");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export async function saveProjectToFirestore(userId: string, olts: OLTDevice[], projectName = "FTTH OLTs") {
  if (!db) throw new Error("Firestore no disponible");
  const projectRef = doc(db, 'projects', userId);
  await setDoc(projectRef, {
    projectName,
    updatedAt: new Date().toISOString(),
    data: olts
  }, { merge: true });
}

export async function loadProjectFromFirestore(userId: string): Promise<OLTDevice[] | null> {
  if (!db) return null;
  const projectRef = doc(db, 'projects', userId);
  const snap = await getDoc(projectRef);
  if (snap.exists()) {
    const data = snap.data();
    return data.data as OLTDevice[];
  }
  return null;
}
