import React, { useState, useRef, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.15;

const COULEURS = [
  { key: 'rouge',  hex: '#c0392b', label: 'Rouge sang' },
  { key: 'or',     hex: '#c9a84c', label: 'Or' },
  { key: 'blanc',  hex: '#e8e8e8', label: 'Blanc' },
  { key: 'gris',   hex: '#7f8c8d', label: 'Gris' },
  { key: 'vert',   hex: '#27ae60', label: 'Vert' },
  { key: 'bleu',   hex: '#2980b9', label: 'Bleu' },
];

function hexOf(key) {
  const c = COULEURS.find(c => c.key === key);
  return c ? c.hex : '#c0392b';
}

const TAILLES = [
  { key: 'pt', label: 'Petit',  px: 11 },
  { key: 'mn', label: 'Moyen',  px: 16 },
  { key: 'gd', label: 'Grand',  px: 24 },
  { key: 'xl', label: 'Énorme', px: 36 },
];
function pxOf(key) {
  const t = TAILLES.find(t => t.key === key);
  return t ? t.px : 16;
}

export default function Carte({ showNotif }) {
  const [zoom, setZoom] = useState(0.5);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const containerRef = useRef(null);

  const [balises, setBalises] = useState([]);
  const [mode, setMode] = useState('move'); // 'move' | 'place' | 'text'
  const [couleur, setCouleur] = useState('rouge');
  const [taille, setTaille] = useState('mn');
  const [filtreCouleur, setFiltreCouleur] = useState('');
  const [pendingPoint, setPendingPoint] = useState(null); // { xPct, yPct, type }
  const [titreInput, setTitreInput] = useState('');
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'balises'));
      setBalises(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { if (showNotif) showNotif('Erreur chargement balises', true); }
  }, [showNotif]);

  useEffect(() => { load(); }, [load]);

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setZoom(z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + delta).toFixed(2))));
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    if (mode === 'move') {
      setDragging(true);
      dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    }
  }

  function handleMouseMove(e) {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
  }

  function handleMouseUp() { setDragging(false); }

  function handleImageClick(e) {
    if (mode !== 'place' && mode !== 'text') return;
    const rect = e.target.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPoint({ xPct, yPct, type: mode === 'text' ? 'texte' : 'balise' });
    setTitreInput('');
  }

  async function confirmItem() {
    if (!pendingPoint) return;
    try {
      const data = {
        type: pendingPoint.type,
        titre: titreInput.trim() || (pendingPoint.type === 'texte' ? 'Texte' : 'Sans titre'),
        couleur,
        xPct: pendingPoint.xPct,
        yPct: pendingPoint.yPct,
        createdAt: serverTimestamp(),
      };
      if (pendingPoint.type === 'texte') data.taille = taille;
      const ref = await addDoc(collection(db, 'balises'), data);
      setBalises(b => [...b, { id: ref.id, ...data }]);
      setPendingPoint(null);
      setTitreInput('');
      setMode('move');
      if (showNotif) showNotif(pendingPoint.type === 'texte' ? 'Texte ajouté' : 'Balise placée');
    } catch (e) { if (showNotif) showNotif('Erreur : ' + e.message, true); }
  }

  async function deleteItem(id) {
    try {
      await deleteDoc(doc(db, 'balises', id));
      setBalises(b => b.filter(x => x.id !== id));
      if (showNotif) showNotif('Supprimé');
    } catch (e) { if (showNotif) showNotif('Erreur suppression', true); }
  }

  async function saveEdit() {
    if (!editItem) return;
    try {
      const upd = { titre: editItem.titre.trim() || 'Sans titre', couleur: editItem.couleur };
      if (editItem.type === 'texte') upd.taille = editItem.taille;
      await updateDoc(doc(db, 'balises', editItem.id), upd);
      setBalises(b => b.map(x => x.id === editItem.id ? { ...x, ...upd } : x));
      setEditItem(null);
      if (showNotif) showNotif('Modifié');
    } catch (e) { if (showNotif) showNotif('Erreur modification', true); }
  }

  function zoomIn()  { setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP * 2).toFixed(2))); }
  function zoomOut() { setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP * 2).toFixed(2))); }
  function reset()   { setZoom(0.5); setPos({ x: 0, y: 0 }); }

  const filtered = filtreCouleur ? balises.filter(b => b.couleur === filtreCouleur) : balises;

  const btnStyle = {
    width: 36, height: 36, borderRadius: 3,
    border: '1px solid rgba(201,168,76,.5)', background: 'rgba(26,14,4,.85)',
    color: 'var(--gold)', fontSize: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Special Elite', cursive",
  };

  function modeBtn(key, label, activeColor) {
    const active = mode === key;
    return (
      <button onClick={() => { setMode(key); setPendingPoint(null); }}
        style={{ flex: 1, fontSize: 11, padding: '7px', borderRadius: 2, cursor: 'pointer', fontFamily: "'Special Elite', cursive",
          border: '1px solid ' + (active ? activeColor : 'rgba(201,168,76,.3)'),
          background: active ? activeColor + '33' : 'transparent', color: active ? activeColor : 'rgba(244,237,216,.6)' }}>
        {label}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 140px)' }}>

      {/* PANNEAU LATÉRAL */}
      <div style={{ width: 260, flexShrink: 0, background: 'rgba(20,12,4,.6)', border: '1px solid rgba(201,168,76,.2)', borderRadius: '4px 0 0 4px', overflowY: 'auto', padding: 14 }}>
        <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 13, color: 'var(--gold)', letterSpacing: 1, marginBottom: 12, textAlign: 'center' }}>✚ OUTILS CARTE ✚</div>

        {/* Modes */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {modeBtn('move', '✋ Déplacer', '#c9a84c')}
          {modeBtn('place', '📍 Balise', '#c0392b')}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {modeBtn('text', '🅰 Inscription texte', '#2980b9')}
        </div>

        {/* Couleur */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 10, color: 'rgba(244,237,216,.5)', letterSpacing: 1, marginBottom: 6 }}>COULEUR</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COULEURS.map(c => (
              <div key={c.key} onClick={() => setCouleur(c.key)} title={c.label}
                style={{ width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', background: c.hex,
                  border: couleur === c.key ? '2px solid #fff' : '2px solid rgba(0,0,0,.3)',
                  boxShadow: couleur === c.key ? '0 0 6px ' + c.hex : 'none' }} />
            ))}
          </div>
        </div>

        {/* Taille texte */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 10, color: 'rgba(244,237,216,.5)', letterSpacing: 1, marginBottom: 6 }}>TAILLE TEXTE</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {TAILLES.map(t => (
              <button key={t.key} onClick={() => setTaille(t.key)}
                style={{ fontSize: 10, padding: '4px 8px', borderRadius: 2, cursor: 'pointer', fontFamily: "'Special Elite', cursive",
                  border: '1px solid ' + (taille === t.key ? 'var(--gold)' : 'rgba(201,168,76,.3)'),
                  background: taille === t.key ? 'rgba(201,168,76,.2)' : 'transparent',
                  color: taille === t.key ? 'var(--gold)' : 'rgba(244,237,216,.5)' }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Filtre */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 10, color: 'rgba(244,237,216,.5)', letterSpacing: 1, marginBottom: 6 }}>FILTRE</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setFiltreCouleur('')}
              style={{ fontSize: 9, padding: '3px 8px', borderRadius: 2, cursor: 'pointer', fontFamily: "'Special Elite', cursive",
                border: '1px solid ' + (!filtreCouleur ? 'var(--gold)' : 'rgba(201,168,76,.3)'),
                background: !filtreCouleur ? 'rgba(201,168,76,.2)' : 'transparent', color: !filtreCouleur ? 'var(--gold)' : 'rgba(244,237,216,.5)' }}>TOUS</button>
            {COULEURS.map(c => (
              <div key={c.key} onClick={() => setFiltreCouleur(filtreCouleur === c.key ? '' : c.key)} title={c.label}
                style={{ width: 18, height: 18, borderRadius: '50%', cursor: 'pointer', background: c.hex,
                  border: filtreCouleur === c.key ? '2px solid #fff' : '2px solid rgba(0,0,0,.3)' }} />
            ))}
          </div>
        </div>

        {/* Liste */}
        <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'var(--gold)', letterSpacing: 1, marginBottom: 8, textAlign: 'center', borderTop: '1px solid rgba(201,168,76,.2)', paddingTop: 10 }}>
          ✚ MARQUAGES ({filtered.length}) ✚
        </div>
        {filtered.length === 0 && <div style={{ fontSize: 11, color: 'rgba(244,237,216,.35)', fontStyle: 'italic', textAlign: 'center' }}>Aucun marquage</div>}
        {filtered.map(b => (
          <div key={b.id} style={{ marginBottom: 6 }}>
            {editItem && editItem.id === b.id ? (
              <div style={{ background: 'rgba(0,0,0,.35)', border: '1px solid rgba(201,168,76,.3)', borderRadius: 3, padding: 8 }}>
                <input type="text" value={editItem.titre} onChange={e => setEditItem({ ...editItem, titre: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, background: 'rgba(0,0,0,.4)', border: '1px solid rgba(201,168,76,.3)', borderRadius: 2, padding: '4px 6px', color: 'var(--paper)', marginBottom: 6, fontFamily: "'Special Elite', cursive" }} />
                <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                  {COULEURS.map(c => (
                    <div key={c.key} onClick={() => setEditItem({ ...editItem, couleur: c.key })}
                      style={{ width: 18, height: 18, borderRadius: '50%', cursor: 'pointer', background: c.hex, border: editItem.couleur === c.key ? '2px solid #fff' : '2px solid rgba(0,0,0,.3)' }} />
                  ))}
                </div>
                {editItem.type === 'texte' && (
                  <div style={{ display: 'flex', gap: 3, marginBottom: 6, flexWrap: 'wrap' }}>
                    {TAILLES.map(t => (
                      <button key={t.key} onClick={() => setEditItem({ ...editItem, taille: t.key })}
                        style={{ fontSize: 9, padding: '2px 6px', borderRadius: 2, cursor: 'pointer', fontFamily: "'Special Elite', cursive",
                          border: '1px solid ' + (editItem.taille === t.key ? 'var(--gold)' : 'rgba(201,168,76,.3)'),
                          background: editItem.taille === t.key ? 'rgba(201,168,76,.2)' : 'transparent',
                          color: editItem.taille === t.key ? 'var(--gold)' : 'rgba(244,237,216,.5)' }}>{t.label}</button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={saveEdit} style={{ flex: 1, fontSize: 10, padding: '4px', cursor: 'pointer', background: 'rgba(39,174,96,.3)', border: '1px solid #27ae60', color: '#7fe8a0', borderRadius: 2, fontFamily: "'Special Elite', cursive" }}>✓ OK</button>
                  <button onClick={() => setEditItem(null)} style={{ flex: 1, fontSize: 10, padding: '4px', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(244,237,216,.2)', color: 'rgba(244,237,216,.5)', borderRadius: 2, fontFamily: "'Special Elite', cursive" }}>✕</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,.25)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 3, padding: '6px 8px' }}>
                <span style={{ fontSize: 11, flexShrink: 0 }}>{b.type === 'texte' ? '🅰' : '📍'}</span>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: hexOf(b.couleur), flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: 'rgba(244,237,216,.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.titre}</span>
                <button onClick={() => setEditItem({ id: b.id, titre: b.titre, couleur: b.couleur, type: b.type, taille: b.taille || 'mn' })} title="Modifier"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: 12, padding: 0 }}>✎</button>
                <button onClick={() => deleteItem(b.id)} title="Supprimer"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff6b6b', fontSize: 13, padding: 0 }}>✕</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ZONE CARTE */}
      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', position: 'relative', borderRadius: '0 4px 4px 0' }}>
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button style={btnStyle} onClick={zoomIn}>+</button>
          <button style={btnStyle} onClick={zoomOut}>−</button>
          <button style={{ ...btnStyle, fontSize: 14 }} onClick={reset}>↺</button>
        </div>

        <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 20, fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(201,168,76,.8)', background: 'rgba(26,14,4,.65)', padding: '3px 10px', borderRadius: 2, border: '1px solid rgba(201,168,76,.25)', pointerEvents: 'none' }}>
          🗺 {Math.round(zoom * 100)}% {mode === 'place' ? '— Cliquez pour poser une balise' : mode === 'text' ? '— Cliquez pour inscrire du texte' : ''}
        </div>

        {/* Modal */}
        {pendingPoint && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 30, background: 'rgba(20,12,4,.97)', border: '1px solid rgba(201,168,76,.5)', borderRadius: 4, padding: 18, width: 290, boxShadow: '0 10px 40px rgba(0,0,0,.7)' }}>
            <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 12, color: 'var(--gold)', letterSpacing: 1, marginBottom: 12 }}>
              {pendingPoint.type === 'texte' ? '🅰 INSCRIRE TEXTE' : '📍 MARQUER POSITION'}
            </div>
            <input type="text" autoFocus value={titreInput} onChange={e => setTitreInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmItem()}
              placeholder={pendingPoint.type === 'texte' ? 'Texte à afficher...' : 'Nom / désignation...'}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, background: 'rgba(0,0,0,.4)', border: '1px solid rgba(201,168,76,.4)', borderRadius: 2, padding: '8px 10px', color: 'var(--paper)', marginBottom: 10, fontFamily: "'Special Elite', cursive" }} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {COULEURS.map(c => (
                <div key={c.key} onClick={() => setCouleur(c.key)} title={c.label}
                  style={{ width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', background: c.hex, border: couleur === c.key ? '2px solid #fff' : '2px solid rgba(0,0,0,.3)' }} />
              ))}
            </div>
            {pendingPoint.type === 'texte' && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
                {TAILLES.map(t => (
                  <button key={t.key} onClick={() => setTaille(t.key)}
                    style={{ fontSize: 10, padding: '4px 8px', borderRadius: 2, cursor: 'pointer', fontFamily: "'Special Elite', cursive",
                      border: '1px solid ' + (taille === t.key ? 'var(--gold)' : 'rgba(201,168,76,.3)'),
                      background: taille === t.key ? 'rgba(201,168,76,.2)' : 'transparent',
                      color: taille === t.key ? 'var(--gold)' : 'rgba(244,237,216,.5)' }}>{t.label}</button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmItem} style={{ flex: 1, fontSize: 12, padding: '8px', cursor: 'pointer', background: 'rgba(192,57,43,.35)', border: '1px solid #c0392b', color: '#ff8866', borderRadius: 2, fontFamily: "'Special Elite', cursive", letterSpacing: 1 }}>✓ MARQUER</button>
              <button onClick={() => { setPendingPoint(null); setMode('move'); }} style={{ padding: '8px 16px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(244,237,216,.2)', color: 'rgba(244,237,216,.5)', borderRadius: 2 }}>✕</button>
            </div>
          </div>
        )}

        {/* Carte */}
        <div ref={containerRef} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
          style={{ width: '100%', height: '100%', overflow: 'hidden', cursor: (mode === 'place' || mode === 'text') ? 'crosshair' : (dragging ? 'grabbing' : 'grab'), background: '#d4b896', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>
          <div style={{ position: 'relative', transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`, transformOrigin: 'center center', transition: dragging ? 'none' : 'transform 0.08s ease' }}>
            <img src={process.env.PUBLIC_URL + '/map.jpg'} alt="Carte du comté de Lemoyne" draggable={false} onClick={handleImageClick} style={{ maxWidth: 'none', display: 'block' }} />
            {filtered.map(b => b.type === 'texte' ? (
              <div key={b.id} style={{ position: 'absolute', left: b.xPct + '%', top: b.yPct + '%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 5,
                fontFamily: "'Special Elite', cursive", fontSize: pxOf(b.taille), color: hexOf(b.couleur), fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(255,255,255,.7), 0 0 3px rgba(255,255,255,.5)', whiteSpace: 'nowrap', letterSpacing: 1 }}>
                {b.titre}
              </div>
            ) : (
              <div key={b.id} style={{ position: 'absolute', left: b.xPct + '%', top: b.yPct + '%', transform: 'translate(-50%, -100%)', pointerEvents: 'none', zIndex: 5 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <svg width="22" height="30" viewBox="0 0 22 30" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.5))' }}>
                    <path d="M11 0 C5 0 0 5 0 11 C0 19 11 30 11 30 C11 30 22 19 22 11 C22 5 17 0 11 0 Z" fill={hexOf(b.couleur)} stroke="#000" strokeWidth="0.5" />
                    <circle cx="11" cy="11" r="4" fill="rgba(0,0,0,.4)" />
                  </svg>
                  <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 9, color: '#1a0a00', background: 'rgba(255,255,255,.85)', padding: '1px 5px', borderRadius: 2, marginTop: -2, whiteSpace: 'nowrap', border: '1px solid ' + hexOf(b.couleur) }}>
                    {b.titre}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
