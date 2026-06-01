import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc,
  doc, orderBy, query, serverTimestamp, getDoc, setDoc, increment, writeBatch,
} from 'firebase/firestore';
import { ALL_INFRACTIONS } from '../data/penalCode';

const STATUTS = [
  { key: 'ouverte',   label: '🔴 Ouverte',        color: '#ff6b6b' },
  { key: 'instruite', label: '🟡 En instruction',  color: '#ffcc44' },
  { key: 'classee',   label: '🟢 Classée',         color: '#90ee90' },
];

// ── Helpers ────────────────────────────────────────────────────
// Synchronise les signalements de plainte dans les casiers des mis en cause.
// - Pour chaque mis en cause identifié : crée/met à jour casier/{key}/plaintesSingalees/{plainteId}
// - Si statut = 'classee' : supprime le signalement (blanchi ou clôturé)
async function syncPlainteCasiers(plainteId, misEnCause, plaintifsStr, date, faits, statut, casiersLies) {
  for (const m of misEnCause) {
    if (m.inconnu || !m.nom) continue;
    const nomComplet = (m.prenom ? m.prenom + ' ' : '') + m.nom;
    const casierKey = nomComplet.toLowerCase().replace(/ /g, '_');
    const sigRef = doc(db, 'casier', casierKey, 'plaintesSignalees', plainteId);
    if (statut === 'classee') {
      // Plainte classée → retire le signalement du casier dans tous les cas
      try { await deleteDoc(sigRef); } catch (e) {}
    } else {
      const casRef = doc(db, 'casier', casierKey);
      const casSnap = await getDoc(casRef);
      if (!casSnap.exists()) {
        await setDoc(casRef, {
          idNum: m.carteId || casierKey, nom: m.nom, prenom: m.prenom || '',
          nomComplet,
          sexe: '', age: 0, createdAt: serverTimestamp(),
          totalAmende: 0, sisika: false, nbInfractions: 0,
        });
      }
      await setDoc(sigRef, {
        plainteId, plaintifsStr, date, faits: faits || '', statut,
        misNom: m.nom, misPrenom: m.prenom || '',
        updatedAt: serverTimestamp(),
      });
    }
  }
}
function nomCompletMis(m) {
  return (m.prenom ? m.prenom + ' ' : '') + (m.nom || '');
}

// ── Modal dépôt de plainte (création ET modification complète) ─
function PlainteModal({ plainte, citoyens, agents, groupes, onClose, onSaved, showNotif }) {
  const now = new Date();
  const [form, setForm] = useState({
    date:   plainte?.date   || now.toISOString().split('T')[0],
    heure:  plainte?.heure  || now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0'),
    agent:  plainte?.agent  || '',
    faits:            plainte?.faits            || '',
    elementsEnquete:  plainte?.elementsEnquete  || '',
    statut: plainte?.statut || 'ouverte',
  });

  const [plaignants, setPlaignants] = useState(
    plainte?.plaignants?.length ? plainte.plaignants : [{ citoyenId: '', nom: '', prenom: '' }]
  );

  // Plusieurs mis en cause
  const [misEnCause, setMisEnCause] = useState(
    plainte?.misEnCause?.length
      ? plainte.misEnCause
      : [{ inconnu: false, citoyenId: '', nom: '', prenom: '', carteId: '' }]
  );

  // Groupes mis en cause
  const [groupesMisEnCause, setGroupesMisEnCause] = useState(plainte?.groupesMisEnCause || []);

  // Plaignants
  function addPlaignant() { setPlaignants(p => [...p, { citoyenId: '', nom: '', prenom: '' }]); }
  function removePlaignant(i) { setPlaignants(p => p.filter((_, j) => j !== i)); }
  function selectCitoyenPlaignant(i, cid) {
    const c = citoyens.find(x => x.id === cid);
    setPlaignants(p => p.map((x, j) => j !== i ? x : c ? { citoyenId: cid, nom: c.nom, prenom: c.prenom } : { ...x, citoyenId: '' }));
  }
  function updatePlaignant(i, key, val) { setPlaignants(p => p.map((x, j) => j === i ? { ...x, [key]: val } : x)); }

  // Mis en cause
  function addMis() { setMisEnCause(m => [...m, { inconnu: false, citoyenId: '', nom: '', prenom: '', carteId: '' }]); }
  function removeMis(i) { setMisEnCause(m => m.filter((_, j) => j !== i)); }
  function updateMis(i, key, val) { setMisEnCause(m => m.map((x, j) => j === i ? { ...x, [key]: val } : x)); }
  function selectCitoyenMis(i, cid) {
    const c = citoyens.find(x => x.id === cid);
    setMisEnCause(m => m.map((x, j) => j !== i ? x : c ? { ...x, citoyenId: cid, nom: c.nom, prenom: c.prenom, carteId: c.carteId || '' } : { ...x, citoyenId: '' }));
  }

  async function save() {
    if (!plaignants.some(p => p.citoyenId)) { showNotif('Sélectionnez au moins un plaignant dans la liste des citoyens', true); return; }
    const plaintifsStr = plaignants.filter(p => p.citoyenId).map(p => (p.prenom ? p.prenom + ' ' : '') + (p.nom || '')).join(', ');
    const misStr = misEnCause.map(m => m.inconnu ? 'Inconnu (X)' : nomCompletMis(m) || 'Inconnu').join(', ');
    const groupesLies = groupesMisEnCause.filter(g => g.groupeId).map(g => g.groupeId);
    const data = { ...form, plaignants, misEnCause, groupesMisEnCause, plaintifsStr, misStr, groupesLies, updatedAt: serverTimestamp() };
    try {
      let savedId = plainte?.id;
      if (plainte?.id) {
        await updateDoc(doc(db, 'plaintes', plainte.id), data);
        showNotif('Plainte modifiée !');
      } else {
        const ref = await addDoc(collection(db, 'plaintes'), { ...data, casiersLies: [], createdAt: serverTimestamp() });
        savedId = ref.id;
        showNotif('Plainte enregistrée !');
      }
      // Synchroniser dans les casiers des mis en cause
      const casiersLies = plainte?.casiersLies || [];
      await syncPlainteCasiers(savedId, misEnCause, plaintifsStr, form.date, form.faits, form.statut, casiersLies);
      onSaved();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  const agentSaisie = form.agent === '__autre__';

  return (
    <div className="modal-overlay open">
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-title">{plainte?.id ? '✏ Modifier la plainte' : '📝 Nouveau dépôt de plainte'}</div>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Date / Heure / Statut */}
        <div className="form-grid three" style={{ marginBottom: 16 }}>
          <div><label className="field-label">Date *</label><input type="date" className="field-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div><label className="field-label">Heure</label><input type="time" className="field-input" value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} /></div>
          <div><label className="field-label">Statut</label>
            <select className="field-select" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
              {STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Agent */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Agent prenant en charge la plainte</label>
          {agents.length > 0 ? (
            <select className="field-select" value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))}>
              <option value="">— Sélectionner un agent —</option>
              {agents.map(a => <option key={a.id} value={`${a.grade} ${a.prenom} ${a.nom}`}>{a.grade} — {a.prenom} {a.nom}</option>)}
              <option value="__autre__">✍ Saisir manuellement...</option>
            </select>
          ) : (
            <input type="text" className="field-input" placeholder="Ex: Adjoint Morgan" value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))} />
          )}
          {agentSaisie && <input type="text" className="field-input" style={{ marginTop: 8 }} placeholder="Nom de l'agent" onChange={e => setForm(f => ({ ...f, agent: e.target.value }))} />}
        </div>

        {/* Plaignants */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label className="field-label" style={{ margin: 0 }}>Plaignant(s) *</label>
            <button className="btn-blue" style={{ fontSize: 10, padding: '4px 10px' }} onClick={addPlaignant}>+ Ajouter un plaignant</button>
          </div>
          {citoyens.length === 0 && (
            <div style={{ color: '#ff9966', fontFamily: "'Special Elite', cursive", fontSize: 12, padding: '8px 0' }}>⚠ Aucun citoyen enregistré. Ajoutez des citoyens d'abord.</div>
          )}
          {plaignants.map((p, i) => (
            <div key={i} style={{ background: 'rgba(0,0,0,.2)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 3, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(201,168,76,.7)', letterSpacing: 1 }}>Plaignant {i + 1}</span>
                {plaignants.length > 1 && <button className="btn-red" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => removePlaignant(i)}>✕ Retirer</button>}
              </div>
              <select className="field-select" value={p.citoyenId || ''} onChange={e => selectCitoyenPlaignant(i, e.target.value)}>
                <option value="">— Sélectionner un citoyen enregistré —</option>
                {citoyens.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}{c.metier ? ' (' + c.metier + ')' : ''}</option>)}
              </select>
              {p.citoyenId && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(201,168,76,.7)', fontFamily: "'Special Elite', cursive" }}>
                  ✓ {p.prenom} {p.nom}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mis en cause — MULTIPLE */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label className="field-label" style={{ margin: 0 }}>Personne(s) mise(s) en cause</label>
            <button className="btn-red" style={{ fontSize: 10, padding: '4px 10px', background: 'linear-gradient(135deg,#3d0a0a,#8B0000)', borderColor: '#CC0000', color: '#ffaaaa' }} onClick={addMis}>+ Ajouter une mise en cause</button>
          </div>
          {misEnCause.map((m, i) => (
            <div key={i} style={{ background: 'rgba(139,26,26,.1)', border: '1px solid rgba(139,26,26,.3)', borderRadius: 3, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: '#ff9966', letterSpacing: 1 }}>Mis en cause {i + 1}</span>
                {misEnCause.length > 1 && <button className="btn-red" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => removeMis(i)}>✕ Retirer</button>}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: "'Special Elite', cursive", fontSize: 12, color: 'rgba(244,237,216,.7)', marginBottom: 10 }}>
                <input type="checkbox" checked={!!m.inconnu} onChange={e => updateMis(i, 'inconnu', e.target.checked)} />
                Plainte contre X (auteur inconnu)
              </label>
              {!m.inconnu && (
                <>
                  <select className="field-select" value={m.citoyenId || ''} onChange={e => selectCitoyenMis(i, e.target.value)}>
                    <option value="">— Sélectionner un citoyen enregistré —</option>
                    {citoyens.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}{c.metier ? ' (' + c.metier + ')' : ''}</option>)}
                  </select>
                  {m.citoyenId && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#ff9966', fontFamily: "'Special Elite', cursive" }}>
                      ✓ {m.prenom} {m.nom}{m.carteId ? ' — ' + m.carteId : ''}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Groupes mis en cause */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label className="field-label" style={{ margin: 0 }}>Groupe(s) mis en cause</label>
            <button className="btn-red" style={{ fontSize: 10, padding: '4px 10px', background: 'linear-gradient(135deg,#3d0a0a,#8B0000)', borderColor: '#CC0000', color: '#ffaaaa' }}
              onClick={() => setGroupesMisEnCause(g => [...g, { groupeId: '', nomGroupe: '' }])}>
              + Ajouter un groupe
            </button>
          </div>
          {groupesMisEnCause.length === 0 && (
            <div style={{ color: 'rgba(244,237,216,.3)', fontStyle: 'italic', fontSize: 13 }}>Aucun groupe mis en cause — optionnel.</div>
          )}
          {groupesMisEnCause.map((g, i) => (
            <div key={i} style={{ background: 'rgba(139,26,26,.1)', border: '1px solid rgba(139,26,26,.3)', borderRadius: 3, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: '#ff9966', letterSpacing: 1 }}>Groupe {i + 1}</span>
                <button className="btn-red" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setGroupesMisEnCause(gs => gs.filter((_, j) => j !== i))}>✕ Retirer</button>
              </div>
              {groupes.length > 0 ? (
                <select className="field-select" value={g.groupeId || ''} onChange={e => {
                  const gr = groupes.find(x => x.id === e.target.value);
                  setGroupesMisEnCause(gs => gs.map((x, j) => j !== i ? x : gr ? { groupeId: gr.id, nomGroupe: gr.nom } : { groupeId: '', nomGroupe: '' }));
                }}>
                  <option value="">— Sélectionner un groupe —</option>
                  {groupes.map(gr => <option key={gr.id} value={gr.id}>{gr.nom}{gr.territoire ? ' (' + gr.territoire + ')' : ''}</option>)}
                </select>
              ) : (
                <div style={{ color: '#ff9966', fontFamily: "'Special Elite', cursive", fontSize: 12 }}>⚠ Aucun groupe enregistré.</div>
              )}
              {g.groupeId && <div style={{ marginTop: 6, fontSize: 12, color: '#ff9966', fontFamily: "'Special Elite', cursive" }}>✓ {g.nomGroupe}</div>}
            </div>
          ))}
        </div>

        {/* Faits */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Circonstances, lieu, description des faits</label>
          <textarea className="field-textarea" style={{ minHeight: 120 }} placeholder="Décrivez les circonstances, le lieu et les faits..." value={form.faits} onChange={e => setForm(f => ({ ...f, faits: e.target.value }))} />
        </div>

        {/* Éléments d'enquête */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Éléments d'enquête en cours</label>
          <textarea className="field-textarea" style={{ minHeight: 100 }} placeholder="Témoignages recueillis, indices, pistes, suspects identifiés, actions en cours..." value={form.elementsEnquete} onChange={e => setForm(f => ({ ...f, elementsEnquete: e.target.value }))} />
        </div>

        <div className="actions-row">
          <button className="btn-submit" onClick={save}>💾 Enregistrer la plainte</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal verbalisation depuis plainte (pour un mis en cause) ──
function VerbalisationModal({ plainte, misIndex, agents, onClose, onDone, showNotif }) {
  const mis = plainte.misEnCause?.[misIndex] || {};
  const [selected, setSelected] = useState([]);
  const [agent, setAgent] = useState('');
  const [note, setNote] = useState('Verbalisation suite à dépôt de plainte');
  const [saisiesObjets, setSaisiesObjets] = useState([]);
  const [saisiesArmes, setSaisiesArmes] = useState([]);
  const total = selected.reduce((s, x) => s + x.amende, 0);
  const hasSisika = selected.some(x => x.sisika);
  function toggle(art) { setSelected(p => p.find(x => x.num === art.num) ? p.filter(x => x.num !== art.num) : [...p, art]); }

  async function submit() {
    if (!selected.length) { showNotif('Sélectionnez au moins une infraction', true); return; }
    const nomC = nomCompletMis(mis);
    const casierKey = nomC.toLowerCase().replace(/ /g, '_');
    const now = new Date();
    const record = {
      date: now.toISOString().split('T')[0],
      heure: now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0'),
      agent: agent || 'Non précisé', nom: mis.nom, prenom: mis.prenom || '',
      idNum: mis.carteId || casierKey, nomComplet: nomC, sexe: '', age: 0,
      note, desc: `Plainte déposée par ${plainte.plaintifsStr} — ${plainte.faits || ''}`,
      infractions: selected, total, sisika: hasSisika,
      photos: [], createdAt: serverTimestamp(), plainteId: plainte.id,
    };
    try {
      const dRef = doc(db, 'casier', casierKey);
      const dSnap = await getDoc(dRef);
      if (!dSnap.exists()) {
        await setDoc(dRef, { idNum: mis.carteId || casierKey, nom: mis.nom, prenom: mis.prenom || '', nomComplet: nomC, sexe: '', age: 0, createdAt: serverTimestamp(), totalAmende: 0, sisika: false, nbInfractions: 0 });
      }
      await addDoc(collection(dRef, 'infractions'), record);
      await updateDoc(dRef, { totalAmende: increment(total), sisika: hasSisika || (dSnap.exists() && dSnap.data().sisika), nbInfractions: increment(1) });
      // Ajouter ce casier aux casiers liés de la plainte (sans doublon)
      const existingLies = Array.isArray(plainte.casiersLies) ? plainte.casiersLies : [];
      const newLies = existingLies.includes(casierKey) ? existingLies : [...existingLies, casierKey];
      await updateDoc(doc(db, 'plaintes', plainte.id), { statut: 'instruite', casiersLies: newLies });
      // Mettre à jour le signalement dans le casier : passe en "verbalisé"
      await setDoc(doc(db, 'casier', casierKey, 'plaintesSignalees', plainte.id), {
        plainteId: plainte.id, plaintifsStr: plainte.plaintifsStr || '',
        date: plainte.date || '', faits: plainte.faits || '',
        statut: 'verbalise', misNom: mis.nom, misPrenom: mis.prenom || '',
        updatedAt: serverTimestamp(),
      });
      // Enregistrer les saisies
      const saisieBase = {
        source: 'plainte',
        date: now.toISOString().split('T')[0],
        heure: now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0'),
        agent: agent || '',
        nomComplet: nomC, createdAt: serverTimestamp(),
      };
      for (const obj of saisiesObjets.filter(o => o.trim())) {
        await addDoc(collection(db, 'saisies'), { ...saisieBase, type: 'objet', description: obj });
      }
      for (const arme of saisiesArmes.filter(a => a.nom || a.serie)) {
        await addDoc(collection(db, 'saisies'), { ...saisieBase, type: 'arme', description: arme.nom, serie: arme.serie || '' });
      }
      showNotif('Verbalisation créée et casier mis à jour !');
      onDone();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div className="modal-overlay open">
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-title">⚖ Verbalisation — {nomCompletMis(mis)}</div>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div style={{ background: 'rgba(139,26,26,.15)', border: '1px solid rgba(139,26,26,.3)', borderRadius: 3, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: '#ff9966', letterSpacing: 1, marginBottom: 4 }}>MIS EN CAUSE</div>
          <div style={{ fontSize: 15, color: 'var(--paper)' }}>{nomCompletMis(mis)}{mis.carteId ? ' — ' + mis.carteId : ''}</div>
        </div>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">Agent verbalisateur</label>
            {agents.length > 0 ? (
              <select className="field-select" value={agent} onChange={e => setAgent(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {agents.map(a => <option key={a.id} value={`${a.grade} ${a.prenom} ${a.nom}`}>{a.grade} — {a.prenom} {a.nom}</option>)}
              </select>
            ) : <input type="text" className="field-input" value={agent} onChange={e => setAgent(e.target.value)} placeholder="Nom de l'agent" />}
          </div>
          <div><label className="field-label">Note</label><input type="text" className="field-input" value={note} onChange={e => setNote(e.target.value)} /></div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="field-label" style={{ marginBottom: 10 }}>Infractions</label>
          <div className="infractions-grid">
            {ALL_INFRACTIONS.map(art => {
              const isSel = selected.some(x => x.num === art.num);
              return (
                <div key={art.num} className={`infraction-item${isSel ? ' selected' : ''}`} onClick={() => toggle(art)}>
                  <div className="infraction-check">{isSel ? '✓' : ''}</div>
                  <div><div className="infraction-art">{art.num}</div><div className="infraction-name">{art.nom}</div>
                    <div className="infraction-amount">{art.sisika ? '🔒 Sisika ' : ''}{art.amende > 0 ? art.amende + ' $' : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="total-box" style={{ marginBottom: 16 }}>
          <div><div className="total-label">Amende totale</div>{hasSisika && <span className="sisika-badge">⚠ SÉJOUR À SISIKA</span>}</div>
          <div className="total-amount">{total} $</div>
        </div>
        {/* Saisies */}
        <div style={{ marginBottom: 16, padding: '16px', background: 'rgba(201,168,76,.06)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 3 }}>
          <label className="field-label" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>📦 Objets & Armes saisis</label>
          <div style={{ marginBottom: 14 }}>
            <label className="field-label" style={{ fontSize: 11, marginBottom: 6 }}>Objets saisis</label>
            {saisiesObjets.map((obj, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input type="text" className="field-input" style={{ flex: 1 }} placeholder="Ex: Sac de billets, documents falsifiés..." value={obj}
                  onChange={e => setSaisiesObjets(s => s.map((x, j) => j === i ? e.target.value : x))} />
                <button className="btn-red" style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={() => setSaisiesObjets(s => s.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button className="btn-gold" style={{ fontSize: 11, padding: '5px 12px' }}
              onClick={() => setSaisiesObjets(s => [...s, ''])}>+ Ajouter un objet</button>
          </div>
          <div>
            <label className="field-label" style={{ fontSize: 11, marginBottom: 6 }}>Armes saisies</label>
            {saisiesArmes.map((arme, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <input type="text" className="field-input" style={{ flex: 2 }} placeholder="Nom de l'arme" value={arme.nom || ''}
                  onChange={e => setSaisiesArmes(s => s.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))} />
                <input type="text" className="field-input" style={{ flex: 2, fontFamily: "'Special Elite', cursive", letterSpacing: 1 }} placeholder="N° série : 0000000000-0000" value={arme.serie || ''}
                  onChange={e => setSaisiesArmes(s => s.map((x, j) => j === i ? { ...x, serie: e.target.value } : x))} />
                <button className="btn-red" style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={() => setSaisiesArmes(s => s.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button className="btn-gold" style={{ fontSize: 11, padding: '5px 12px' }}
              onClick={() => setSaisiesArmes(s => [...s, { nom: '', serie: '' }])}>+ Ajouter une arme</button>
          </div>
        </div>

        <div className="actions-row">
          <button className="btn-submit" onClick={submit}>⚖ Créer la verbalisation</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal lier casier existant ─────────────────────────────────
function LierCasierModal({ plainte, casiers, onClose, onDone, showNotif }) {
  const [casierKey, setCasierKey] = useState('');
  const casierList = Object.values(casiers);
  const existingLies = Array.isArray(plainte.casiersLies) ? plainte.casiersLies : [];

  async function lier() {
    if (!casierKey) { showNotif('Sélectionnez un casier', true); return; }
    const newLies = existingLies.includes(casierKey) ? existingLies : [...existingLies, casierKey];
    try {
      await updateDoc(doc(db, 'plaintes', plainte.id), { casiersLies: newLies, statut: 'instruite' });
      showNotif('Casier lié à la plainte !');
      onDone();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div className="modal-overlay open">
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-title">📁 Lier à un casier existant</div>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Sélectionner le casier</label>
          <select className="field-select" value={casierKey} onChange={e => setCasierKey(e.target.value)}>
            <option value="">— Choisir —</option>
            {casierList.filter(c => !existingLies.includes(c.id)).map(c => (
              <option key={c.id} value={c.id}>{c.nomComplet} ({c.nbInfractions || 0} inf. — {c.totalAmende || 0} $)</option>
            ))}
          </select>
        </div>
        <div className="actions-row">
          <button className="btn-blue" onClick={lier}>✓ Lier</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Carte liste ────────────────────────────────────────────────
function PlainteCard({ plainte, onOpen }) {
  const statut = STATUTS.find(s => s.key === plainte.statut) || STATUTS[0];
  const nbLies = (plainte.casiersLies || []).length;
  const misStr = plainte.misStr || (plainte.misEnCause?.[0]?.inconnu ? 'Inconnu (X)' : plainte.misEnCause?.[0] ? nomCompletMis(plainte.misEnCause[0]) : '—');
  return (
    <div className="dossier-card" onClick={onOpen} style={{ borderLeft: '3px solid ' + statut.color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div className="dossier-id">📅 {plainte.date}{plainte.heure ? ' à ' + plainte.heure : ''}</div>
        <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: statut.color, letterSpacing: 1 }}>{statut.label}</span>
      </div>
      <div className="dossier-name" style={{ fontSize: 15, marginBottom: 4 }}>{plainte.plaintifsStr || '—'}</div>
      <div style={{ fontSize: 12, color: 'rgba(244,237,216,.5)', marginBottom: 8, fontStyle: 'italic' }}>contre : {misStr}</div>
      {plainte.faits && <div style={{ fontSize: 12, color: 'rgba(244,237,216,.6)', lineHeight: 1.5, marginBottom: 8 }}>{plainte.faits.length > 120 ? plainte.faits.slice(0, 120) + '…' : plainte.faits}</div>}
      {plainte.agent && <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(201,168,76,.6)', letterSpacing: 1 }}>👮 {plainte.agent}</div>}
      {nbLies > 0 && <div style={{ marginTop: 6 }}><span className="stat-badge" style={{ borderColor: '#CC0000', color: '#ff9966' }}>📁 {nbLies} casier(s) lié(s)</span></div>}
    </div>
  );
}

// ── Détail plainte ─────────────────────────────────────────────
function PlainteDetail({ plainte, agents, citoyens, casiers, onBack, onEdit, onDelete, showNotif, onReload }) {
  const statut = STATUTS.find(s => s.key === plainte.statut) || STATUTS[0];
  const casiersLies = (plainte.casiersLies || []).map(id => casiers[id]).filter(Boolean);
  const [modal, setModal] = useState(null); // null | { type: 'verbaliser', misIndex } | { type: 'lier' }

  async function changerStatut(s) {
    try {
      await updateDoc(doc(db, 'plaintes', plainte.id), { statut: s });
      // Si classée : retire le signalement des casiers non liés (blanchi)
      await syncPlainteCasiers(plainte.id, plainte.misEnCause || [], plainte.plaintifsStr || '', plainte.date || '', plainte.faits || '', s, plainte.casiersLies || []);
      onReload();
    }
    catch (e) { showNotif('Erreur', true); }
  }
  async function delierCasier(casId) {
    const newLies = (plainte.casiersLies || []).filter(x => x !== casId);
    try { await updateDoc(doc(db, 'plaintes', plainte.id), { casiersLies: newLies }); onReload(); showNotif('Casier délié'); }
    catch (e) { showNotif('Erreur', true); }
  }

  return (
    <div>
      {modal?.type === 'verbaliser' && (
        <VerbalisationModal plainte={plainte} misIndex={modal.misIndex} agents={agents}
          onClose={() => setModal(null)} onDone={() => { setModal(null); onReload(); }} showNotif={showNotif} />
      )}
      {modal?.type === 'lier' && (
        <LierCasierModal plainte={plainte} casiers={casiers}
          onClose={() => setModal(null)} onDone={() => { setModal(null); onReload(); }} showNotif={showNotif} />
      )}

      <button className="back-btn" onClick={onBack}>← Retour aux plaintes</button>
      <div className="card" style={{ borderLeft: '4px solid ' + statut.color }}>
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>📝 Dépôt de plainte</span>
          <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 13, color: statut.color, letterSpacing: 1 }}>{statut.label}</span>
        </div>

        <div className="form-grid three" style={{ marginBottom: 16 }}>
          <div><span className="field-label">Date</span><div style={{ fontSize: 15 }}>{plainte.date}{plainte.heure ? ' à ' + plainte.heure : ''}</div></div>
          <div><span className="field-label">Agent</span><div style={{ fontSize: 14 }}>{plainte.agent || '—'}</div></div>
          <div><span className="field-label">Statut</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {STATUTS.map(s => (
                <button key={s.key} onClick={() => changerStatut(s.key)}
                  style={{ fontFamily: "'Special Elite', cursive", fontSize: 10, letterSpacing: 1, padding: '3px 10px', borderRadius: 2, cursor: 'pointer', border: '1px solid ' + s.color, background: plainte.statut === s.key ? s.color + '33' : 'transparent', color: s.color }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Plaignants */}
        <div style={{ marginBottom: 16 }}>
          <span className="field-label">Plaignant(s)</span>
          {(plainte.plaignants || []).map((p, i) => (
            <div key={i} style={{ fontSize: 15, color: 'var(--paper)', padding: '4px 0' }}>👤 {p.prenom ? p.prenom + ' ' : ''}{p.nom || 'Inconnu'}</div>
          ))}
        </div>

        {/* Mis en cause — liste */}
        <div style={{ marginBottom: 16 }}>
          <span className="field-label" style={{ display: 'block', marginBottom: 10 }}>Personne(s) mise(s) en cause</span>
          {(plainte.misEnCause || []).map((m, i) => (
            <div key={i} style={{ background: 'rgba(139,26,26,.12)', border: '1px solid rgba(139,26,26,.3)', borderRadius: 3, padding: '12px 16px', marginBottom: 8 }}>
              <div style={{ fontSize: 15, color: 'var(--paper)', marginBottom: 6 }}>
                {m.inconnu
                  ? <span style={{ color: '#ff9966', fontFamily: "'Special Elite', cursive", fontSize: 13 }}>⚠ Auteur inconnu — Plainte contre X</span>
                  : <>{nomCompletMis(m)}{m.carteId && <span style={{ marginLeft: 10, fontFamily: "'Special Elite', cursive", fontSize: 12, color: 'var(--gold)' }}>{m.carteId}</span>}</>
                }
              </div>
              {!m.inconnu && m.nom && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-submit" style={{ fontSize: 10, padding: '5px 12px' }} onClick={() => setModal({ type: 'verbaliser', misIndex: i })}>⚖ Verbaliser</button>
                  <button className="btn-blue" style={{ fontSize: 10, padding: '5px 12px' }} onClick={() => setModal({ type: 'lier' })}>📁 Lier au casier</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Groupes mis en cause */}
        {(plainte.groupesMisEnCause || []).filter(g => g.groupeId).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <span className="field-label" style={{ display: 'block', marginBottom: 10 }}>⚔ Groupe(s) mis en cause</span>
            {plainte.groupesMisEnCause.filter(g => g.groupeId).map((g, i) => (
              <div key={i} style={{ background: 'rgba(139,26,26,.12)', border: '1px solid rgba(139,26,26,.3)', borderRadius: 3, padding: '10px 16px', marginBottom: 6 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: '#ff9966' }}>⚔ {g.nomGroupe}</span>
              </div>
            ))}
          </div>
        )}

        {/* Faits */}
        {plainte.faits && (
          <div style={{ marginBottom: 16 }}>
            <span className="field-label">Circonstances et faits</span>
            <div style={{ fontSize: 14, color: 'rgba(244,237,216,.85)', lineHeight: 1.7, marginTop: 6, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>{plainte.faits}</div>
          </div>
        )}

        {/* Éléments d'enquête */}
        {plainte.elementsEnquete && (
          <div style={{ marginBottom: 16, background: 'rgba(26,58,110,.15)', border: '1px solid rgba(26,58,110,.4)', borderLeft: '3px solid #6699cc', borderRadius: '0 4px 4px 0', padding: '14px 18px' }}>
            <span className="field-label" style={{ color: '#9ec4ff' }}>🔍 Éléments d'enquête en cours</span>
            <div style={{ fontSize: 14, color: 'rgba(244,237,216,.85)', lineHeight: 1.7, marginTop: 8, whiteSpace: 'pre-wrap' }}>{plainte.elementsEnquete}</div>
          </div>
        )}

        {/* Casiers liés */}
        {casiersLies.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <span className="field-label" style={{ display: 'block', marginBottom: 10 }}>📁 Casiers judiciaires liés ({casiersLies.length})</span>
            {casiersLies.map(c => (
              <div key={c.id} style={{ background: 'rgba(26,58,110,.2)', border: '1px solid rgba(26,58,110,.5)', borderRadius: 3, padding: '10px 16px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, color: '#9ec4ff' }}>{c.nomComplet} — {c.nbInfractions || 0} inf. — {c.totalAmende || 0} $</div>
                <button className="btn-red" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => delierCasier(c.id)}>✕ Délier</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginBottom: 8 }}>
          <button className="btn-blue" style={{ fontSize: 11 }} onClick={() => setModal({ type: 'lier' })}>📁 Lier à un casier existant</button>
        </div>

        <div className="actions-row">
          <button className="btn-gold" onClick={onEdit}>✏ Modifier la plainte</button>
          <button className="btn-red" onClick={onDelete}>🗑 Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────
export default function Plaintes({ showNotif }) {
  const [plaintes, setPlaintes] = useState([]);
  const [citoyens, setCitoyens] = useState([]);
  const [agents, setAgents] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [casiers, setCasiers] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pSnap, cSnap, aSnap, casSnap, gSnap] = await Promise.all([
        getDocs(query(collection(db, 'plaintes'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'citoyens'), orderBy('nomComplet'))),
        getDocs(query(collection(db, 'effectif'), orderBy('nom'))),
        getDocs(collection(db, 'casier')),
        getDocs(query(collection(db, 'groupes'), orderBy('nom'))),
      ]);
      setPlaintes(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCitoyens(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAgents(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setGroupes(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const cm = {};
      casSnap.forEach(d => { cm[d.id] = { id: d.id, ...d.data() }; });
      setCasiers(cm);
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
    setLoading(false);
  }, [showNotif]);

  useEffect(() => { load(); }, [load]);

  async function deletePlainte() {
    if (!window.confirm('Supprimer cette plainte ?')) return;
    try { await deleteDoc(doc(db, 'plaintes', selected.id)); showNotif('Plainte supprimée'); setView('list'); setSelected(null); load(); }
    catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  function reloadDetail() { load(); if (selected) setSelected(p => ({ ...p, _refresh: Date.now() })); }

  const filtered = plaintes.filter(p => {
    const matchSearch = !search ||
      (p.plaintifsStr || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.misStr || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.faits || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch && (!filtreStatut || p.statut === filtreStatut);
  });

  if (view === 'detail' && selected) {
    const current = plaintes.find(p => p.id === selected.id) || selected;
    return (
      <>
        {showModal && (
          <PlainteModal plainte={current} citoyens={citoyens} agents={agents} groupes={groupes}
            onClose={() => setShowModal(false)}
            onSaved={() => { setShowModal(false); load(); }}
            showNotif={showNotif} />
        )}
        <PlainteDetail
          plainte={current} agents={agents} citoyens={citoyens} casiers={casiers}
          onBack={() => { setView('list'); setSelected(null); load(); }}
          onEdit={() => setShowModal(true)}
          onDelete={deletePlainte}
          onReload={reloadDetail}
          showNotif={showNotif}
        />
      </>
    );
  }

  return (
    <div>
      {showModal && (
        <PlainteModal plainte={null} citoyens={citoyens} agents={agents} groupes={groupes}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
          showNotif={showNotif} />
      )}
      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>📝 Dépôts de Plainte</span>
          <button className="btn-submit" style={{ padding: '8px 20px', fontSize: 13 }} onClick={() => setShowModal(true)}>➕ Nouveau dépôt de plainte</button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input type="text" className="field-input" style={{ flex: 1, minWidth: 200 }} placeholder="Rechercher par plaignant, mis en cause, faits..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="field-select" style={{ width: 180 }} value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className="btn-gold" onClick={load}>🔄 Actualiser</button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {STATUTS.map(s => {
            const n = plaintes.filter(p => p.statut === s.key).length;
            return <div key={s.key} style={{ background: 'rgba(0,0,0,.3)', border: '1px solid ' + s.color + '55', borderRadius: 3, padding: '8px 16px', fontFamily: "'Special Elite', cursive", fontSize: 12, color: s.color, letterSpacing: 1 }}>{s.label} : {n}</div>;
          })}
        </div>
        {loading && <div><span className="spinner" /> Chargement...</div>}
        {!loading && filtered.length === 0 && <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>Aucune plainte trouvée.</div>}
        {!loading && filtered.length > 0 && (
          <div className="dossier-grid">
            {filtered.map(p => <PlainteCard key={p.id} plainte={p} onOpen={() => { setSelected(p); setView('detail'); }} />)}
          </div>
        )}
      </div>
    </div>
  );
}
