import React, { useState, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const STATUTS = {
  normal:      { label: '👤 Propriétaire',  color: '#90ee90',  bg: 'rgba(144,238,144,.08)', border: 'rgba(144,238,144,.25)' },
  volee:       { label: '🚨 Volée',          color: '#ff9966',  bg: 'rgba(255,100,0,.08)',   border: 'rgba(255,100,0,.35)'   },
  saisie:      { label: '📦 Saisie',         color: '#ffcc44',  bg: 'rgba(255,204,68,.08)',  border: 'rgba(255,204,68,.3)'   },
};

export default function RegistreArmes({ showNotif }) {
  const [armes, setArmes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Charger tous les citoyens avec leurs armes
      const citSnap = await getDocs(query(collection(db, 'citoyens'), orderBy('nomComplet')));
      // Charger toutes les saisies de type arme
      const saisieSnap = await getDocs(collection(db, 'saisies'));
      const saisiesArmes = saisieSnap.docs
        .map(d => d.data())
        .filter(s => s.type === 'arme' && s.serie);
      const seriesSaisies = new Set(saisiesArmes.map(s => s.serie));

      const list = [];
      citSnap.docs.forEach(d => {
        const cit = d.data();
        (cit.armes || []).forEach(arme => {
          if (!arme.nom && !arme.serie) return;
          // Déterminer le statut réel
          let statutFinal = arme.statutArme || 'normal';
          if (arme.serie && seriesSaisies.has(arme.serie)) statutFinal = 'saisie';

          list.push({
            citoyenId:   d.id,
            nomComplet:  cit.nomComplet || '—',
            carteId:     cit.carteId    || '',
            nomArme:     arme.nom       || '—',
            serie:       arme.serie     || '',
            statut:      statutFinal,
          });
        });
      });

      setArmes(list);
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
    setLoading(false);
  }, [showNotif]);

  React.useEffect(() => { load(); }, [load]);

  const filtered = armes.filter(a => {
    const q = search.toLowerCase();
    const matchSearch =
      (a.nomArme    || '').toLowerCase().includes(q) ||
      (a.serie      || '').toLowerCase().includes(q) ||
      (a.nomComplet || '').toLowerCase().includes(q) ||
      (a.carteId    || '').toLowerCase().includes(q);
    const matchStatut = !filtreStatut || a.statut === filtreStatut;
    return matchSearch && matchStatut;
  });

  const counts = {
    normal: armes.filter(a => a.statut === 'normal').length,
    volee:  armes.filter(a => a.statut === 'volee').length,
    saisie: armes.filter(a => a.statut === 'saisie').length,
  };

  return (
    <div>
      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>🔫 Registre des Armes</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(STATUTS).map(([key, s]) => (
              <span key={key} className="stat-badge" style={{ borderColor: s.color + '88', color: s.color }}>
                {s.label} : {counts[key] || 0}
              </span>
            ))}
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <input
            type="text" className="field-input" style={{ flex: 1 }}
            placeholder="Rechercher par type d'arme, n° de série, propriétaire..."
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
          >Tous ({armes.length})</button>
          {Object.entries(STATUTS).map(([key, s]) => (
            <button key={key}
              onClick={() => setFiltreStatut(filtreStatut === key ? '' : key)}
              style={{
                fontSize: 12, padding: '6px 14px', borderRadius: 2, cursor: 'pointer',
                border: '1px solid ' + s.color,
                background: filtreStatut === key ? s.bg : 'transparent',
                color: s.color, fontFamily: "'Special Elite', cursive", letterSpacing: 1,
              }}
            >{s.label} ({counts[key] || 0})</button>
          ))}
        </div>

        {loading && <div><span className="spinner" /> Chargement...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>
            Aucune arme enregistrée.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(201,168,76,.3)' }}>
                {['Type d\'arme', 'N° de série', 'Propriétaire', 'Carte ID', 'Statut'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 12px',
                    fontFamily: "'Special Elite', cursive", fontSize: 10,
                    color: 'var(--gold)', letterSpacing: 1, fontWeight: 'normal',
                  }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const s = STATUTS[a.statut] || STATUTS.normal;
                return (
                  <tr key={i} style={{
                    borderBottom: '1px solid rgba(201,168,76,.1)',
                    background: i % 2 === 0 ? 'rgba(0,0,0,.1)' : 'transparent',
                    borderLeft: '3px solid ' + s.color,
                  }}>
                    <td style={{ padding: '10px 12px', fontSize: 14, color: 'var(--paper)', fontFamily: "'IM Fell English', serif" }}>
                      {a.nomArme}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {a.serie
                        ? <span style={{ fontFamily: "'Special Elite', cursive", color: 'var(--gold)', fontSize: 13, letterSpacing: 1 }}>
                            {a.serie}
                          </span>
                        : <span style={{ color: 'rgba(244,237,216,.3)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'rgba(244,237,216,.85)' }}>
                      {a.nomComplet}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: "'Special Elite', cursive", fontSize: 12, color: 'var(--gold)', letterSpacing: 1 }}>
                      {a.carteId || '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontFamily: "'Special Elite', cursive", fontSize: 11, letterSpacing: 1,
                        padding: '3px 10px', borderRadius: 2,
                        border: '1px solid ' + s.color,
                        color: s.color, background: s.bg,
                        whiteSpace: 'nowrap',
                      }}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
