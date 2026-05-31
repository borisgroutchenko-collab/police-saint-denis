import React, { useState } from 'react';
import './index.css';
import { APP_PASSWORD } from './firebase';
import { useNotif } from './hooks/useNotif';
import Verbalization from './components/Verbalization';
import Casier from './components/Casier';
import CodePenal from './components/CodePenal';
import Effectif from './components/Effectif';
import Citoyens from './components/Citoyens';
import Plaintes from './components/Plaintes';

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
  { key: 'verbalization', label: '📋 Verbalisation' },
  { key: 'casier',        label: '🗄 Casier Judiciaire' },
  { key: 'citoyens',      label: '👥 Citoyens' },
  { key: 'plaintes',      label: '📝 Dépôts de Plainte' },
  { key: 'penal',         label: '📖 Code Pénal' },
  { key: 'effectif',      label: '👮 Effectif' },
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [section, setSection] = useState('verbalization');
  const [casierTarget, setCasierTarget] = useState(null); // idNum à ouvrir dans Casier
  const { notif, showNotif } = useNotif();

  function goToCasier(idNum) {
    setCasierTarget(idNum);
    setSection('casier');
  }

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Notification */}
      <div className={`notif${notif.visible ? ' show' : ''}${notif.isError ? ' error' : ''}`}>
        {notif.msg}
      </div>

      {/* Topbar */}
      <div className="topbar">
        <div style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid var(--gold)', background: 'var(--dark2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
          ⭐
        </div>
        <div>
          <div className="topbar-title">Police de Saint-Denis</div>
          <div className="topbar-subtitle">Système Judiciaire — Comté de Lemoyne</div>
        </div>
        <div className="topbar-nav">
          {SECTIONS.map(s => (
            <button key={s.key} className={`nav-btn${section === s.key ? ' active' : ''}`} onClick={() => setSection(s.key)}>
              {s.label}
            </button>
          ))}
          <button className="logout-btn" onClick={() => setLoggedIn(false)}>Déconnexion</button>
        </div>
      </div>

      {/* Content */}
      <div className="main-content">
        {section === 'verbalization' && <Verbalization showNotif={showNotif} />}
        {section === 'casier'        && <Casier        showNotif={showNotif} initialDossierId={casierTarget} onDossierOpened={() => setCasierTarget(null)} />}
        {section === 'citoyens'      && <Citoyens      showNotif={showNotif} onGoToCasier={goToCasier} />}
        {section === 'plaintes'      && <Plaintes      showNotif={showNotif} />}
        {section === 'penal'         && <CodePenal />}
        {section === 'effectif'      && <Effectif      showNotif={showNotif} />}
      </div>
    </div>
  );
}
