import React, { useState, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, deleteDoc, doc, orderBy, query,
} from 'firebase/firestore';

const SERIAL_REGEX = /^\d{10}-\d{4}$/;

export default function Saisies({ showNotif }) {
  const [saisies, setSaisies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('tous'); // 'tous' | 'objet' | 'arme'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'saisies'), orderBy('createdAt', 'desc')));
      setSaisies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
    setLoading(false);
  }, [showNotif]);

  React.useEffect(() => { load(); }, [load]);

  async function deleteSaisie(id) {
    if (!window.confirm('Supprimer cette saisie ?')) return;
    try {
      await deleteDoc(doc(db, 'saisies', id));
      showNotif('Saisie supprimée');
      load();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  const filtered = saisies.filter(s => {
    const q = search.toLowerCase();
    const matchSearch =
      (s.nomComplet || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.serie || '').toLowerCase().includes(q) ||
      (s.agent || '').toLowerCase().includes(q);
    const matchType =
      filterType === 'tous' ||
      (filterType === 'arme' && s.type === 'arme') ||
      (filterType === 'objet' && s.type === 'objet');
    return matchSearch && matchType;
  });

  const nbArmes  = saisies.filter(s => s.type === 'arme').length;
  const nbObjets = saisies.filter(s => s.type === 'objet').length;

  return (
    <div>
      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>📦 Registre des Saisies</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="stat-badge">🔫 {nbArmes} arme(s)</span>
            <span className="stat-badge">📦 {nbObjets} objet(s)</span>
          </div>
        </div>

        {/* Filtres */}
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <input
            type="text" className="field-input" style={{ flex: 1 }}
            placeholder="Rechercher par individu, description, n° de série, agent..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-gold" onClick={load}>🔄 Actualiser</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'tous',  label: 'Tout afficher' },
            { key: 'arme',  label: '🔫 Armes uniquement' },
            { key: 'objet', label: '📦 Objets uniquement' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={filterType === f.key ? 'btn-submit' : 'btn-gold'}
              style={{ fontSize: 12, padding: '6px 14px' }}
            >{f.label}</button>
          ))}
        </div>

        {loading && <div><span className="spinner" /> Chargement...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>
            Aucune saisie enregistrée.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(s => (
              <div key={s.id} style={{
                background: s.type === 'arme'
                  ? 'rgba(139,26,26,.12)'
                  : 'rgba(201,168,76,.07)',
                border: `1px solid ${s.type === 'arme' ? 'rgba(139,26,26,.35)' : 'rgba(201,168,76,.25)'}`,
                borderRadius: 3, padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    {/* Badges type + source */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span className="stat-badge" style={{
                        borderColor: s.type === 'arme' ? 'rgba(139,26,26,.6)' : 'rgba(201,168,76,.5)',
                        color: s.type === 'arme' ? '#ff9966' : 'var(--gold)',
                      }}>
                        {s.type === 'arme' ? '🔫 Arme' : '📦 Objet'}
                      </span>
                      <span className="stat-badge" style={{ fontSize: 10 }}>
                        {s.source === 'verbalisation' ? '⚖ Verbalisation' : '📝 Dépôt de plainte'}
                      </span>
                      {s.date && (
                        <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 10, color: 'rgba(201,168,76,.6)', letterSpacing: 1 }}>
                          📅 {s.date}{s.heure ? ' à ' + s.heure : ''}
                        </span>
                      )}
                    </div>

                    {/* Description / nom arme */}
                    <div style={{ fontSize: 15, color: 'var(--paper)', marginBottom: 4, fontFamily: "'IM Fell English', serif" }}>
                      {s.description || s.nomArme || '—'}
                    </div>

                    {/* Numéro de série si arme */}
                    {s.serie && (
                      <div style={{ fontFamily: "'Special Elite', cursive", color: 'var(--gold)', fontSize: 13, letterSpacing: 1, marginBottom: 4 }}>
                        N° série : {s.serie}
                      </div>
                    )}

                    {/* Individu concerné */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
                      {s.nomComplet && (
                        <div>
                          <span className="field-label" style={{ fontSize: 9 }}>Individu</span>
                          <div style={{ fontSize: 13, color: '#ff9966' }}>{s.nomComplet}</div>
                        </div>
                      )}
                      {s.agent && (
                        <div>
                          <span className="field-label" style={{ fontSize: 9 }}>Agent saisissant</span>
                          <div style={{ fontSize: 13, color: 'rgba(244,237,216,.7)' }}>{s.agent}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    className="btn-red"
                    style={{ fontSize: 11, padding: '5px 10px', flexShrink: 0 }}
                    onClick={() => deleteSaisie(s.id)}
                  >🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
