import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import SearchableSelect from './SearchableSelect';
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';

// ── Modal ajout / modification d'un objet (matériel ou arme) ──
function ObjetModal({ objet, type, agents, onClose, onSaved, showNotif }) {
  const [qualitatif, setQualitatif] = useState(objet?.qualitatif || '');
  const [quantite, setQuantite] = useState(objet?.quantite != null ? String(objet.quantite) : '1');
  const [serie, setSerie] = useState(objet?.serie || '');
  const [note, setNote] = useState(objet?.note || '');

  async function save() {
    if (!qualitatif.trim()) { showNotif('Désignation obligatoire', true); return; }
    const q = parseInt(quantite, 10);
    if (isNaN(q) || q < 0) { showNotif('Quantité invalide', true); return; }
    try {
      const data = {
        type, qualitatif: qualitatif.trim(), quantite: q,
        serie: type === 'arme' ? serie.trim() : '',
        note: note.trim(),
      };
      if (objet?.id) {
        await updateDoc(doc(db, 'stocks', objet.id), data);
        showNotif('Objet modifié !');
      } else {
        await addDoc(collection(db, 'stocks'), { ...data, historique: [], createdAt: serverTimestamp() });
        showNotif('Objet ajouté !');
      }
      onSaved();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="card-title" style={{ marginBottom: 20 }}>
          {objet?.id ? '✏ Modifier' : '➕ Ajouter'} — {type === 'arme' ? 'Arme' : 'Matériel'}
        </div>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">Quantité *</label>
            <input type="number" min="0" className="field-input" value={quantite} onChange={e => setQuantite(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Désignation *</label>
            <input type="text" className="field-input" placeholder={type === 'arme' ? 'Ex: Carabine Litchfield' : 'Ex: gourdes, lanternes...'} value={qualitatif} onChange={e => setQualitatif(e.target.value)} />
          </div>
        </div>

        {type === 'arme' && (
          <div style={{ marginBottom: 16 }}>
            <label className="field-label">Numéro de série</label>
            <input type="text" className="field-input" placeholder="Ex: XXXXXXXXXX-XXXX" value={serie} onChange={e => setSerie(e.target.value)} />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Note (optionnel)</label>
          <input type="text" className="field-input" placeholder="Précision, état, emplacement..." value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <div className="actions-row">
          <button className="btn-submit" onClick={save}>💾 Enregistrer</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal "prendre du matériel" ────────────────────────────────
function PriseModal({ objet, agents, onClose, onSaved, showNotif }) {
  const today = new Date().toISOString().slice(0, 10);
  const [qte, setQte] = useState('1');
  const [agent, setAgent] = useState('');
  const [date, setDate] = useState(today);
  const [motif, setMotif] = useState('');

  async function save() {
    const n = parseInt(qte, 10);
    if (isNaN(n) || n <= 0) { showNotif('Quantité invalide', true); return; }
    if (n > objet.quantite) { showNotif('Quantité supérieure au stock disponible', true); return; }
    if (!agent.trim()) { showNotif('Agent obligatoire', true); return; }
    try {
      const prise = { qte: n, agent: agent.trim(), date, motif: motif.trim(), at: Date.now() };
      const newHist = [...(objet.historique || []), prise];
      await updateDoc(doc(db, 'stocks', objet.id), {
        quantite: objet.quantite - n,
        historique: newHist,
      });
      showNotif('Prise enregistrée !');
      onSaved();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="card-title" style={{ marginBottom: 8 }}>📤 Prendre du matériel</div>
        <div style={{ fontSize: 14, color: 'var(--gold)', marginBottom: 16 }}>{objet.qualitatif} — stock actuel : {objet.quantite}</div>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">Quantité prise *</label>
            <input type="number" min="1" max={objet.quantite} className="field-input" value={qte} onChange={e => setQte(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Date *</label>
            <input type="date" className="field-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
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
          <label className="field-label">Motif (optionnel)</label>
          <input type="text" className="field-input" placeholder="Ex: patrouille, mission..." value={motif} onChange={e => setMotif(e.target.value)} />
        </div>

        <div className="actions-row">
          <button className="btn-submit" onClick={save}>📤 Confirmer la prise</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────
export default function Stocks({ showNotif }) {
  const [objets, setObjets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);   // { type } pour ajout, ou objet pour édition
  const [prise, setPrise] = useState(null);   // objet dont on prend du matériel
  const [histObjet, setHistObjet] = useState(null); // objet dont on affiche l'historique

  // État des lieux
  const [edl, setEdl] = useState(null);
  const [edlAgent, setEdlAgent] = useState('');
  const [edlDate, setEdlDate] = useState(new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'stocks'));
      setObjets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      const edlSnap = await getDocs(collection(db, 'stockEtatLieux'));
      const list = edlSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setEdl(list[0] || null);
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
    setLoading(false);
  }, [showNotif]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getDocs(collection(db, 'effectif')).then(snap => setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })))).catch(() => {});
  }, []);

  async function deleteObjet(id) {
    if (!window.confirm('Supprimer cet objet du stock ?')) return;
    try { await deleteDoc(doc(db, 'stocks', id)); setObjets(o => o.filter(x => x.id !== id)); showNotif('Supprimé'); }
    catch (e) { showNotif('Erreur', true); }
  }

  async function saveEdl() {
    if (!edlAgent.trim()) { showNotif('Agent obligatoire pour l\u0027état des lieux', true); return; }
    try {
      await addDoc(collection(db, 'stockEtatLieux'), { agent: edlAgent.trim(), date: edlDate, createdAt: serverTimestamp() });
      showNotif('État des lieux enregistré !');
      setEdlAgent('');
      load();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  const materiel = objets.filter(o => o.type !== 'arme');
  const armes = objets.filter(o => o.type === 'arme');

  function renderObjet(o) {
    return (
      <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 3, padding: '10px 14px' }}>
        <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 20, fontWeight: 700, color: o.quantite > 0 ? 'var(--gold)' : '#ff6b6b', minWidth: 44, textAlign: 'center' }}>
          {o.quantite}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: 'rgba(244,237,216,.9)' }}>{o.qualitatif}</div>
          <div style={{ fontSize: 11, color: 'rgba(244,237,216,.45)', fontFamily: "'Special Elite', cursive", letterSpacing: 1, marginTop: 2 }}>
            {o.type === 'arme' && o.serie && <>N° série : {o.serie}</>}
            {o.note && <>{o.type === 'arme' && o.serie ? ' · ' : ''}{o.note}</>}
            {(o.historique || []).length > 0 && <> · {o.historique.length} prise(s)</>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-gold" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => setPrise(o)} disabled={o.quantite <= 0} title="Prendre">📤</button>
          {(o.historique || []).length > 0 && <button className="btn-blue" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => setHistObjet(o)} title="Historique">📜</button>}
          <button className="btn-blue" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => setModal(o)}>✏</button>
          <button className="btn-red" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => deleteObjet(o.id)}>🗑</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {modal && (
        <ObjetModal objet={modal.id ? modal : null} type={modal.type || 'materiel'} agents={agents}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} showNotif={showNotif} />
      )}
      {prise && (
        <PriseModal objet={prise} agents={agents} onClose={() => setPrise(null)} onSaved={() => { setPrise(null); load(); }} showNotif={showNotif} />
      )}
      {histObjet && (
        <div className="modal-overlay open" onClick={() => setHistObjet(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>📜 Historique — {histObjet.qualitatif}</div>
            {(histObjet.historique || []).slice().reverse().map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid rgba(201,168,76,.1)', padding: '8px 0' }}>
                <span style={{ fontFamily: "'Special Elite', cursive", color: '#ff8866', fontSize: 15, minWidth: 40 }}>−{h.qte}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'rgba(244,237,216,.85)' }}>✒ {h.agent}{h.motif ? ' — ' + h.motif : ''}</div>
                  <div style={{ fontSize: 11, color: 'rgba(244,237,216,.4)' }}>{h.date}</div>
                </div>
              </div>
            ))}
            <div className="actions-row" style={{ marginTop: 16 }}>
              <button className="btn-red" onClick={() => setHistObjet(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      <div className="card-title" style={{ marginBottom: 20 }}>📦 Stocks du poste</div>

      {/* État des lieux */}
      <div style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.3)', borderRadius: 4, padding: 16, marginBottom: 24 }}>
        <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 13, color: 'var(--gold)', letterSpacing: 1, marginBottom: 10 }}>📋 État des lieux des stocks</div>
        {edl && (
          <div style={{ fontSize: 13, color: 'rgba(244,237,216,.8)', marginBottom: 12 }}>
            Dernier point fait le <strong style={{ color: 'var(--gold)' }}>{edl.date}</strong> par <strong style={{ color: 'var(--gold)' }}>✒ {edl.agent}</strong>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="field-label">Agent ayant fait le point</label>
            <SearchableSelect value={edlAgent} onChange={v => setEdlAgent(v)}
              options={agents.map(a => ({ value: `${a.grade || ''} ${a.prenom || ''} ${a.nom || ''}`.trim(), label: (a.grade ? a.grade + ' — ' : '') + (a.prenom || '') + ' ' + (a.nom || '') }))}
              placeholder="— Sélectionner un agent —" />
          </div>
          <div>
            <label className="field-label">Date</label>
            <input type="date" className="field-input" value={edlDate} onChange={e => setEdlDate(e.target.value)} />
          </div>
          <button className="btn-submit" onClick={saveEdl} style={{ padding: '9px 18px' }}>✓ Enregistrer le point</button>
        </div>
      </div>

      {loading && <div><span className="spinner" /> Chargement...</div>}

      {/* Section Matériel */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--gold)' }}>🧰 Matériel ({materiel.length})</div>
          <button className="btn-submit" onClick={() => setModal({ type: 'materiel' })}>➕ Ajouter du matériel</button>
        </div>
        {materiel.length === 0 ? (
          <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>Aucun matériel enregistré.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{materiel.map(renderObjet)}</div>
        )}
      </div>

      {/* Section Armes */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--gold)' }}>🔫 Armes ({armes.length})</div>
          <button className="btn-submit" onClick={() => setModal({ type: 'arme' })}>➕ Ajouter une arme</button>
        </div>
        {armes.length === 0 ? (
          <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>Aucune arme enregistrée.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{armes.map(renderObjet)}</div>
        )}
      </div>
    </div>
  );
}
