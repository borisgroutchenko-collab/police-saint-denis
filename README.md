# Police de Saint-Denis — Système Judiciaire

Application React connectée à Firebase Firestore.

## Structure des fichiers

```
src/
├── firebase.js              ← CONFIG FIREBASE + MOT DE PASSE
├── data/
│   └── penalCode.js         ← CODE PÉNAL (articles à modifier ici)
├── components/
│   ├── Verbalization.js     ← Formulaire de verbalisation
│   ├── Casier.js            ← Casier judiciaire + dossiers
│   └── CodePenal.js         ← Affichage du code pénal
├── utils/
│   └── exportPDF.js         ← Export PDF pour le juge
├── hooks/
│   └── useNotif.js          ← Système de notifications
├── App.js                   ← Routeur principal + login
└── index.css                ← Tous les styles
```

## Modifications courantes

### Changer le mot de passe
Ouvrez `src/firebase.js` et modifiez :
```js
export const APP_PASSWORD = "votre_nouveau_mot_de_passe";
```

### Modifier la config Firebase
Ouvrez `src/firebase.js` et modifiez le bloc `firebaseConfig`.

### Ajouter / modifier un article du code pénal
Ouvrez `src/data/penalCode.js`.  
Chaque article a la structure :
```js
{
  num:    "Art.XX",          // identifiant
  nom:    "Nom de l'infraction",
  desc:   "Description...",
  peine:  "Max 100 $",       // texte affiché dans le code pénal
  amende: 100,               // montant en $ (0 si pas d'amende fixe)
  sisika: false,             // true si peine de Sisika
}
```

### Déployer sur GitHub Pages
```bash
# Dans Git Bash, à la racine du projet :
git add .
git commit -m "mise à jour"
git push
npm run build
npm run deploy
```

## Premier déploiement
1. `npm install`
2. Ajoutez dans `package.json` la ligne `"homepage": "https://VOTRE_PSEUDO.github.io/NOM_DU_REPO"`
3. `npm run deploy`
4. Sur GitHub : Settings → Pages → Source : branche `gh-pages`
