import React, { useState } from 'react';
import './index.css';
import { APP_PASSWORD, db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNotif } from './hooks/useNotif';
import Verbalization from './components/Verbalization';
import Casier from './components/Casier';
import CodePenal from './components/CodePenal';
import Effectif from './components/Effectif';
import Citoyens from './components/Citoyens';
import Plaintes from './components/Plaintes';
import Notes from './components/Notes';
import Groupes from './components/Groupes';
import News from './components/News';
import Convocations from './components/Convocations';
import Saisies from './components/Saisies';
import RegistreArmes from './components/RegistreArmes';

// ── Logo (même image base64 que le fichier original) ──────────
// Remplacez cette URL par un lien vers votre logo si vous le souhaitez.
const LOGO_URL = null; // null = initiales affichées à la place

function Login({ onLogin }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);

  function submit() {
    if (pw === APP_PASSWORD) { onLogin(); }
    else { setError(true); setPw(''); }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
      <div style={{
        background: 'linear-gradient(160deg, var(--dark2) 0%, var(--dark3) 100%)',
        border: '2px solid var(--gold)', borderRadius: 4, padding: '50px 60px',
        width: '100%', maxWidth: 480, textAlign: 'center',
        boxShadow: '0 0 60px rgba(201,168,76,.15), inset 0 1px 0 rgba(201,168,76,.2)',
        position: 'relative',
      }}>
        {/* Badge de la police */}
        <div style={{ width: 130, height: 130, borderRadius: '50%', border: '3px solid var(--gold)', margin: '0 auto 20px', background: 'var(--dark2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(201,168,76,.3)' }}>
          <span style={{ fontSize: 60 }}>⭐</span>
        </div>

        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: 'var(--gold)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
          Police de Saint-Denis
        </div>
        <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 14, color: 'rgba(244,237,216,.6)', letterSpacing: 2, marginBottom: 40 }}>
          Comté de Lemoyne — Anno Domini 1905
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(201,168,76,.3)', margin: '20px 0 30px' }} />

        <div style={{ marginBottom: 20, textAlign: 'left' }}>
          <label className="field-label">Mot de passe</label>
          <input
            type="password" className="field-input" placeholder="Mot de passe confidentiel"
            value={pw} onChange={e => { setPw(e.target.value); setError(false); }}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        </div>

        <button className="btn-submit" style={{ width: '100%', marginTop: 10 }} onClick={submit}>
          Accéder au Système
        </button>

        {error && <div style={{ color: '#ff6b6b', fontSize: 14, marginTop: 10 }}>⚠ Mot de passe incorrect</div>}

        <hr style={{ border: 'none', borderTop: '1px solid rgba(201,168,76,.3)', margin: '20px 0 10px' }} />
        <div style={{ fontSize: 11, color: 'rgba(244,237,216,.3)', fontFamily: "'Special Elite', cursive", letterSpacing: 1 }}>
          SYSTÈME JUDICIAIRE CONFIDENTIEL — ACCÈS RESTREINT
        </div>
      </div>
    </div>
  );
}

// ── Navigation tabs ──────────────────────────────────────────
const SECTIONS = [
  { key: 'news',          label: '📰 News' },
  { key: 'news',          label: '📰 News' },
  { key: 'citoyens',      label: '👥 Citoyens' },
  { key: 'groupes',       label: '⚔ Groupes' },
  { key: 'plaintes',      label: '📝 Dépôts de Plainte' },
  { key: 'verbalization', label: '📋 Verbalisation' },
  { key: 'casier',        label: '🗄 Casier Judiciaire' },
  { key: 'saisies',       label: '📦 Saisies' },
  { key: 'registreArmes', label: '🔫 Registre des Armes' },
  { key: 'convocations',  label: '📋 Convocations' },
  { key: 'notes',         label: '📌 Notes & Informations' },
  { key: 'penal',         label: '📖 Code Pénal' },
  { key: 'effectif',      label: '👮 Effectif' },
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [section, setSection] = useState('news');
  const [newsTarget, setNewsTarget] = useState(null); // { type, id }
  const [casierTarget, setCasierTarget] = useState(null); // idNum à ouvrir dans Casier
  const { notif, showNotif } = useNotif();

  function goToCasier(idNum) {
    setCasierTarget(idNum);
    setSection('casier');
  }

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  function handleNewsNavigate(type, id) {
    const map = {
      plainte:      'plaintes',
      verbalisation:'verbalisations',
      convocation:  'convocations',
      note:         'notes',
    };
    const target = map[type];
    if (!target) return;
    setNewsTarget({ type, id });
    setSection(target);
  }

  async function exportBackup() {
    showNotif('Export en cours...');
    try {
      const COLS = ['citoyens','casier','verbalisations','groupes','plaintes','saisies','convocations','notes','effectif'];
      const backup = { exportDate: new Date().toISOString(), collections: {} };
      for (const col of COLS) {
        try {
          const snap = await getDocs(collection(db, col));
          backup.collections[col] = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
        } catch (_) { backup.collections[col] = []; }
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'backup-' + new Date().toISOString().split('T')[0] + '.json';
      a.click(); URL.revokeObjectURL(url);
      showNotif('Backup exporté !');
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Notification */}
      <div className={`notif${notif.visible ? ' show' : ''}${notif.isError ? ' error' : ''}`}>
        {notif.msg}
      </div>

      {/* Topbar */}
      <div className="topbar">
        <div style={{ width: 50, height: 50, flexShrink: 0 }}>
          <img src="data:image/png;base64,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" alt="Logo Police de Lemoyne" style={{ width: 50, height: 50, objectFit: 'contain' }} />
        </div>
        <div>
          <div className="topbar-title">Police de Lemoyne</div>
          <div className="topbar-subtitle">Système Judiciaire — Comté de Lemoyne</div>
        </div>
        <div className="topbar-nav">
          {SECTIONS.map(s => (
            <button key={s.key} className={`nav-btn${section === s.key ? ' active' : ''}`} onClick={() => setSection(s.key)}>
              {s.label}
            </button>
          ))}
          <button
            onClick={exportBackup}
            style={{ marginRight: 6, background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.4)', borderRadius: 2, padding: '4px 12px', fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'var(--gold)', cursor: 'pointer', letterSpacing: 1 }}
            title="Exporter une sauvegarde JSON"
          >💾 Backup</button>
          <button
            onClick={exportBackup}
            style={{ marginRight: 6, background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.4)', borderRadius: 2, padding: '4px 12px', fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'var(--gold)', cursor: 'pointer', letterSpacing: 1 }}
            title="Exporter une sauvegarde JSON"
          >💾 Backup</button>
          <button className="logout-btn" onClick={() => setLoggedIn(false)}>Déconnexion</button>
        </div>
      </div>

      {/* Content */}
      <div className="main-content">
        {section === 'verbalization' && <Verbalization showNotif={showNotif} />}
        {section === 'casier'        && <Casier        showNotif={showNotif} initialDossierId={casierTarget} onDossierOpened={() => setCasierTarget(null)} />}
        {section === 'news'          && <News          showNotif={showNotif} onNavigate={handleNewsNavigate} />}
        {section === 'citoyens'      && <Citoyens      showNotif={showNotif} onGoToCasier={goToCasier} />}
        {section === 'groupes'       && <Groupes       showNotif={showNotif} />}
        {section === 'plaintes'      && <Plaintes      showNotif={showNotif} targetId={newsTarget?.type === 'plainte' ? newsTarget?.id : null} onTargetOpened={() => setNewsTarget(null)} />}
        {section === 'saisies'       && <Saisies       showNotif={showNotif} />}
        {section === 'registreArmes' && <RegistreArmes showNotif={showNotif} />}
        {section === 'convocations'  && <Convocations  showNotif={showNotif} targetId={newsTarget?.type === 'convocation' ? newsTarget?.id : null} onTargetOpened={() => setNewsTarget(null)} />}
        {section === 'notes'         && <Notes         showNotif={showNotif} targetId={newsTarget?.type === 'note' ? newsTarget?.id : null} onTargetOpened={() => setNewsTarget(null)} />}
        {section === 'penal'         && <CodePenal />}
        {section === 'effectif'      && <Effectif      showNotif={showNotif} />}
      </div>
    </div>
  );
}
