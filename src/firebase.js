// ============================================================
//  CONFIGURATION FIREBASE
//  Projet : police-de-saint-denis
//  Console Firebase → Paramètres → Config web
// ============================================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "AIzaSyDw4Ud05KjFNC_wMVbW31OxFL99WnHrwD0",
  authDomain:        "police-de-saint-denis.firebaseapp.com",
  projectId:         "police-de-saint-denis",
  storageBucket:     "police-de-saint-denis.firebasestorage.app",
  messagingSenderId: "380234875387",
  appId:             "1:380234875387:web:98d557faa5952600878b5e",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
