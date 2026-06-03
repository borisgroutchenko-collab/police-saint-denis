import React, { useState, useCallback, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query, where, Timestamp } from 'firebase/firestore';

const TYPE_CONFIG = {
  plainte: {
    icon: '📝',
    label: 'Dépôt de plainte',
    color: '#ffcc44',
    border: 'rgba(255,204,68,.35)',
    bg: 'rgba(255,204,68,.06)',
  },
  verbalisation: {
    icon: '⚖',
    label: 'Verbalisation',
    color: '#ff9966',
    border: 'rgba(255,100,0,.35)',
    bg: 'rgba(255,100,0,.06)',
  },
  convocation: {
    icon: '📋',
    label: 'Convocation',
    color: '#9ec4ff',
    border: 'rgba(158,196,255,.3)',
    bg: 'rgba(158,196,255,.05)',
  },
  note: {
    icon: '📌',
    label: 'Note & Information',
    color: '#90ee90',
    border: 'rgba(144,238,144,.3)',
    bg: 'rgba(144,238,144,.05)',
  },
};

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'il y a quelques secondes';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function formatDate(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function News({ showNotif }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtreType, setFiltreType] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Limite : 48h
      const cutoff = Timestamp.fromDate(new Date(Date.now() - 48 * 60 * 60 * 1000));
      const all = [];

      // ── Dépôts de plainte ──────────────────────────────────
      try {
        const snap = await getDocs(query(
          collection(db, 'plaintes'),
          where('createdAt', '>=', cutoff),
          orderBy('createdAt', 'desc')
        ));
        snap.docs.forEach(d => {
          const data = d.data();
          const plaignants = (data.plaignants || []).map(p => (p.prenom + ' ' + p.nom).trim()).filter(Boolean).join(', ');
          all.push({
            id: d.id,
            type: 'plainte',
            ts: data.createdAt,
            agent: data.agent || '—',
            titre: 'Plainte déposée' + (plaignants ? ' par ' + plaignants : ''),
            detail: data.faits ? (data.faits.length > 100 ? data.faits.slice(0, 100) + '…' : data.faits) : '',
            statut: data.statut || '',
          });
        });
      } catch (_) {}

      // ── Verbalisations ──────────────────────────────────────
      try {
        const snap = await getDocs(query(
          collection(db, 'verbalisations'),
          where('createdAt', '>=', cutoff),
          orderBy('createdAt', 'desc')
        ));
        snap.docs.forEach(d => {
          const data = d.data();
          all.push({
            id: d.id,
            type: 'verbalisation',
            ts: data.createdAt,
            agent: data.agent || '—',
            titre: 'Verbalisation : ' + (data.nomComplet || '—'),
            detail: data.nbInfractions
              ? data.nbInfractions + ' infraction(s) — ' + (data.totalAmende || 0) + ' $'
              : '',
            statut: data.sisika ? '🔒 Sisika' : '',
          });
        });
      } catch (_) {}

      // ── Convocations ────────────────────────────────────────
      try {
        const snap = await getDocs(query(
          collection(db, 'convocations'),
          where('createdAt', '>=', cutoff),
          orderBy('createdAt', 'desc')
        ));
        snap.docs.forEach(d => {
          const data = d.data();
          const statutConv = { non_envoyee: '📭 Non envoyée', envoyee: '📬 Envoyée', realisee: '✅ Réalisée' }[data.statut] || '';
          all.push({
            id: d.id,
            type: 'convocation',
            ts: data.createdAt,
            agent: data.agent || '—',
            titre: 'Convocation : ' + (data.nomComplet || '—'),
            detail: data.raison ? (data.raison.length > 100 ? data.raison.slice(0, 100) + '…' : data.raison) : '',
            statut: statutConv,
          });
        });
      } catch (_) {}

      // ── Notes & Informations ────────────────────────────────
      try {
        const snap = await getDocs(query(
          collection(db, 'notes'),
          where('createdAt', '>=', cutoff),
          orderBy('createdAt', 'desc')
        ));
        snap.docs.forEach(d => {
          const data = d.data();
          all.push({
            id: d.id,
            type: 'note',
            ts: data.createdAt,
            agent: data.agent || '—',
            titre: data.titre || 'Note sans titre',
            detail: data.contenu ? (data.contenu.length > 100 ? data.contenu.slice(0, 100) + '…' : data.contenu) : '',
            statut: '',
          });
        });
      } catch (_) {}

      // Trier par date décroissante
      all.sort((a, b) => {
        const ta = a.ts?.toDate ? a.ts.toDate().getTime() : 0;
        const tb = b.ts?.toDate ? b.ts.toDate().getTime() : 0;
        return tb - ta;
      });

      setItems(all);
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
    setLoading(false);
  }, [showNotif]);

  useEffect(() => { load(); }, [load]);

  const filtered = filtreType ? items.filter(i => i.type === filtreType) : items;

  const counts = {};
  Object.keys(TYPE_CONFIG).forEach(k => { counts[k] = items.filter(i => i.type === k).length; });

  return (
    <div>
      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>📰 News — Activité récente (48h)</span>
          <button className="btn-gold" style={{ fontSize: 12 }} onClick={load}>🔄 Actualiser</button>
        </div>

        {/* Compteurs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <span key={key} className="stat-badge" style={{ borderColor: cfg.color + '88', color: cfg.color }}>
              {cfg.icon} {cfg.label} : {counts[key] || 0}
            </span>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFiltreType('')}
            className={!filtreType ? 'btn-submit' : 'btn-gold'}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >Tout afficher ({items.length})</button>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <button key={key}
              onClick={() => setFiltreType(filtreType === key ? '' : key)}
              style={{
                fontSize: 12, padding: '6px 14px', borderRadius: 2, cursor: 'pointer',
                border: '1px solid ' + cfg.color,
                background: filtreType === key ? cfg.bg : 'transparent',
                color: cfg.color, fontFamily: "'Special Elite', cursive", letterSpacing: 1,
              }}
            >{cfg.icon} {cfg.label} ({counts[key] || 0})</button>
          ))}
        </div>

        {loading && <div><span className="spinner" /> Chargement...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>
            Aucune activité dans les dernières 48 heures.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((item, idx) => {
              const cfg = TYPE_CONFIG[item.type];
              return (
                <div key={item.id + idx} style={{
                  background: cfg.bg,
                  border: '1px solid ' + cfg.border,
                  borderLeft: '4px solid ' + cfg.color,
                  borderRadius: 3, padding: '14px 18px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      {/* Type + titre */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: "'Special Elite', cursive", fontSize: 10, letterSpacing: 1,
                          padding: '2px 8px', borderRadius: 2,
                          border: '1px solid ' + cfg.color,
                          color: cfg.color, background: cfg.bg,
                        }}>{cfg.icon} {cfg.label}</span>
                        {item.statut && (
                          <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 10, color: 'rgba(244,237,216,.5)' }}>
                            {item.statut}
                          </span>
                        )}
                      </div>

                      {/* Titre */}
                      <div style={{ fontSize: 15, color: 'var(--paper)', fontFamily: "'IM Fell English', serif", marginBottom: 4 }}>
                        {item.titre}
                      </div>

                      {/* Détail */}
                      {item.detail && (
                        <div style={{ fontSize: 12, color: 'rgba(244,237,216,.6)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6 }}>
                          {item.detail}
                        </div>
                      )}

                      {/* Agent + date */}
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: cfg.color, letterSpacing: 1 }}>
                          ✍ {item.agent}
                        </span>
                        <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 10, color: 'rgba(244,237,216,.35)', letterSpacing: 1 }}>
                          🕐 {timeAgo(item.ts)}
                        </span>
                        <span style={{ fontSize: 10, color: 'rgba(244,237,216,.25)' }}>
                          {formatDate(item.ts)}
                        </span>
                      </div>
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
