// Utilitaire d'authentification nominative basé sur la collection effectif
import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Hash SHA-256 (renvoie une chaîne hexadécimale)
export async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Mot de passe maître de secours (au cas où aucun compte n'existe encore)
export const MASTER_PASSWORD = 'BT1905CR';

// Tente de connecter un agent par identifiant + mot de passe
// Renvoie l'objet agent { id, nom, prenom, grade, identifiant } si OK, sinon null
export async function authenticate(identifiant, motDePasse) {
  const id = (identifiant || '').trim().toLowerCase();
  if (!id) return null;
  try {
    const snap = await getDocs(query(collection(db, 'effectif'), where('identifiant', '==', id)));
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    const agent = { id: docSnap.id, ...docSnap.data() };
    if (agent.actif === false) return null; // compte désactivé
    if (!agent.motDePasseHash) return null;  // pas de mot de passe défini
    const hash = await sha256(motDePasse);
    if (hash === agent.motDePasseHash) {
      return { id: agent.id, nom: agent.nom, prenom: agent.prenom, grade: agent.grade, identifiant: agent.identifiant };
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Vérifie le mot de passe maître
export async function checkMaster(motDePasse) {
  return motDePasse === MASTER_PASSWORD;
}
