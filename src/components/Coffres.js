import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import SearchableSelect from './SearchableSelect';
import {
  collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';

// ── Bureaux ────────────────────────────────────────────────────
const BUREAUX = [
  { key: 'rhodes',     label: 'Bureau de Rhodes',          emoji: '🏛' },
  { key: 'annesburg',  label: "Bureau d'Annesburg",        emoji: '⛏' },
  { key: 'saintdenis', label: 'Commissariat de Saint-Denis', emoji: '🏙' },
];
function bureauLabel(key) { const b = BUREAUX.find(b => b.key === key); return b ? b.label : key; }

// ── Catégories ─────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'amende',      label: 'Amende perçue',        sens: 'entree' },
  { key: 'saisie',      label: 'Saisie / confiscation', sens: 'entree' },
  { key: 'subvention',  label: 'Subvention / dotation', sens: 'entree' },
  { key: 'don',         label: 'Don',                   sens: 'entree' },
  { key: 'autre_in',    label: 'Autre rentrée',         sens: 'entree' },
  { key: 'salaire',     label: 'Salaire / solde',       sens: 'depense' },
  { key: 'materiel',    label: 'Matériel / équipement',  sens: 'depense' },
  { key: 'munitions',   label: 'Armes / munitions',     sens: 'depense' },
  { key: 'soins',       label: 'Soins médicaux',        sens: 'depense' },
  { key: 'reparation',  label: 'Réparation / entretien', sens: 'depense' },
  { key: 'autre_out',   label: 'Autre dépense',         sens: 'depense' },
];
function catLabel(key) { const c = CATEGORIES.find(c => c.key === key); return c ? c.label : key; }
function catSens(key) { const c = CATEGORIES.find(c => c.key === key); return c ? c.sens : 'depense'; }

// ── Modal d'ajout de mouvement ─────────────────────────────────
function MouvementModal({ bureau, agents, onClose, onSaved, showNotif }) {
  const today = new Date().toISOString().slice(0, 10);
  const [sens, setSens] = useState('entree'); // entree | depense
  const [montant, setMontant] = useState('');
  const [categorie, setCategorie] = useState('amende');
  const [motif, setMotif] = useState('');
  const [agent, setAgent] = useState('');
  const [date, setDate] = useState(today);

  const catsFiltrees = CATEGORIES.filter(c => c.sens === sens);

  function changeSens(s) {
    setSens(s);
    const first = CATEGORIES.find(c => c.sens === s);
    if (first) setCategorie(first.key);
  }

  async function save() {
    const m = parseFloat(montant);
    if (!m || m <= 0) { showNotif('Montant invalide', true); return; }
    if (!motif.trim()) { showNotif('Motif obligatoire', true); return; }
    if (!agent.trim()) { showNotif('Agent obligatoire', true); return; }
    try {
      await addDoc(collection(db, 'coffres'), {
        bureau, sens, montant: m, categorie, motif: motif.trim(), agent: agent.trim(),
        date, createdAt: serverTimestamp(),
      });
      showNotif('Mouvement enregistré !');
      onSaved();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="card-title" style={{ marginBottom: 20 }}>
          {sens === 'entree' ? '➕ Nouvelle rentrée' : '➖ Nouvelle dépense'} — {bureauLabel(bureau)}
        </div>

        {/* Sens */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button type="button" onClick={() => changeSens('entree')}
            style={{ flex: 1, padding: '10px', borderRadius: 3, cursor: 'pointer', fontFamily: "'Special Elite', cursive", fontSize: 13, letterSpacing: 1,
              border: '1px solid ' + (sens === 'entree' ? '#27ae60' : 'rgba(201,168,76,.3)'),
              background: sens === 'entree' ? 'rgba(39,174,96,.2)' : 'transparent', color: sens === 'entree' ? '#7fe8a0' : 'rgba(244,237,216,.6)' }}>
            ➕ Rentrée d'argent
          </button>
          <button type="button" onClick={() => changeSens('depense')}
            style={{ flex: 1, padding: '10px', borderRadius: 3, cursor: 'pointer', fontFamily: "'Special Elite', cursive", fontSize: 13, letterSpacing: 1,
              border: '1px solid ' + (sens === 'depense' ? '#c0392b' : 'rgba(201,168,76,.3)'),
              background: sens === 'depense' ? 'rgba(192,57,43,.2)' : 'transparent', color: sens === 'depense' ? '#ff8866' : 'rgba(244,237,216,.6)' }}>
            ➖ Dépense
          </button>
        </div>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">Montant ($) *</label>
            <input type="number" min="0" step="0.01" className="field-input" placeholder="0" value={montant} onChange={e => setMontant(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Date *</label>
            <input type="date" className="field-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Catégorie *</label>
          <select className="field-select" value={categorie} onChange={e => setCategorie(e.target.value)}>
            {catsFiltrees.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Agent *</label>
          <SearchableSelect
            value={agent}
            onChange={v => setAgent(v)}
            options={(agents || []).map(a => ({ value: `${a.grade || ''} ${a.prenom || ''} ${a.nom || ''}`.trim(), label: (a.grade ? a.grade + ' — ' : '') + (a.prenom || '') + ' ' + (a.nom || '') }))}
            placeholder="— Sélectionner un agent —"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Motif *</label>
          <input type="text" className="field-input" placeholder="Ex: Amende de Cain Dempsey, achat de munitions..." value={motif} onChange={e => setMotif(e.target.value)} />
        </div>

        <div className="actions-row">
          <button className="btn-submit" onClick={save}>💾 Enregistrer</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────
export default function Coffres({ showNotif }) {
  const [mouvements, setMouvements] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bureauActif, setBureauActif] = useState('rhodes');
  const [modal, setModal] = useState(false);
  const [filtreCateg, setFiltreCateg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'coffres'));
      setMouvements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
    setLoading(false);
  }, [showNotif]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getDocs(collection(db, 'effectif'))
      .then(snap => setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, []);

  async function supprimer(id) {
    if (!window.confirm('Supprimer ce mouvement ?')) return;
    try {
      await deleteDoc(doc(db, 'coffres', id));
      setMouvements(m => m.filter(x => x.id !== id));
      showNotif('Mouvement supprimé');
    } catch (e) { showNotif('Erreur suppression', true); }
  }

  // Solde par bureau
  function soldeBureau(key) {
    return mouvements.filter(m => m.bureau === key).reduce((s, m) => s + (m.sens === 'entree' ? m.montant : -m.montant), 0);
  }

  const mvtsBureau = mouvements
    .filter(m => m.bureau === bureauActif)
    .filter(m => !filtreCateg || (filtreCateg === 'entree' ? m.sens === 'entree' : filtreCateg === 'depense' ? m.sens === 'depense' : m.categorie === filtreCateg))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totalEntrees = mvtsBureau.filter(m => m.sens === 'entree').reduce((s, m) => s + m.montant, 0);
  const totalDepenses = mvtsBureau.filter(m => m.sens === 'depense').reduce((s, m) => s + m.montant, 0);

  function fmt(n) { return n.toLocaleString('fr-FR') + ' $'; }

  return (
    <div className="card">
      {modal && (
        <MouvementModal bureau={bureauActif} agents={agents}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load(); }}
          showNotif={showNotif} />
      )}

      <div className="card-title" style={{ marginBottom: 20 }}>💰 Coffres des bureaux</div>

      {/* Cartes solde des 3 bureaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {BUREAUX.map(b => {
          const solde = soldeBureau(b.key);
          const actif = bureauActif === b.key;
          return (
            <div key={b.key} onClick={() => { setBureauActif(b.key); setFiltreCateg(''); }}
              style={{ cursor: 'pointer', borderRadius: 4, padding: '16px 18px',
                border: '1px solid ' + (actif ? 'var(--gold)' : 'rgba(201,168,76,.25)'),
                background: actif ? 'rgba(201,168,76,.12)' : 'rgba(0,0,0,.2)',
                boxShadow: actif ? '0 0 12px rgba(201,168,76,.25)' : 'none', transition: 'all .2s' }}>
              <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 13, color: 'rgba(244,237,216,.75)', letterSpacing: 1, marginBottom: 8 }}>
                {b.emoji} {b.label}
              </div>
              <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 26, fontWeight: 700, color: solde >= 0 ? '#90ee90' : '#ff6b6b' }}>
                {fmt(solde)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barre d'action bureau actif */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--gold)' }}>
          {bureauLabel(bureauActif)}
        </div>
        <button className="btn-submit" onClick={() => setModal(true)}>➕ Ajouter un mouvement</button>
      </div>

      {/* Totaux du bureau */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140, background: 'rgba(39,174,96,.12)', border: '1px solid rgba(39,174,96,.4)', borderRadius: 3, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: 'rgba(244,237,216,.5)', fontFamily: "'Special Elite', cursive", letterSpacing: 1 }}>RENTRÉES</div>
          <div style={{ fontSize: 18, color: '#7fe8a0', fontFamily: "'Special Elite', cursive" }}>+{fmt(totalEntrees)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: 'rgba(192,57,43,.12)', border: '1px solid rgba(192,57,43,.4)', borderRadius: 3, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: 'rgba(244,237,216,.5)', fontFamily: "'Special Elite', cursive", letterSpacing: 1 }}>DÉPENSES</div>
          <div style={{ fontSize: 18, color: '#ff8866', fontFamily: "'Special Elite', cursive" }}>−{fmt(totalDepenses)}</div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setFiltreCateg('')} className={!filtreCateg ? 'btn-submit' : 'btn-gold'} style={{ fontSize: 11, padding: '5px 12px' }}>Tout</button>
        <button onClick={() => setFiltreCateg('entree')} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 2, cursor: 'pointer', fontFamily: "'Special Elite', cursive", border: '1px solid #27ae60', background: filtreCateg === 'entree' ? 'rgba(39,174,96,.25)' : 'transparent', color: '#7fe8a0' }}>Rentrées</button>
        <button onClick={() => setFiltreCateg('depense')} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 2, cursor: 'pointer', fontFamily: "'Special Elite', cursive", border: '1px solid #c0392b', background: filtreCateg === 'depense' ? 'rgba(192,57,43,.25)' : 'transparent', color: '#ff8866' }}>Dépenses</button>
      </div>

      {/* Historique */}
      {loading && <div><span className="spinner" /> Chargement...</div>}
      {!loading && mvtsBureau.length === 0 && <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>Aucun mouvement pour ce bureau.</div>}
      {!loading && mvtsBureau.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mvtsBureau.map(m => {
            const entree = m.sens === 'entree';
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(201,168,76,.15)', borderLeft: '3px solid ' + (entree ? '#27ae60' : '#c0392b'), borderRadius: '0 3px 3px 0', padding: '10px 14px' }}>
                <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 18, fontWeight: 700, color: entree ? '#7fe8a0' : '#ff8866', minWidth: 110 }}>
                  {entree ? '+' : '−'}{fmt(m.montant)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: 'rgba(244,237,216,.9)' }}>{m.motif}</div>
                  <div style={{ fontSize: 11, color: 'rgba(244,237,216,.45)', fontFamily: "'Special Elite', cursive", letterSpacing: 1, marginTop: 2 }}>
                    {catLabel(m.categorie)} · {m.date} · ✒ {m.agent}
                  </div>
                </div>
                <button onClick={() => supprimer(m.id)} title="Supprimer"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff6b6b', fontSize: 15, padding: 0 }}>🗑</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
