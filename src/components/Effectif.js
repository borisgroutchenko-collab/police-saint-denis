import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc,
  doc, orderBy, query, serverTimestamp,
} from 'firebase/firestore';

// ── Grades disponibles ─────────────────────────────────────────
// Modifiez cette liste pour ajouter / retirer des grades.
export const GRADES = [
  "Adjoint",
  "Adjoint Senior",
  "Shérif Adjoint",
  "Shérif",
  "Shérif en Chef",
];

// ── Modal ajout / édition ──────────────────────────────────────
function AgentModal({ agent, onClose, onSaved, showNotif }) {
  const [form, setForm] = useState({
    nom:       agent?.nom       || '',
    prenom:    agent?.prenom    || '',
    grade:     agent?.grade     || GRADES[0],
    telegram:  agent?.telegram  || '',
  });

  async function save() {
    if (!form.nom || !form.prenom) {
      showNotif('Nom et prénom obligatoires', true); return;
    }
    try {
      if (agent?.id) {
        await updateDoc(doc(db, 'effectif', agent.id), form);
        showNotif('Agent modifié !');
      } else {
        await addDoc(collection(db, 'effectif'), {
          ...form,
          createdAt: serverTimestamp(),
        });
        showNotif('Agent ajouté !');
      }
      onSaved();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div className="modal-overlay open">
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-title">{agent?.id ? '✏ Modifier l\'agent' : '➕ Nouvel agent'}</div>
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

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">Grade</label>
            <select className="field-select" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">N° Télégramme</label>
            <input type="text" className="field-input" placeholder="Ex: @morgan_sheriff" value={form.telegram} onChange={e => setForm(f => ({ ...f, telegram: e.target.value }))} />
          </div>
        </div>

        <div className="actions-row">
          <button className="btn-submit" onClick={save}>💾 Sauvegarder</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────
export default function Effectif({ showNotif }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // null | agent object (vide pour ajout)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'effectif'), orderBy('nom')));
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
    setLoading(false);
  }, [showNotif]);

  useEffect(() => { load(); }, [load]);

  async function deleteAgent(id, nom) {
    if (!window.confirm(`Supprimer ${nom} de l'effectif ?`)) return;
    try {
      await deleteDoc(doc(db, 'effectif', id));
      showNotif('Agent supprimé');
      load();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  // Couleur de badge par grade
  function gradeBadgeStyle(grade) {
    const map = {
      "Shérif en Chef":   { background: 'rgba(201,168,76,.25)', border: '1px solid var(--gold)', color: 'var(--gold)' },
      "Shérif":           { background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.6)', color: 'var(--gold-light)' },
      "Shérif Adjoint":   { background: 'rgba(26,58,110,.3)',   border: '1px solid rgba(26,58,110,.7)', color: '#9ec4ff' },
      "Adjoint Senior":   { background: 'rgba(0,0,0,.3)',       border: '1px solid rgba(244,237,216,.2)', color: 'rgba(244,237,216,.8)' },
      "Adjoint":          { background: 'rgba(0,0,0,.2)',       border: '1px solid rgba(244,237,216,.15)', color: 'rgba(244,237,216,.6)' },
    };
    return map[grade] || map["Adjoint"];
  }

  return (
    <div>
      {modal !== null && (
        <AgentModal
          agent={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          showNotif={showNotif}
        />
      )}

      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>👮 Effectif de la Police</span>
          <button className="btn-submit" style={{ padding: '8px 20px', fontSize: 13 }} onClick={() => setModal({})}>
            ➕ Ajouter un agent
          </button>
        </div>

        {loading && <div><span className="spinner" /> Chargement...</div>}

        {!loading && agents.length === 0 && (
          <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>
            Aucun agent enregistré.
          </div>
        )}

        {!loading && agents.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(201,168,76,.3)' }}>
                {['Grade', 'Nom', 'Prénom', 'N° Télégramme', 'Actions'].map(h => (
                  <th key={h} style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'var(--gold)', letterSpacing: 1, textAlign: 'left', padding: '8px 12px', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id} style={{ borderBottom: '1px solid rgba(201,168,76,.08)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ ...gradeBadgeStyle(agent.grade), borderRadius: 3, padding: '3px 10px', fontFamily: "'Special Elite', cursive", fontSize: 11, letterSpacing: 1 }}>
                      {agent.grade}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--paper)' }}>{agent.nom}</td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: 'rgba(244,237,216,.8)' }}>{agent.prenom}</td>
                  <td style={{ padding: '10px 12px', fontFamily: "'Special Elite', cursive", fontSize: 12, color: 'rgba(244,237,216,.5)', letterSpacing: 1 }}>{agent.telegram || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-blue" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => setModal(agent)}>✏ Modifier</button>
                      <button className="btn-red"  style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => deleteAgent(agent.id, agent.prenom + ' ' + agent.nom)}>🗑 Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
