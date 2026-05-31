// ============================================================
//  CONFIGURATION FIREBASE
//  Remplacez les valeurs ci-dessous par celles de votre projet.
//  Console Firebase → Votre projet → Paramètres → Config web
// ============================================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "AIzaSyCjhCVWg18qw5Tb_xfFvcd9bqWb31jSqxE",
  authDomain:        "police-crossroad.firebaseapp.com",
  projectId:         "police-crossroad",
  storageBucket:     "police-crossroad.firebasestorage.app",
  messagingSenderId: "591957101819",
  appId:             "1:591957101819:web:59acce6d4826557e69f45e",
};

// ============================================================
//  MOT DE PASSE DE CONNEXION
//  Changez cette valeur pour modifier le mot de passe.
// ============================================================
export const APP_PASSWORD = "sheriff1905";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
