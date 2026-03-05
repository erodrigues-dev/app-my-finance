import Constants from "expo-constants";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

type FirebaseExtraConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

function readConfig(): FirebaseExtraConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as { firebase?: FirebaseExtraConfig };
  return extra.firebase ?? {};
}

export function isFirebaseConfigured(): boolean {
  const cfg = readConfig();
  return Boolean(cfg.apiKey && cfg.projectId && cfg.appId && cfg.messagingSenderId);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (firebaseApp) return firebaseApp;
  const cfg = readConfig();
  if (!isFirebaseConfigured()) return null;

  firebaseApp = getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey: cfg.apiKey!,
        authDomain: cfg.authDomain,
        projectId: cfg.projectId!,
        storageBucket: cfg.storageBucket,
        messagingSenderId: cfg.messagingSenderId!,
        appId: cfg.appId!,
      });

  return firebaseApp;
}

export function getFirestoreDb(): Firestore | null {
  if (firestoreDb) return firestoreDb;
  const app = getFirebaseApp();
  if (!app) return null;
  firestoreDb = getFirestore(app);
  return firestoreDb;
}
