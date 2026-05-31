import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc,
  doc, orderBy, query, serverTimestamp, getDoc, setDoc,
  addDoc as addDocAlias, increment,
} from 'firebase/firestore';
import { ALL_INFRACTIONS } from '../data/penalCode';

// ── Statuts possibles ──────────────────────────────────────────
const STATUTS = [
  { key: 'ouverte',   label: '🔴 Ouverte',     color: '#ff6b6b' },
  { key: 'instruite', label: '🟡 En instruction', color: '#ffcc44' },
  { key: 'classee',   label: '🟢 Classée',      color: '#90ee90' },
];

// ── Modal verbalisation rapide depuis une plainte ─────────────
function VerbalisationModal({ plainte, agents, onClose, onDone, showNotif }) {
  const [selected, setSelected] = useState([]);
  const [agent, setAgent] = useState('');
  const [note, setNote] = useState('Verbalisation suite à dépôt de plainte');

  const total = selected.reduce((s, x) => s + x.amende, 0);
  const hasSisika = selected.some(x => x.sisika);

  function toggle(art) {
    setSelected(prev => prev.find(x => x.num === art.num) ? prev.filter(x => x.num !== art.num) : [...prev, art]);
  }

  async function submit() {
    if (!selected.length) { showNotif('Sélectionnez au moins une infraction', true); return; }
    if (!plainte.miseEnCause || !plainte.miseEnCause.nom) { showNotif("Aucune personne mise en cause identifiée sur cette plainte", true); return; }

    const mis = plainte.miseEnCause;
    const idNum = mis.carteId || (mis.prenom + '_' + mis.nom).replace(/ /g, '_');
    const now = new Date();
    const record = {
      date: now.toISOString().split('T')[0],
      heure: now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0'),
      agent: agent || 'Non précisé',
      nom: mis.nom, prenom: mis.prenom || '',
      idNum, nomComplet: (mis.prenom ? mis.prenom + ' ' : '') + mis.nom,
      sexe: '', age: 0,
      note, desc: `Plainte déposée par ${plainte.plaintifsStr} — ${plainte.faits || ''}`,
      infractions: selected, total, sisika: hasSisika,
      photos: [], createdAt: serverTimestamp(),
      plainteId: plainte.id,
    };

    try {
      const dRef = doc(db, 'casier', idNum);
      const dSnap = await getDoc(dRef);
      if (!dSnap.exists()) {
        await setDoc(dRef, {
          idNum, nom: mis.nom, prenom: mis.prenom || '',
          nomComplet: record.nomComplet, sexe: '', age: 0,
          createdAt: serverTimestamp(), totalAmende: 0, sisika: false, nbInfractions: 0,
        });
      }
      await addDoc(collection(dRef, 'infractions'), record);
      await updateDoc(dRef, {
        totalAmende: increment(total),
        sisika: hasSisika || (dSnap.exists() && dSnap.data().sisika),
        nbInfractions: increment(1),
      });
      // Mettre à jour le statut de la plainte
      await updateDoc(doc(db, 'plaintes', plainte.id), {
        statut: 'instruite',
        casierLie: idNum,
      });
      showNotif('Verbalisation créée et casier mis à jour !');
      onDone();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div className="modal-overlay open">
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-title">⚖ Verbalisation depuis la plainte</div>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div style={{ background: 'rgba(139,26,26,.15)', border: '1px solid rgba(139,26,26,.3)', borderRadius: 3, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: '#ff9966', letterSpacing: 1, marginBottom: 4 }}>MISE EN CAUSE</div>
          {plainte.miseEnCause?.nom
            ? <div style={{ fontSize: 15, color: 'var(--paper)' }}>{plainte.miseEnCause.prenom} {plainte.miseEnCause.nom}{plainte.miseEnCause.carteId ? ' — ' + plainte.miseEnCause.carteId : ''}</div>
            : <div style={{ color: '#ff6b6b', fontStyle: 'italic' }}>⚠ Plainte contre X — identité inconnue. Complétez d'abord la fiche plainte.</div>
          }
        </div>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">Agent verbalisateur</label>
            {agents.length > 0 ? (
              <select className="field-select" value={agent} onChange={e => setAgent(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {agents.map(a => <option key={a.id} value={`${a.grade} ${a.prenom} ${a.nom}`}>{a.grade} — {a.prenom} {a.nom}</option>)}
              </select>
            ) : (
              <input type="text" className="field-input" value={agent} onChange={e => setAgent(e.target.value)} placeholder="Nom de l'agent" />
            )}
          </div>
          <div>
            <label className="field-label">Note</label>
            <input type="text" className="field-input" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label" style={{ marginBottom: 10 }}>Infractions</label>
          <div className="infractions-grid">
            {ALL_INFRACTIONS.map(art => {
              const isSel = selected.some(x => x.num === art.num);
              return (
                <div key={art.num} className={`infraction-item${isSel ? ' selected' : ''}`} onClick={() => toggle(art)}>
                  <div className="infraction-check">{isSel ? '✓' : ''}</div>
                  <div>
                    <div className="infraction-art">{art.num}</div>
                    <div className="infraction-name">{art.nom}</div>
                    <div className="infraction-amount">{art.sisika ? '🔒 Sisika ' : ''}{art.amende > 0 ? art.amende + ' $' : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="total-box" style={{ marginBottom: 16 }}>
          <div>
            <div className="total-label">Amende totale</div>
            {hasSisika && <span className="sisika-badge">⚠ SÉJOUR À SISIKA</span>}
          </div>
          <div className="total-amount">{total} $</div>
        </div>

        <div className="actions-row">
          <button className="btn-submit" onClick={submit} disabled={!plainte.miseEnCause?.nom}>⚖ Créer la verbalisation</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal dépôt de plainte ────────────────────────────────────
function PlainteModal({ plainte, citoyens, agents, onClose, onSaved, showNotif }) {
  const now = new Date();
  const [form, setForm] = useState({
    date:   plainte?.date  || now.toISOString().split('T')[0],
    heure:  plainte?.heure || now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0'),
    agent:  plainte?.agent || '',
    faits:  plainte?.faits || '',
    statut: plainte?.statut || 'ouverte',
  });

  // Plaignants — liste dynamique
  const [plaignants, setPlaignants] = useState(
    plainte?.plaignants?.length ? plainte.plaignants : [{ type: 'citoyen', citoyenId: '', nom: '', prenom: '' }]
  );

  // Mise en cause
  const [miseEnCause, setMiseEnCause] = useState(
    plainte?.miseEnCause || { connu: false, citoyenId: '', nom: '', prenom: '', carteId: '' }
  );

  function addPlaignant() {
    setPlaignants(p => [...p, { type: 'citoyen', citoyenId: '', nom: '', prenom: '' }]);
  }
  function removePlaignant(i) {
    setPlaignants(p => p.filter((_, j) => j !== i));
  }
  function updatePlaignant(i, key, val) {
    setPlaignants(p => p.map((x, j) => j === i ? { ...x, [key]: val } : x));
  }
  function selectCitoyen(i, citoyenId) {
    const c = citoyens.find(c => c.id === citoyenId);
    if (c) updatePlaignant(i, 'citoyenId', citoyenId);
    else updatePlaignant(i, 'citoyenId', '');
    if (c) {
      setPlaignants(p => p.map((x, j) => j === i ? { ...x, citoyenId, nom: c.nom, prenom: c.prenom } : x));
    }
  }
  function selectMiseEnCause(citoyenId) {
    const c = citoyens.find(c => c.id === citoyenId);
    if (c) setMiseEnCause(m => ({ ...m, citoyenId, nom: c.nom, prenom: c.prenom, carteId: c.carteId || '' }));
    else setMiseEnCause(m => ({ ...m, citoyenId: '' }));
  }

  async function save() {
    if (!plaignants.some(p => p.nom || p.citoyenId)) {
      showNotif('Indiquez au moins un plaignant', true); return;
    }
    const plaintifsStr = plaignants.map(p => (p.prenom ? p.prenom + ' ' : '') + (p.nom || 'Inconnu')).join(', ');
    const data = { ...form, plaignants, miseEnCause, plaintifsStr, updatedAt: serverTimestamp() };
    try {
      if (plainte?.id) {
        await updateDoc(doc(db, 'plaintes', plainte.id), data);
        showNotif('Plainte modifiée !');
      } else {
        await addDoc(collection(db, 'plaintes'), { ...data, createdAt: serverTimestamp() });
        showNotif('Plainte enregistrée !');
      }
      onSaved();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div className="modal-overlay open">
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-title">{plainte?.id ? '✏ Modifier la plainte' : '📝 Nouveau dépôt de plainte'}</div>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Date / Heure / Agent / Statut */}
        <div className="form-grid three" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">Date *</label>
            <input type="date" className="field-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Heure</label>
            <input type="time" className="field-input" value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Statut</label>
            <select className="field-select" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
              {STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

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
          {form.agent === '__autre__' && (
            <input type="text" className="field-input" style={{ marginTop: 8 }} placeholder="Nom de l'agent" onChange={e => setForm(f => ({ ...f, agent: e.target.value }))} />
          )}
        </div>

        {/* Plaignants */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label className="field-label" style={{ margin: 0 }}>Plaignant(s) *</label>
            <button className="btn-blue" style={{ fontSize: 10, padding: '4px 10px' }} onClick={addPlaignant}>+ Ajouter un plaignant</button>
          </div>
          {plaignants.map((p, i) => (
            <div key={i} style={{ background: 'rgba(0,0,0,.2)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 3, padding: '12px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(201,168,76,.7)', letterSpacing: 1 }}>Plaignant {i + 1}</span>
                {plaignants.length > 1 && <button className="btn-red" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => removePlaignant(i)}>✕ Retirer</button>}
              </div>
              {citoyens.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <label className="field-label">Citoyen enregistré</label>
                  <select className="field-select" value={p.citoyenId || ''} onChange={e => selectCitoyen(i, e.target.value)}>
                    <option value="">— Saisir manuellement —</option>
                    {citoyens.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}{c.metier ? ' (' + c.metier + ')' : ''}</option>)}
                  </select>
                </div>
              )}
              <div className="form-grid">
                <div>
                  <label className="field-label">Nom</label>
                  <input type="text" className="field-input" placeholder="Nom" value={p.nom} onChange={e => updatePlaignant(i, 'nom', e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Prénom</label>
                  <input type="text" className="field-input" placeholder="Prénom" value={p.prenom} onChange={e => updatePlaignant(i, 'prenom', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mise en cause */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label" style={{ marginBottom: 10 }}>Personne mise en cause</label>
          <div style={{ background: 'rgba(139,26,26,.1)', border: '1px solid rgba(139,26,26,.3)', borderRadius: 3, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: "'Special Elite', cursive", fontSize: 12, color: 'rgba(244,237,216,.7)' }}>
                <input type="checkbox" checked={!miseEnCause.connu} onChange={e => setMiseEnCause(m => ({ ...m, connu: !e.target.checked, nom: '', prenom: '', citoyenId: '', carteId: '' }))} />
                Plainte contre X (auteur inconnu)
              </label>
            </div>
            {miseEnCause.connu !== false && (
              <>
                {citoyens.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <label className="field-label">Citoyen enregistré</label>
                    <select className="field-select" value={miseEnCause.citoyenId || ''} onChange={e => selectMiseEnCause(e.target.value)}>
                      <option value="">— Saisir manuellement —</option>
                      {citoyens.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}{c.metier ? ' (' + c.metier + ')' : ''}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-grid">
                  <div>
                    <label className="field-label">Nom</label>
                    <input type="text" className="field-input" placeholder="Nom du mis en cause" value={miseEnCause.nom} onChange={e => setMiseEnCause(m => ({ ...m, nom: e.target.value }))} />
                  </div>
                  <div>
                    <label className="field-label">Prénom</label>
                    <input type="text" className="field-input" placeholder="Prénom" value={miseEnCause.prenom} onChange={e => setMiseEnCause(m => ({ ...m, prenom: e.target.value }))} />
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <label className="field-label">N° Carte d'identité (si connu)</label>
                  <input type="text" className="field-input" placeholder="Ex: SD-1905-001" value={miseEnCause.carteId} onChange={e => setMiseEnCause(m => ({ ...m, carteId: e.target.value }))} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Faits */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Circonstances, lieu, description des faits</label>
          <textarea className="field-textarea" style={{ minHeight: 120 }} placeholder="Décrivez les circonstances, le lieu et les faits rapportés par le plaignant..." value={form.faits} onChange={e => setForm(f => ({ ...f, faits: e.target.value }))} />
        </div>

        <div className="actions-row">
          <button className="btn-submit" onClick={save}>💾 Enregistrer la plainte</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Carte plainte ─────────────────────────────────────────────
function PlainteCard({ plainte, onOpen }) {
  const statut = STATUTS.find(s => s.key === plainte.statut) || STATUTS[0];
  return (
    <div className="dossier-card" onClick={onOpen} style={{ borderLeft: '3px solid ' + statut.color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div className="dossier-id">📅 {plainte.date}{plainte.heure ? ' à ' + plainte.heure : ''}</div>
        <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: statut.color, letterSpacing: 1 }}>{statut.label}</span>
      </div>
      <div className="dossier-name" style={{ fontSize: 15, marginBottom: 4 }}>
        {plainte.plaintifsStr || '—'}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(244,237,216,.5)', marginBottom: 8, fontStyle: 'italic' }}>
        contre : {plainte.miseEnCause?.connu === false
          ? '⚠ Auteur inconnu (X)'
          : (plainte.miseEnCause?.prenom ? plainte.miseEnCause.prenom + ' ' : '') + (plainte.miseEnCause?.nom || '—')}
      </div>
      {plainte.faits && (
        <div style={{ fontSize: 12, color: 'rgba(244,237,216,.6)', lineHeight: 1.5, marginBottom: 8 }}>
          {plainte.faits.length > 120 ? plainte.faits.slice(0, 120) + '…' : plainte.faits}
        </div>
      )}
      {plainte.agent && <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(201,168,76,.6)', letterSpacing: 1 }}>👮 {plainte.agent}</div>}
      {plainte.casierLie && <div style={{ marginTop: 6 }}><span className="stat-badge" style={{ borderColor: '#CC0000', color: '#ff9966' }}>📁 Casier lié</span></div>}
    </div>
  );
}

// ── Vue détail plainte ────────────────────────────────────────
function PlainteDetail({ plainte, agents, citoyens, casiers, onBack, onEdit, onDelete, onVerbaliser, onLierCasier, showNotif }) {
  const statut = STATUTS.find(s => s.key === plainte.statut) || STATUTS[0];
  const casierLie = plainte.casierLie ? casiers[plainte.casierLie] : null;

  async function changerStatut(s) {
    try {
      await updateDoc(doc(db, 'plaintes', plainte.id), { statut: s });
      showNotif('Statut mis à jour');
      onBack(true);
    } catch (e) { showNotif('Erreur', true); }
  }

  return (
    <div>
      <button className="back-btn" onClick={() => onBack(false)}>← Retour aux plaintes</button>

      <div className="card" style={{ borderLeft: '4px solid ' + statut.color }}>
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>📝 Dépôt de plainte</span>
          <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 13, color: statut.color, letterSpacing: 1 }}>{statut.label}</span>
        </div>

        {/* Infos générales */}
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
            <div key={i} style={{ fontSize: 15, color: 'var(--paper)', padding: '4px 0' }}>
              👤 {p.prenom ? p.prenom + ' ' : ''}{p.nom || 'Inconnu'}
            </div>
          ))}
        </div>

        {/* Mis en cause */}
        <div style={{ background: 'rgba(139,26,26,.15)', border: '1px solid rgba(139,26,26,.3)', borderRadius: 3, padding: '14px 16px', marginBottom: 16 }}>
          <span className="field-label">Personne mise en cause</span>
          {plainte.miseEnCause?.connu === false
            ? <div style={{ color: '#ff9966', fontFamily: "'Special Elite', cursive", fontSize: 13, letterSpacing: 1, marginTop: 4 }}>⚠ Auteur inconnu — Plainte contre X</div>
            : <div style={{ fontSize: 16, color: 'var(--paper)', marginTop: 4 }}>
                {plainte.miseEnCause?.prenom ? plainte.miseEnCause.prenom + ' ' : ''}{plainte.miseEnCause?.nom || '—'}
                {plainte.miseEnCause?.carteId && <span style={{ marginLeft: 10, fontFamily: "'Special Elite', cursive", fontSize: 12, color: 'var(--gold)' }}>{plainte.miseEnCause.carteId}</span>}
              </div>
          }
        </div>

        {/* Faits */}
        {plainte.faits && (
          <div style={{ marginBottom: 16 }}>
            <span className="field-label">Circonstances et faits</span>
            <div style={{ fontSize: 14, color: 'rgba(244,237,216,.85)', lineHeight: 1.7, marginTop: 6, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>{plainte.faits}</div>
          </div>
        )}

        {/* Casier lié */}
        {casierLie && (
          <div style={{ background: 'rgba(26,58,110,.2)', border: '1px solid rgba(26,58,110,.5)', borderRadius: 3, padding: '12px 16px', marginBottom: 16 }}>
            <span className="field-label">📁 Casier judiciaire lié</span>
            <div style={{ marginTop: 6, fontSize: 14, color: '#9ec4ff' }}>
              {casierLie.nomComplet} — {casierLie.nbInfractions || 0} infraction(s) — {casierLie.totalAmende || 0} $
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="actions-row">
          <button className="btn-gold" onClick={onEdit}>✏ Modifier</button>
          {!plainte.casierLie && plainte.miseEnCause?.connu !== false && plainte.miseEnCause?.nom && (
            <>
              <button className="btn-submit" style={{ fontSize: 12 }} onClick={onVerbaliser}>⚖ Verbaliser et lier au casier</button>
              <button className="btn-blue" onClick={onLierCasier}>📁 Lier à un casier existant</button>
            </>
          )}
          <button className="btn-red" onClick={onDelete}>🗑 Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal lier à casier existant ──────────────────────────────
function LierCasierModal({ plainte, casiers, onClose, onDone, showNotif }) {
  const [casierKey, setCasierKey] = useState('');
  const casierList = Object.values(casiers);

  async function lier() {
    if (!casierKey) { showNotif('Sélectionnez un casier', true); return; }
    try {
      await updateDoc(doc(db, 'plaintes', plainte.id), { casierLie: casierKey, statut: 'instruite' });
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
            {casierList.map(c => <option key={c.id} value={c.id}>{c.nomComplet} ({c.nbInfractions || 0} inf. — {c.totalAmende || 0} $)</option>)}
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

// ── Composant principal ────────────────────────────────────────
export default function Plaintes({ showNotif }) {
  const [plaintes, setPlaintes] = useState([]);
  const [citoyens, setCitoyens] = useState([]);
  const [agents, setAgents] = useState([]);
  const [casiers, setCasiers] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);       // null | 'edit' | 'verbaliser' | 'lier'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pSnap, cSnap, aSnap, casSnap] = await Promise.all([
        getDocs(query(collection(db, 'plaintes'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'citoyens'), orderBy('nomComplet'))),
        getDocs(query(collection(db, 'effectif'), orderBy('nom'))),
        getDocs(collection(db, 'casier')),
      ]);
      setPlaintes(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCitoyens(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAgents(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const cm = {};
      casSnap.forEach(d => { cm[d.id] = { id: d.id, ...d.data() }; });
      setCasiers(cm);
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
    setLoading(false);
  }, [showNotif]);

  useEffect(() => { load(); }, [load]);

  async function deletePlainte() {
    if (!window.confirm('Supprimer cette plainte ?')) return;
    try {
      await deleteDoc(doc(db, 'plaintes', selected.id));
      showNotif('Plainte supprimée');
      setView('list');
      setSelected(null);
      load();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  const filtered = plaintes.filter(p => {
    const matchSearch = !search ||
      (p.plaintifsStr || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.miseEnCause?.nom || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.faits || '').toLowerCase().includes(search.toLowerCase());
    const matchStatut = !filtreStatut || p.statut === filtreStatut;
    return matchSearch && matchStatut;
  });

  // ── Vue détail ──
  if (view === 'detail' && selected) {
    const currentPlainte = plaintes.find(p => p.id === selected.id) || selected;
    return (
      <>
        {modal === 'edit' && (
          <PlainteModal plainte={currentPlainte} citoyens={citoyens} agents={agents}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); load(); setSelected(s => ({ ...s })); }}
            showNotif={showNotif} />
        )}
        {modal === 'verbaliser' && (
          <VerbalisationModal plainte={currentPlainte} agents={agents}
            onClose={() => setModal(null)}
            onDone={() => { setModal(null); load(); setView('list'); }}
            showNotif={showNotif} />
        )}
        {modal === 'lier' && (
          <LierCasierModal plainte={currentPlainte} casiers={casiers}
            onClose={() => setModal(null)}
            onDone={() => { setModal(null); load(); }}
            showNotif={showNotif} />
        )}
        <PlainteDetail
          plainte={currentPlainte}
          agents={agents} citoyens={citoyens} casiers={casiers}
          onBack={(reload) => { setView('list'); setSelected(null); if (reload) load(); }}
          onEdit={() => setModal('edit')}
          onDelete={deletePlainte}
          onVerbaliser={() => setModal('verbaliser')}
          onLierCasier={() => setModal('lier')}
          showNotif={showNotif}
        />
      </>
    );
  }

  // ── Vue liste ──
  return (
    <div>
      {modal === 'edit' && (
        <PlainteModal plainte={null} citoyens={citoyens} agents={agents}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          showNotif={showNotif} />
      )}

      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>📝 Dépôts de Plainte</span>
          <button className="btn-submit" style={{ padding: '8px 20px', fontSize: 13 }} onClick={() => setModal('edit')}>
            ➕ Nouveau dépôt de plainte
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input type="text" className="field-input" style={{ flex: 1, minWidth: 200 }}
            placeholder="Rechercher par plaignant, mis en cause, faits..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="field-select" style={{ width: 180 }} value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className="btn-gold" onClick={load}>🔄 Actualiser</button>
        </div>

        {/* Compteurs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {STATUTS.map(s => {
            const n = plaintes.filter(p => p.statut === s.key).length;
            return (
              <div key={s.key} style={{ background: 'rgba(0,0,0,.3)', border: '1px solid ' + s.color + '55', borderRadius: 3, padding: '8px 16px', fontFamily: "'Special Elite', cursive", fontSize: 12, color: s.color, letterSpacing: 1 }}>
                {s.label} : {n}
              </div>
            );
          })}
        </div>

        {loading && <div><span className="spinner" /> Chargement...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>Aucune plainte trouvée.</div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="dossier-grid">
            {filtered.map(p => (
              <PlainteCard key={p.id} plainte={p} onOpen={() => { setSelected(p); setView('detail'); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
