import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, orderBy, query, serverTimestamp,
} from 'firebase/firestore';

const STATUTS = [
  { key: 'non_envoyee', label: '📭 Non envoyée', color: '#aaaaaa' },
  { key: 'envoyee',     label: '📬 Envoyée',     color: '#ffcc44' },
  { key: 'realisee',   label: '✅ Réalisée',     color: '#90ee90' },
];

function getStatut(key) {
  return STATUTS.find(s => s.key === key) || STATUTS[0];
}

// ── Modal création / modification ─────────────────────────────
function ConvocationModal({ convocation, citoyens, agents, onClose, onSaved, showNotif }) {
  const now = new Date();
  const rpDate = '1905-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  const [citoyenId, setCitoyenId] = useState(convocation?.citoyenId || '');
  const [form, setForm] = useState({
    date:    convocation?.date    || rpDate,
    heure:   convocation?.heure   || now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0'),
    raison:  convocation?.raison  || '',
    notes:   convocation?.notes   || '',
    statut:  convocation?.statut  || 'non_envoyee',
    lienPJ:  convocation?.lienPJ  || '',
    agent:   convocation?.agent   || '',
  });

  const citoyenChoisi = citoyens.find(c => c.id === citoyenId) || null;

  async function save() {
    if (!citoyenId) { showNotif('Sélectionnez un citoyen', true); return; }
    if (!form.agent.trim()) { showNotif('Agent obligatoire', true); return; }
    if (!form.raison.trim()) { showNotif('La raison est obligatoire', true); return; }

    const data = {
      ...form,
      citoyenId,
      nomComplet: citoyenChoisi?.nomComplet || '',
      carteId:    citoyenChoisi?.carteId    || '',
      metier:     citoyenChoisi?.metier     || '',
      telegram:   citoyenChoisi?.telegram   || '',
      updatedAt:  serverTimestamp(),
    };

    try {
      if (convocation?.id) {
        await updateDoc(doc(db, 'convocations', convocation.id), data);
        showNotif('Convocation modifiée !');
      } else {
        await addDoc(collection(db, 'convocations'), { ...data, createdAt: serverTimestamp() });
        showNotif('Convocation créée !');
      }
      onSaved();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div className="modal-overlay open">
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-title">{convocation?.id ? '✏ Modifier la convocation' : '➕ Nouvelle convocation'}</div>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Citoyen */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Citoyen convoqué *</label>
          <select className="field-select" value={citoyenId} onChange={e => setCitoyenId(e.target.value)}>
            <option value="">— Sélectionner un citoyen —</option>
            {citoyens.map(c => (
              <option key={c.id} value={c.id}>{c.nomComplet}{c.metier ? ' — ' + c.metier : ''}</option>
            ))}
          </select>
        </div>

        {/* Récap citoyen */}
        {citoyenChoisi && (
          <div style={{ background: 'rgba(201,168,76,.07)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 3, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {citoyenChoisi.carteId && <div><span className="field-label" style={{ fontSize: 9 }}>Carte</span><div style={{ fontSize: 13 }}>{citoyenChoisi.carteId}</div></div>}
            {citoyenChoisi.metier  && <div><span className="field-label" style={{ fontSize: 9 }}>Métier</span><div style={{ fontSize: 13 }}>{citoyenChoisi.metier}</div></div>}
            {citoyenChoisi.telegram && <div><span className="field-label" style={{ fontSize: 9 }}>Télégramme</span><div style={{ fontSize: 13 }}>{citoyenChoisi.telegram}</div></div>}
            {citoyenChoisi.comte   && <div><span className="field-label" style={{ fontSize: 9 }}>Comté</span><div style={{ fontSize: 13 }}>{citoyenChoisi.comte}</div></div>}
          </div>
        )}

        {/* Date / Heure */}
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">Date de convocation</label>
            <input type="date" className="field-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Heure</label>
            <input type="time" className="field-input" value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} />
          </div>
        </div>

        {/* Statut */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Statut</label>
          <select className="field-select" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
            {STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        {/* Agent */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Agent convocateur *</label>
          {agents && agents.length > 0 ? (
            <select className="field-select" value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))}>
              <option value="">— Sélectionner un agent —</option>
              {agents.map(a => (
                <option key={a.id} value={`${a.grade || ''} ${a.prenom || ''} ${a.nom || ''}`.trim()}>
                  {a.grade ? a.grade + ' — ' : ''}{a.prenom} {a.nom}
                </option>
              ))}
            </select>
          ) : (
            <input type="text" className="field-input"
              placeholder="Nom et grade de l'agent..."
              value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))} />
          )}
        </div>

        {/* Raison */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Raison de la convocation *</label>
          <textarea className="field-textarea" style={{ minHeight: 80 }}
            placeholder="Motif de la convocation au poste..."
            value={form.raison} onChange={e => setForm(f => ({ ...f, raison: e.target.value }))} />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Notes complémentaires</label>
          <textarea className="field-textarea" style={{ minHeight: 60 }}
            placeholder="Observations, éléments à préparer..."
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        {/* Lien pièce jointe */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">🔗 Lien / Pièce jointe (URL)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="url" className="field-input" style={{ flex: 1 }}
              placeholder="https://..."
              value={form.lienPJ}
              onChange={e => setForm(f => ({ ...f, lienPJ: e.target.value }))}
            />
            {form.lienPJ && (
              <a href={form.lienPJ} target="_blank" rel="noreferrer"
                style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'var(--gold)', whiteSpace: 'nowrap', padding: '6px 10px', border: '1px solid rgba(201,168,76,.4)', borderRadius: 2 }}>
                👁 Voir
              </a>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(244,237,216,.35)', fontStyle: 'italic', marginTop: 4 }}>
            Coller un lien vers un document Google Drive, Imgur, etc.
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

// ── Composant principal ───────────────────────────────────────
export default function Convocations({ showNotif }) {
  const [convocations, setConvocations] = useState([]);
  const [citoyens, setCitoyens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null); // convocation en cours d'édition

  const [agents, setAgents] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cSnap, citSnap, agentSnap] = await Promise.all([
        getDocs(query(collection(db, 'convocations'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'citoyens'), orderBy('nomComplet'))),
        getDocs(query(collection(db, 'effectif'), orderBy('nom'))),
      ]);
      setConvocations(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCitoyens(citSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAgents(agentSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
    setLoading(false);
  }, [showNotif]);

  useEffect(() => { load(); }, [load]);

  async function changeStatut(id, statut) {
    try {
      await updateDoc(doc(db, 'convocations', id), { statut, updatedAt: serverTimestamp() });
      setConvocations(cs => cs.map(c => c.id === id ? { ...c, statut } : c));
      showNotif('Statut mis à jour');
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  async function deleteConvocation(id) {
    if (!window.confirm('Supprimer cette convocation ?')) return;
    try {
      await deleteDoc(doc(db, 'convocations', id));
      showNotif('Convocation supprimée');
      load();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  const filtered = convocations.filter(c => {
    const q = search.toLowerCase();
    const matchSearch =
      (c.nomComplet || '').toLowerCase().includes(q) ||
      (c.raison || '').toLowerCase().includes(q) ||
      (c.carteId || '').toLowerCase().includes(q);
    const matchStatut = !filtreStatut || c.statut === filtreStatut;
    return matchSearch && matchStatut;
  });

  // Compteurs par statut
  const counts = {};
  STATUTS.forEach(s => { counts[s.key] = convocations.filter(c => c.statut === s.key).length; });

  return (
    <div>
      {(showModal) && (
        <ConvocationModal
          convocation={selected}
          citoyens={citoyens}
          agents={agents}
          onClose={() => { setShowModal(false); setSelected(null); }}
          onSaved={() => { setShowModal(false); setSelected(null); load(); }}
          showNotif={showNotif}
        />
      )}

      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>📋 Convocations au poste</span>
          <button className="btn-submit" style={{ fontSize: 12 }} onClick={() => { setSelected(null); setShowModal(true); }}>
            + Nouvelle convocation
          </button>
        </div>

        {/* Compteurs statut */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {STATUTS.map(s => (
            <span key={s.key} className="stat-badge" style={{ borderColor: s.color + '88', color: s.color }}>
              {s.label} : {counts[s.key] || 0}
            </span>
          ))}
        </div>

        {/* Filtres */}
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <input
            type="text" className="field-input" style={{ flex: 1 }}
            placeholder="Rechercher par nom, carte d'identité, raison..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-gold" onClick={load}>🔄 Actualiser</button>
        </div>

        {/* Filtre statut */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFiltreStatut('')}
            className={!filtreStatut ? 'btn-submit' : 'btn-gold'}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >Tous</button>
          {STATUTS.map(s => (
            <button
              key={s.key}
              onClick={() => setFiltreStatut(filtreStatut === s.key ? '' : s.key)}
              style={{
                fontSize: 12, padding: '6px 14px', borderRadius: 2, cursor: 'pointer',
                border: '1px solid ' + s.color,
                background: filtreStatut === s.key ? s.color + '33' : 'transparent',
                color: s.color, fontFamily: "'Special Elite', cursive", letterSpacing: 1,
              }}
            >{s.label}</button>
          ))}
        </div>

        {loading && <div><span className="spinner" /> Chargement...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>
            Aucune convocation trouvée.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(conv => {
              const statut = getStatut(conv.statut);
              return (
                <div key={conv.id} style={{
                  background: 'rgba(0,0,0,.25)',
                  border: '1px solid ' + statut.color + '55',
                  borderLeft: '4px solid ' + statut.color,
                  borderRadius: 3, padding: '16px 20px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      {/* Nom + statut */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16, color: 'var(--paper)', fontFamily: "'IM Fell English', serif" }}>
                          {conv.nomComplet || '—'}
                        </span>
                        <span style={{
                          fontFamily: "'Special Elite', cursive", fontSize: 11, letterSpacing: 1,
                          padding: '2px 10px', borderRadius: 2,
                          border: '1px solid ' + statut.color,
                          color: statut.color, background: statut.color + '22',
                        }}>{statut.label}</span>
                      </div>

                      {/* Infos citoyen */}
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                        {conv.carteId && (
                          <div><span className="field-label" style={{ fontSize: 9 }}>Carte</span>
                            <div style={{ fontSize: 12, color: 'var(--gold)' }}>{conv.carteId}</div></div>
                        )}
                        {conv.metier && (
                          <div><span className="field-label" style={{ fontSize: 9 }}>Métier</span>
                            <div style={{ fontSize: 12, color: 'rgba(244,237,216,.7)' }}>{conv.metier}</div></div>
                        )}
                        {conv.telegram && (
                          <div><span className="field-label" style={{ fontSize: 9 }}>Télégramme</span>
                            <div style={{ fontSize: 12, color: 'rgba(244,237,216,.7)' }}>{conv.telegram}</div></div>
                        )}
                        {conv.date && (
                          <div><span className="field-label" style={{ fontSize: 9 }}>Date convocation</span>
                            <div style={{ fontSize: 12, color: 'rgba(244,237,216,.7)' }}>{conv.date}{conv.heure ? ' à ' + conv.heure : ''}</div></div>
                        )}
                      </div>

                      {/* Raison */}
                      <div style={{ marginBottom: conv.notes ? 6 : 0 }}>
                        <span className="field-label" style={{ fontSize: 9 }}>Raison</span>
                        <div style={{ fontSize: 13, color: 'rgba(244,237,216,.85)', lineHeight: 1.5, marginTop: 2 }}>{conv.raison}</div>
                      </div>

                      {/* Notes */}
                      {conv.notes && (
                        <div style={{ marginTop: 6 }}>
                          <span className="field-label" style={{ fontSize: 9 }}>Notes</span>
                          <div style={{ fontSize: 12, color: 'rgba(244,237,216,.55)', fontStyle: 'italic', lineHeight: 1.5, marginTop: 2 }}>{conv.notes}</div>
                        </div>
                      )}

                      {/* Lien PJ */}
                      {conv.lienPJ && (
                        <div style={{ marginTop: 8 }}>
                          <span className="field-label" style={{ fontSize: 9 }}>Pièce jointe</span>
                          <div style={{ marginTop: 4 }}>
                            <a
                              href={conv.lienPJ} target="_blank" rel="noreferrer"
                              style={{ fontFamily: "'Special Elite', cursive", fontSize: 12, color: 'var(--gold)', letterSpacing: 1, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', border: '1px solid rgba(201,168,76,.35)', borderRadius: 2, background: 'rgba(201,168,76,.07)' }}
                            >
                              🔗 Ouvrir le document
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      {/* Changer statut */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {STATUTS.filter(s => s.key !== conv.statut).map(s => (
                          <button
                            key={s.key}
                            onClick={() => changeStatut(conv.id, s.key)}
                            style={{
                              fontSize: 10, padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
                              border: '1px solid ' + s.color,
                              background: 'transparent', color: s.color,
                              fontFamily: "'Special Elite', cursive", letterSpacing: 1,
                              whiteSpace: 'nowrap',
                            }}
                          >→ {s.label}</button>
                        ))}
                      </div>
                      <button
                        className="btn-gold"
                        style={{ fontSize: 11, padding: '5px 10px' }}
                        onClick={() => { setSelected(conv); setShowModal(true); }}
                      >✏ Modifier</button>
                      <button
                        className="btn-red"
                        style={{ fontSize: 11, padding: '5px 10px' }}
                        onClick={() => deleteConvocation(conv.id)}
                      >🗑 Supprimer</button>
                    </div>
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
