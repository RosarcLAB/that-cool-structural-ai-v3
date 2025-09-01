// config/firebase.ts: Initializes and exports the Firebase and Firestore instances.

// FIX: Switched to named imports for Firebase v9+ modular SDK.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';

// --- IMPORTANT ---
// Replace the placeholder values below with your own Firebase project's configuration.
// You can find your config in your Firebase project console:
// Project Settings > General > Your apps > Firebase SDK snippet > Config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};



// const _meta: any = import.meta;

// const firebaseConfig = {
//   apiKey: _meta.env?.VITE_FIREBASE_API_KEY ?? "",
//   authDomain: _meta.env?.VITE_FIREBASE_AUTH_DOMAIN ?? "",
//   projectId: _meta.env?.VITE_FIREBASE_PROJECT_ID ?? "",
//   storageBucket: _meta.env?.VITE_FIREBASE_STORAGE_BUCKET ?? "",
//   messagingSenderId: _meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
//   appId: _meta.env?.VITE_FIREBASE_APP_ID ?? "",
// }
// Check if the configuration has been filled out or still contains placeholders.
export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId !== "YOUR_PROJECT_ID";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// Only initialize Firebase if the configuration is valid.
if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  
  // Enable offline persistence to improve user experience during connection issues.
  try {
      enableIndexedDbPersistence(db);
  } catch (err: any) {
      if (err.code === 'failed-precondition') {
          // This can happen if multiple tabs are open. Persistence works in one tab at a time.
          console.warn('Firestore persistence failed: Multiple tabs open. App will still function online.');
      } else if (err.code === 'unimplemented') {
          // The browser doesn't support the features needed for persistence.
          console.warn('Firestore persistence is not supported in this browser. App will still function online.');
      }
  }
} else {
    // Log a clear warning to the console for developers.
    console.warn("Firebase is not configured. Please add your project credentials to config/firebase.ts. Persistence features like 'Manage Sections' will be disabled.");
}

// Export the potentially null Firestore instance.
export { db };
