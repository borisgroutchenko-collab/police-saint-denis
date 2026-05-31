import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc,
  doc, orderBy, query, serverTimestamp,
} from 'firebase/firestore';

// ── Couleurs disponibles pour les notes ────────────────────────
const COULEURS = [
  { key: 'or',     label: 'Or',      bg: 'rgba(201,168,76,.12)',  border: 'rgba(201,168,76,.5)',  titre: 'var(--gold)' },
  { key: 'rouge',  label: 'Rouge',   bg: 'rgba(139,26,26,.15)',   border: 'rgba(139,26,26,.6)',   titre: '#ff9966' },
  { key: 'bleu',   label: 'Bleu',    bg: 'rgba(26,58,110,.2)',    border: 'rgba(26,58,110,.7)',   titre: '#9ec4ff' },
  { key: 'vert',   label: 'Vert',    bg: 'rgba(20,80,20,.2)',     border: 'rgba(20,120,20,.5)',   titre: '#90ee90' },
  { key: 'gris',   label: 'Neutre',  bg: 'rgba(0,0,0,.25)',       border: 'rgba(244,237,216,.2)', titre: 'rgba(244,237,216,.8)' },
];

function getCouleur(key) {
  return COULEURS.find(c => c.key === key) || COULEURS[0];
}

// ── Modal création / modification ─────────────────────────────
function NoteModal({ note, onClose, onSaved, showNotif }) {
  const [titre, setTitre] = useState(note?.titre || '');
  const [contenu, setContenu] = useState(note?.contenu || '');
  const [couleur, setCouleur] = useState(note?.couleur || 'or');
  const [photos, setPhotos] = useState(note?.photos || []);
  const [photoUrl, setPhotoUrl] = useState('');
  const [lightbox, setLightbox] = useState(null);

  function addPhoto() {
    if (!photoUrl.startsWith('http')) { showNotif('Le lien doit commencer par http...', true); return; }
    setPhotos(p => [...p, photoUrl]);
    setPhotoUrl('');
    showNotif('Photo ajoutée !');
  }

  async function save() {
    if (!titre.trim()) { showNotif('Le titre est obligatoire', true); return; }
    const data = { titre: titre.trim(), contenu, couleur, photos, updatedAt: serverTimestamp() };
    try {
      if (note?.id) {
        await updateDoc(doc(db, 'notes', note.id), data);
        showNotif('Note modifiée !');
      } else {
        await addDoc(collection(db, 'notes'), { ...data, createdAt: serverTimestamp() });
        showNotif('Note créée !');
      }
      onSaved();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

    <div className="modal-overlay open">
      <div className="modal" style={{ maxWidth: 640 }}>
        {lightbox && (
          <div className="modal-overlay open" onClick={() => setLightbox(null)} style={{ zIndex: 2000 }}>
            <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 3, border: '2px solid var(--gold)' }} />
          </div>
        )}
        <div className="modal-title">{note?.id ? '✏ Modifier la note' : '📌 Nouvelle note'}</div>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Titre */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Titre *</label>
          <input
            type="text" className="field-input"
            placeholder="Titre de la note..."
            value={titre} onChange={e => setTitre(e.target.value)}
            autoFocus
          />
        </div>

        {/* Couleur */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label" style={{ marginBottom: 10 }}>Couleur</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COULEURS.map(c => (
              <div
                key={c.key}
                onClick={() => setCouleur(c.key)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                  background: c.bg, border: `2px solid ${couleur === c.key ? c.titre : 'transparent'}`,
                  boxShadow: couleur === c.key ? `0 0 8px ${c.titre}` : 'none',
                  transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                }}
                title={c.label}
              >
                {couleur === c.key ? '✓' : ''}
              </div>
            ))}
          </div>
        </div>

        {/* Contenu */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Contenu</label>
          <textarea
            className="field-textarea"
            style={{ minHeight: 180, fontFamily: "'Crimson Text', serif", fontSize: 15, lineHeight: 1.7 }}
            placeholder="Rédigez votre note ici..."
            value={contenu} onChange={e => setContenu(e.target.value)}
          />
        </div>

        {/* Photos */}
        <div style={{ marginBottom: 20 }}>
          <label className="field-label">Photos / Images (liens URL)</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="url" className="field-input" style={{ flex: 1 }} placeholder="https://..." value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPhoto()} />
            <button className="btn-blue" onClick={addPhoto} style={{ whiteSpace: 'nowrap' }}>+ Ajouter</button>
          </div>
          <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 10, color: 'rgba(244,237,216,.3)', letterSpacing: 1, marginBottom: 10 }}>
            Uploadez sur fixitfy.com.tr, imgbb.com ou imgur.com puis collez le lien
          </div>
          {photos.length > 0 && (
            <div className="photo-preview-grid">
              {photos.map((url, i) => (
                <div key={i} className="photo-preview">
                  <img src={url} alt="" onClick={() => setLightbox(url)} onError={e => { e.target.parentElement.style.background = 'rgba(139,26,26,0.3)'; e.target.style.display = 'none'; }} />
                  <button className="photo-remove" onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="actions-row">
          <button className="btn-submit" onClick={save}>💾 Sauvegarder</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Vue lecture d'une note ────────────────────────────────────
function NoteDetail({ note, onBack, onEdit, onDelete }) {
  const c = getCouleur(note.couleur);
  const [lightbox, setLightbox] = useState(null);
  const dateStr = note.updatedAt?.toDate
    ? note.updatedAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : note.createdAt?.toDate
      ? note.createdAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';

  return (
    <div>
      {lightbox && (
        <div className="modal-overlay open" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 3, border: '2px solid var(--gold)' }} />
        </div>
      )}
      <button className="back-btn" onClick={onBack}>← Retour aux notes</button>

      <div className="card" style={{ background: c.bg, borderColor: c.border }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${c.border}` }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: c.titre, marginBottom: 6 }}>
              {note.titre}
            </div>
            {dateStr && (
              <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(244,237,216,.4)', letterSpacing: 1 }}>
                Dernière modification : {dateStr}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn-gold" onClick={onEdit}>✏ Modifier</button>
            <button className="btn-red" onClick={onDelete}>🗑 Supprimer</button>
          </div>
        </div>

        {note.contenu ? (
          <div style={{ fontSize: 15, color: 'rgba(244,237,216,.9)', lineHeight: 1.85, whiteSpace: 'pre-wrap', fontFamily: "'Crimson Text', serif", marginBottom: note.photos?.length ? 20 : 0 }}>
            {note.contenu}
          </div>
        ) : (
          <div style={{ color: 'rgba(244,237,216,.3)', fontStyle: 'italic', fontSize: 14, marginBottom: note.photos?.length ? 16 : 0 }}>
            Note vide.
          </div>
        )}

        {note.photos && note.photos.length > 0 && (
          <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 16 }}>
            <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(244,237,216,.4)', letterSpacing: 1, marginBottom: 10 }}>PHOTOS / IMAGES</div>
            <div className="photo-preview-grid">
              {note.photos.map((url, i) => (
                <div key={i} className="photo-preview" style={{ cursor: 'pointer' }} onClick={() => setLightbox(url)}>
                  <img src={url} alt="" onError={e => { e.target.parentElement.style.background = 'rgba(139,26,26,0.3)'; e.target.style.display = 'none'; }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Carte note dans la liste ───────────────────────────────────
function NoteCard({ note, onOpen, onEdit, onDelete }) {
  const c = getCouleur(note.couleur);
  const apercu = note.contenu ? (note.contenu.length > 150 ? note.contenu.slice(0, 150) + '…' : note.contenu) : '';

  return (
    <div
      style={{
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 4, padding: '18px 20px', cursor: 'pointer',
        transition: 'all .2s', display: 'flex', flexDirection: 'column', gap: 8,
      }}
      onClick={onOpen}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
    >
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: c.titre }}>
        {note.titre}
      </div>
      {apercu && (
        <div style={{ fontSize: 13, color: 'rgba(244,237,216,.65)', lineHeight: 1.6, fontFamily: "'Crimson Text', serif" }}>
          {apercu}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }} onClick={e => e.stopPropagation()}>
        <button className="btn-gold" style={{ fontSize: 10, padding: '4px 10px' }} onClick={onEdit}>✏</button>
        <button className="btn-red" style={{ fontSize: 10, padding: '4px 10px' }} onClick={onDelete}>🗑</button>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────
export default function Notes({ showNotif }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null); // null | note object (vide = nouvelle note)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'notes'), orderBy('updatedAt', 'desc')));
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      // Peut échouer si updatedAt n'existe pas encore — on retry sans order
      try {
        const snap2 = await getDocs(collection(db, 'notes'));
        setNotes(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e2) { showNotif('Erreur : ' + e2.message, true); }
    }
    setLoading(false);
  }, [showNotif]);

  useEffect(() => { load(); }, [load]);

  async function deleteNote(note) {
    if (!window.confirm(`Supprimer la note "${note.titre}" ?`)) return;
    try {
      await deleteDoc(doc(db, 'notes', note.id));
      showNotif('Note supprimée');
      if (view === 'detail') { setView('list'); setSelected(null); }
      load();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  const filtered = notes.filter(n =>
    (n.titre || '').toLowerCase().includes(search.toLowerCase()) ||
    (n.contenu || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Vue détail ──
  if (view === 'detail' && selected) {
    const current = notes.find(n => n.id === selected.id) || selected;
    return (
      <>
        {modal !== null && (
          <NoteModal note={modal} onClose={() => setModal(null)}
            onSaved={() => { setModal(null); load(); }}
            showNotif={showNotif} />
        )}
        <NoteDetail
          note={current}
          onBack={() => { setView('list'); setSelected(null); }}
          onEdit={() => setModal(current)}
          onDelete={() => deleteNote(current)}
        />
      </>
    );
  }

  // ── Vue liste ──
  return (
    <div>
      {modal !== null && (
        <NoteModal note={modal} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          showNotif={showNotif} />
      )}

      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>📌 Notes & Informations</span>
          <button className="btn-submit" style={{ padding: '8px 20px', fontSize: 13 }} onClick={() => setModal({})}>
            ➕ Nouvelle note
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <input
            type="text" className="field-input" style={{ flex: 1 }}
            placeholder="Rechercher dans les notes..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-gold" onClick={load}>🔄 Actualiser</button>
        </div>

        {loading && <div><span className="spinner" /> Chargement...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>
            {search ? 'Aucune note correspond à la recherche.' : 'Aucune note. Créez votre première note !'}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {filtered.map(n => (
              <NoteCard
                key={n.id} note={n}
                onOpen={() => { setSelected(n); setView('detail'); }}
                onEdit={e => { setModal(n); }}
                onDelete={() => deleteNote(n)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
