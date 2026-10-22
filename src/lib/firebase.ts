import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Default project parameters (no external JSON file required)
const DEFAULT_CONFIG = {
  projectId: "gen-lang-client-0977597727",
  appId: "1:1078381596207:web:75b7fb1dc79e164fef40da",
  apiKey: "AIzaSyCrW5rodnEBisqMZpbG7V0pZ6Wl8rJ_OrU",
  authDomain: "gen-lang-client-0977597727.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-6c36ddf5-59c3-4c66-8e1c-c86b06845eb4",
  storageBucket: "gen-lang-client-0977597727.firebasestorage.app",
  messagingSenderId: "1078381596207"
};

// Safely extract environment variables in both Node.js (server.ts) and Vite client
const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch {
    // ignore in environments without import.meta
  }
  return undefined;
};

// Support environment variables with default project fallback
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || DEFAULT_CONFIG.apiKey,
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || DEFAULT_CONFIG.authDomain,
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || DEFAULT_CONFIG.projectId,
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || DEFAULT_CONFIG.storageBucket,
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || DEFAULT_CONFIG.messagingSenderId,
  appId: getEnv('VITE_FIREBASE_APP_ID') || DEFAULT_CONFIG.appId,
  firestoreDatabaseId: getEnv('VITE_FIREBASE_DATABASE_ID') || DEFAULT_CONFIG.firestoreDatabaseId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use named firestore database ID as specified in configuration
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export default app;
