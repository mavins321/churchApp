import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import fallbackConfig from '../../firebase-applet-config.json';

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

// Support both environment variables (recommended for GitHub repos) and local config
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || fallbackConfig.apiKey,
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || fallbackConfig.authDomain,
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || fallbackConfig.projectId,
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || fallbackConfig.storageBucket,
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || fallbackConfig.messagingSenderId,
  appId: getEnv('VITE_FIREBASE_APP_ID') || fallbackConfig.appId,
  firestoreDatabaseId: getEnv('VITE_FIREBASE_DATABASE_ID') || fallbackConfig.firestoreDatabaseId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use named firestore database ID as specified in configuration
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export default app;
