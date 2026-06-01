import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc,
  doc, orderBy, query, serverTimestamp, getDoc,
} from 'firebase/firestore';

// ── Modal ajout / édition ──────────────────────────────────────
function CitoyenModal({ citoyen, onClose, onSaved, showNotif }) {
  const [form, setForm] = useState({
    nom:      citoyen?.nom      || '',
    prenom:   citoyen?.prenom   || '',
    age:      citoyen?.age      || '',
    sexe:     citoyen?.sexe     || '',
    comte:    citoyen?.comte    || '',
    metier:   citoyen?.metier   || '',
    carteId:  citoyen?.carteId  || '',
    telegram: citoyen?.telegram || '',
    portArme: citoyen?.portArme || false,
    statut:   citoyen?.statut   || 'actif',
  });

  async function save() {
    if (!form.nom || !form.prenom) {
      showNotif('Nom et prénom obligatoires', true); return;
    }
    const data = { ...form, age: parseInt(form.age) || 0, nomComplet: form.prenom + ' ' + form.nom };
    try {
      if (citoyen?.id) {
        await updateDoc(doc(db, 'citoyens', citoyen.id), data);
        showNotif('Citoyen modifié !');
      } else {
        await addDoc(collection(db, 'citoyens'), { ...data, createdAt: serverTimestamp() });
        showNotif('Citoyen enregistré !');
      }
      onSaved();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div className="modal-overlay open">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-title">{citoyen?.id ? '✏ Modifier le citoyen' : '➕ Nouveau citoyen'}</div>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">Nom *</label>
            <input type="text" className="field-input" placeholder="Nom de famille" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Prénom *</label>
            <input type="text" className="field-input" placeholder="Prénom" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
          </div>
        </div>

        <div className="form-grid three" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">Âge</label>
            <input type="number" className="field-input" placeholder="Ex: 34" min="0" max="120" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Sexe</label>
            <select className="field-select" value={form.sexe} onChange={e => setForm(f => ({ ...f, sexe: e.target.value }))}>
              <option value="">— Sélectionner —</option>
              <option>Masculin</option>
              <option>Féminin</option>
            </select>
          </div>
          <div>
            <label className="field-label">Comté d'origine</label>
            <input type="text" className="field-input" placeholder="Ex: Lemoyne, New Hanover..." value={form.comte} onChange={e => setForm(f => ({ ...f, comte: e.target.value }))} />
          </div>
        </div>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">N° Carte d'identité</label>
            <input type="text" className="field-input" placeholder="Ex: 1111" value={form.carteId} onChange={e => setForm(f => ({ ...f, carteId: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">N° Télégramme</label>
            <input type="text" className="field-input" placeholder="Ex: ABC-1234" value={form.telegram} onChange={e => setForm(f => ({ ...f, telegram: e.target.value }))} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Métier</label>
          <input type="text" className="field-input" placeholder="Ex: Fermier, Marchand, Médecin..." value={form.metier} onChange={e => setForm(f => ({ ...f, metier: e.target.value }))} />
        </div>

        <div className="actions-row">
          <button className="btn-submit" onClick={save}>💾 Sauvegarder</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Fiche détail citoyen ───────────────────────────────────────
function CitoyenDetail({ citoyen, casier, groupes, onBack, onEdit, onDelete, onGoToCasier }) {
  const hasCasier = !!casier;

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Retour aux citoyens</button>

      <div className="card" style={{ borderColor: hasCasier ? '#CC0000' : 'rgba(201,168,76,.3)' }}>
        {hasCasier && casier.mostWanted && (
          <div className="most-wanted-banner">⭐ MOST WANTED — RECHERCHÉ ACTIVEMENT ⭐</div>
        )}

        <div className="card-title">
          👤 {citoyen.nomComplet}
          {hasCasier && (
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ background: 'rgba(139,26,26,.4)', border: '1px solid #CC0000', borderRadius: 3, padding: '3px 12px', fontFamily: "'Special Elite', cursive", fontSize: 11, color: '#ff6b6b', letterSpacing: 1 }}>
                ⚠ CASIER JUDICIAIRE
              </span>
            </span>
          )}
        </div>

        {/* Infos */}
        <div className="form-grid three" style={{ marginBottom: 16 }}>
          <div>
            <span className="field-label">Âge</span>
            <div style={{ fontSize: 15, color: 'var(--paper)' }}>{citoyen.age ? citoyen.age + ' ans' : '—'}</div>
          </div>
          <div>
            <span className="field-label">Sexe</span>
            <div style={{ fontSize: 15, color: 'var(--paper)' }}>{citoyen.sexe || '—'}</div>
          </div>
          <div>
            <span className="field-label">Comté d'origine</span>
            <div style={{ fontSize: 15, color: 'var(--paper)' }}>{citoyen.comte || '—'}</div>
          </div>
        </div>
        <div className="form-grid three" style={{ marginBottom: 16 }}>
          <div>
            <span className="field-label">N° Carte d'identité</span>
            <div style={{ fontFamily: "'Special Elite', cursive", color: 'var(--gold)', fontSize: 15, letterSpacing: 1 }}>{citoyen.carteId || '—'}</div>
          </div>
          <div>
            <span className="field-label">N° Télégramme</span>
            <div style={{ fontFamily: "'Special Elite', cursive", color: 'rgba(244,237,216,.6)', fontSize: 14 }}>{citoyen.telegram || '—'}</div>
          </div>
          <div>
            <span className="field-label">Métier</span>
            <div style={{ fontSize: 15, color: 'var(--paper)' }}>{citoyen.metier || '—'}</div>
          </div>
        </div>

        {/* Casier résumé */}
        {hasCasier && (
          <div style={{ background: 'rgba(139,26,26,.15)', border: '1px solid rgba(139,26,26,.4)', borderRadius: 3, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: '#ff9966', marginBottom: 10 }}>⚖ Résumé du casier judiciaire</div>
            <div className="form-grid three">
              <div>
                <span className="field-label">Infractions</span>
                <div style={{ fontSize: 18, fontFamily: "'Playfair Display', serif", color: '#ff9966' }}>{casier.nbInfractions || 0}</div>
              </div>
              <div>
                <span className="field-label">Total amendes</span>
                <div style={{ fontSize: 18, fontFamily: "'Playfair Display', serif", color: '#ff9966' }}>{casier.totalAmende || 0} $</div>
              </div>
              <div>
                <span className="field-label">Statut Sisika</span>
                <div style={{ marginTop: 4 }}>
                  {casier.sisika
                    ? <span className="tag-sisika">🔒 Condamnable</span>
                    : <span style={{ color: '#90ee90', fontFamily: "'Special Elite', cursive", fontSize: 12 }}>✓ Non condamnable</span>}
                </div>
              </div>
            </div>
            {casier.amendePaid !== undefined && (
              <div style={{ marginTop: 10 }}>
                {casier.amendePaid
                  ? <span className="badge-paid">✅ AMENDE PAYÉE</span>
                  : <span className="badge-unpaid">❌ AMENDE NON PAYÉE</span>}
              </div>
            )}
          </div>
        )}

        {/* Groupes d'appartenance */}
        {groupes && groupes.length > 0 && (
          <div style={{ marginBottom: 16, background: 'rgba(139,26,26,.1)', border: '1px solid rgba(139,26,26,.35)', borderRadius: 3, padding: '14px 16px' }}>
            <span className="field-label" style={{ display: 'block', marginBottom: 10 }}>⚔ Appartenance à un groupe</span>
            {groupes.map((g, i) => (
              <div key={i} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: i < groupes.length - 1 ? 8 : 0, padding: '6px 10px', background: 'rgba(139,26,26,.15)', borderRadius: 3 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: '#ff9966', fontWeight: 700 }}>⚔ {g.nomGroupe}</span>
                {g.role && <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'var(--gold)', letterSpacing: 1 }}>{g.role}</span>}
                {g.pseudo && <span style={{ fontSize: 12, color: 'rgba(244,237,216,.5)', fontStyle: 'italic' }}>alias {g.pseudo}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="actions-row">
          <button className="btn-gold" onClick={onEdit}>✏ Modifier la fiche</button>
          {hasCasier && (
            <button className="btn-red" style={{ background: 'linear-gradient(135deg,#3d0a0a,#8B0000)', borderColor: '#CC0000' }} onClick={onGoToCasier}>
              📁 Ouvrir le casier judiciaire
            </button>
          )}
          <button className="btn-red" onClick={onDelete}>🗑 Supprimer la fiche</button>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────
export default function Citoyens({ showNotif, onGoToCasier }) {
  const [citoyens, setCitoyens] = useState([]);
  const [casiers, setCasiers] = useState({});
  const [groupesMap, setGroupesMap] = useState({}); // { citoyenId: [{ nomGroupe, role, pseudo }] }
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'citoyens'), orderBy('nomComplet')));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCitoyens(list);

      // Charger les casiers
      const casierSnap = await getDocs(collection(db, 'casier'));
      const casierMap = {};
      casierSnap.forEach(d => {
        const data = d.data();
        if (data.nomComplet) casierMap[data.nomComplet.toLowerCase()] = { id: d.id, ...data };
      });
      setCasiers(casierMap);

      // Charger les groupes et indexer par citoyenId
      const groupeSnap = await getDocs(collection(db, 'groupes'));
      const gMap = {};
      groupeSnap.forEach(gDoc => {
        const g = gDoc.data();
        (g.membres || []).forEach(m => {
          if (!m.citoyenId) return;
          if (!gMap[m.citoyenId]) gMap[m.citoyenId] = [];
          gMap[m.citoyenId].push({ groupeId: gDoc.id, nomGroupe: g.nom, role: m.role || '', pseudo: m.pseudo || '' });
        });
      });
      setGroupesMap(gMap);
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
    setLoading(false);
  }, [showNotif]);

  useEffect(() => { load(); }, [load]);

  async function deleteCitoyen() {
    if (!window.confirm(`Supprimer la fiche de ${selected.nomComplet} ?`)) return;
    try {
      await deleteDoc(doc(db, 'citoyens', selected.id));
      showNotif('Fiche supprimée');
      setView('list');
      setSelected(null);
      load();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  function openDetail(citoyen) {
    setSelected(citoyen);
    setView('detail');
  }

  const filtered = citoyens.filter(c =>
    (c.nomComplet || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.carteId || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.metier || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Vue détail ──
  if (view === 'detail' && selected) {
    const casier = casiers[(selected.nomComplet || '').toLowerCase()] || null;
    const groupesCitoyen = groupesMap[selected.id] || [];
    return (
      <>
        {modal && (
          <CitoyenModal
            citoyen={modal}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); load(); setSelected(s => ({ ...s, ...modal })); }}
            showNotif={showNotif}
          />
        )}
        <CitoyenDetail
          citoyen={selected}
          casier={casier}
          groupes={groupesCitoyen}
          onBack={() => { setView('list'); setSelected(null); }}
          onEdit={() => setModal(selected)}
          onDelete={deleteCitoyen}
          onGoToCasier={() => onGoToCasier(casier.id)}
        />
      </>
    );
  }

  // ── Vue liste ──
  return (
    <div>
      {modal !== null && (
        <CitoyenModal
          citoyen={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          showNotif={showNotif}
        />
      )}

      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>👥 Registre des Citoyens</span>
          <button className="btn-submit" style={{ padding: '8px 20px', fontSize: 13 }} onClick={() => setModal({})}>
            ➕ Nouveau citoyen
          </button>
        </div>

        <div className="search-bar">
          <input
            type="text" className="field-input" style={{ flex: 1 }}
            placeholder="Rechercher par nom, carte d'identité ou métier..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-gold" onClick={load}>🔄 Actualiser</button>
        </div>

        {loading && <div><span className="spinner" /> Chargement...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>Aucun citoyen trouvé.</div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="dossier-grid">
            {filtered.map(c => {
              const casier = casiers[(c.nomComplet || '').toLowerCase()] || null;
              const hasCasier = !!casier;
              return (
                <div
                  key={c.id}
                  className="dossier-card"
                  style={hasCasier ? { borderColor: casier.mostWanted ? '#CC0000' : 'rgba(139,26,26,.5)' } : {}}
                  onClick={() => openDetail(c)}
                >
                  {hasCasier && casier.mostWanted && (
                    <div style={{ marginBottom: 8 }}><span className="badge-mw">🎯 MOST WANTED</span></div>
                  )}
                  <div className="dossier-name">{c.nomComplet}</div>
                  <div className="dossier-meta">
                    {c.age ? c.age + ' ans' : ''}
                    {c.age && c.metier ? ' • ' : ''}
                    {c.metier || ''}
                  </div>
                  {c.carteId && <div className="dossier-id">🪪 {c.carteId}</div>}
                  {c.telegram && <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(244,237,216,.4)', marginBottom: 8 }}>📡 {c.telegram}</div>}
                  <div className="dossier-stats">
                    {hasCasier ? (
                      <>
                        <span className="stat-badge" style={{ borderColor: 'rgba(139,26,26,.7)', color: '#ff6b6b' }}>⚠ Casier judiciaire</span>
                        <span className="stat-badge">{casier.nbInfractions || 0} infraction(s)</span>
                        <span className="stat-badge">{casier.totalAmende || 0} $</span>
                        {casier.sisika && <span className="stat-badge" style={{ borderColor: 'var(--red)', color: '#ff6b6b' }}>🔒 Sisika</span>}
                      </>
                    ) : (
                      <span className="stat-badge" style={{ borderColor: '#4a9a4a', color: '#90ee90' }}>✓ Casier vierge</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
