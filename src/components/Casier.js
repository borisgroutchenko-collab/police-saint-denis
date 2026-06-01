import React, { useState, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, doc, getDoc, getDocs, updateDoc, deleteDoc,
  addDoc, orderBy, query, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { ALL_INFRACTIONS } from '../data/penalCode';
import { exportPDF } from '../utils/exportPDF';
import { where } from 'firebase/firestore';

// ── Edit modal ────────────────────────────────────────────────
function EditModal({ dossierId, infraction, agents, onClose, onSaved, showNotif }) {
  const [form, setForm] = useState({
    date: infraction.date || '',
    heure: infraction.heure || '',
    agent: infraction.agent || '',
    note: infraction.note || '',
    desc: infraction.desc || '',
    sexe: infraction.sexe || '',
  });
  const [selected, setSelected] = useState(infraction.infractions ? [...infraction.infractions] : []);

  const total = selected.reduce((s, x) => s + x.amende, 0);
  const hasSisika = selected.some(x => x.sisika);

  function toggle(art) {
    setSelected(prev => prev.find(x => x.num === art.num) ? prev.filter(x => x.num !== art.num) : [...prev, art]);
  }

  async function save() {
    if (!selected.length) { showNotif('Sélectionnez au moins une infraction', true); return; }
    const updates = { ...form, infractions: selected, total, sisika: hasSisika };
    try {
      await updateDoc(doc(db, 'casier', dossierId, 'infractions', infraction.id), updates);
      // Recalculate dossier totals
      const remaining = await getDocs(collection(db, 'casier', dossierId, 'infractions'));
      let dTotal = 0, dSisika = false;
      remaining.forEach(d => { dTotal += d.data().total || 0; if (d.data().sisika) dSisika = true; });
      await updateDoc(doc(db, 'casier', dossierId), { totalAmende: dTotal, sisika: dSisika });
      showNotif('Verbalisation modifiée !');
      onSaved();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div className="modal-overlay open">
      <div className="modal">
        <div className="modal-title">✏ Modifier la Verbalisation</div>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="form-grid three" style={{ marginBottom: 16 }}>
          <div><label className="field-label">Date</label><input type="date" className="field-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div><label className="field-label">Heure</label><input type="time" className="field-input" value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} /></div>
          <div>
            <label className="field-label">Agent verbalisateur</label>
            {agents?.length > 0 ? (
              <select className="field-select" value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))}>
                <option value="">— Sélectionner —</option>
                {agents.map(a => <option key={a.id} value={`${a.grade} ${a.prenom} ${a.nom}`}>{a.grade} — {a.prenom} {a.nom}</option>)}
                <option value="__autre__">✍ Saisir manuellement...</option>
              </select>
            ) : (
              <input type="text" className="field-input" value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))} />
            )}
            {form.agent === '__autre__' && <input type="text" className="field-input" style={{ marginTop: 8 }} placeholder="Nom de l'agent" onChange={e => setForm(f => ({ ...f, agent: e.target.value }))} />}
          </div>
        </div>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div><label className="field-label">Note / Appréciation</label><input type="text" className="field-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
          <div><label className="field-label">Sexe</label>
            <select className="field-select" value={form.sexe} onChange={e => setForm(f => ({ ...f, sexe: e.target.value }))}>
              <option value="">—</option><option>Masculin</option><option>Féminin</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Description / Circonstances</label>
          <textarea className="field-textarea" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label" style={{ marginBottom: 10 }}>Infractions sélectionnées</label>
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
          <button className="btn-submit" onClick={save}>💾 Sauvegarder les modifications</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Enquête modal (création ET modification) ───────────────────
function EnqueteModal({ dossierId, enquete, agents, onClose, onSaved, showNotif }) {
  const now = new Date();
  const [form, setForm] = useState({
    titre:           enquete?.titre           || '',
    localisation:    enquete?.localisation    || '',
    contact:         enquete?.contact         || '',
    membres:         enquete?.membres         || '',
    elementsEnquete: enquete?.elementsEnquete || '',
    date:            enquete?.date            || now.toISOString().split('T')[0],
    heure:           enquete?.heure           || now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0'),
    agent:           enquete?.agent           || '',
  });
  const [photos, setPhotos] = useState(enquete?.photos || []);
  const [photoUrl, setPhotoUrl] = useState('');

  async function save() {
    try {
      if (enquete?.id) {
        await updateDoc(doc(db, 'casier', dossierId, 'enquetes', enquete.id), { ...form, photos });
        showNotif("Dossier d'enquête modifié !");
      } else {
        await addDoc(collection(db, 'casier', dossierId, 'enquetes'), { ...form, photos, createdAt: serverTimestamp() });
        showNotif("Dossier d'enquête sauvegardé !");
      }
      onSaved();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div className="modal-overlay open">
      <div className="modal">
        <div className="modal-title">{enquete?.id ? "✏ Modifier le dossier d'enquête" : "🔍 Nouveau Dossier d'Enquête"}</div>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="form-grid three" style={{ marginBottom: 16 }}>
          <div><label className="field-label">Date *</label><input type="date" className="field-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div><label className="field-label">Heure</label><input type="time" className="field-input" value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} /></div>
          <div>
            <label className="field-label">Agent enquêteur</label>
            {agents?.length > 0 ? (
              <select className="field-select" value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))}>
                <option value="">— Sélectionner —</option>
                {agents.map(a => <option key={a.id} value={`${a.grade} ${a.prenom} ${a.nom}`}>{a.grade} — {a.prenom} {a.nom}</option>)}
                <option value="__autre__">✍ Saisir manuellement...</option>
              </select>
            ) : (
              <input type="text" className="field-input" placeholder="Ex: Inspecteur Morgan" value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))} />
            )}
            {form.agent === '__autre__' && <input type="text" className="field-input" style={{ marginTop: 8 }} placeholder="Nom de l'agent" onChange={e => setForm(f => ({ ...f, agent: e.target.value }))} />}
          </div>
        </div>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div><label className="field-label">Titre de l'enquête</label><input type="text" className="field-input" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} /></div>
          <div><label className="field-label">Localisation</label><input type="text" className="field-input" value={form.localisation} onChange={e => setForm(f => ({ ...f, localisation: e.target.value }))} /></div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Contact(s)</label>
          <textarea className="field-textarea" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Membres / Suspects</label>
          <textarea className="field-textarea" value={form.membres} onChange={e => setForm(f => ({ ...f, membres: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">🔍 Éléments d'enquête en cours</label>
          <textarea className="field-textarea" style={{ minHeight: 100 }} placeholder="Témoignages recueillis, indices, pistes, suspects identifiés, actions en cours..." value={form.elementsEnquete} onChange={e => setForm(f => ({ ...f, elementsEnquete: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Photos d'enquête</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="url" className="field-input" style={{ flex: 1 }} placeholder="https://..." value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} />
            <button className="btn-blue" onClick={() => { if (photoUrl.startsWith('http')) { setPhotos(p => [...p, photoUrl]); setPhotoUrl(''); } }}>+ Ajouter</button>
          </div>
          <div className="photo-preview-grid">
            {photos.map((url, i) => (
              <div key={i} className="photo-preview">
                <img src={url} alt="" onError={e => e.target.style.display='none'} />
                <button className="photo-remove" onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
        </div>
        <div className="actions-row">
          <button className="btn-blue" onClick={save}>💾 {enquete?.id ? 'Sauvegarder les modifications' : "Sauvegarder l'enquête"}</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}


// ── Dossier Detail ─────────────────────────────────────────────
function DossierDetail({ dossier, infs, enqs, plaintesSignalees, onBack, onReload, showNotif }) {
  const [editInf, setEditInf] = useState(null);
  const [showEnquete, setShowEnquete] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [editEnquete, setEditEnquete] = useState(null);
  const [plaintesDossier, setPlaintesDossier] = useState([]);
  const [agents, setAgents] = useState([]);
  const d = dossier;

  React.useEffect(() => {
    getDocs(query(collection(db, 'effectif'), orderBy('nom')))
      .then(snap => setAgents(snap.docs.map(x => ({ id: x.id, ...x.data() }))))
      .catch(() => {});
  }, []);

  // Charger les plaintes liées à ce dossier
  React.useEffect(() => {
    getDocs(collection(db, 'plaintes')).then(snap => {
      const lies = snap.docs
        .map(x => ({ id: x.id, ...x.data() }))
        .filter(p => Array.isArray(p.casiersLies) && p.casiersLies.includes(d.id));
      setPlaintesDossier(lies);
    }).catch(() => {});
  }, [d.id]);

  async function toggleMostWanted() {
    await updateDoc(doc(db, 'casier', d.id), { mostWanted: !d.mostWanted });
    showNotif(d.mostWanted ? 'Retiré des Most Wanted' : '🎯 Marqué MOST WANTED !');
    onReload();
  }
  async function toggleAmendePaid() {
    await updateDoc(doc(db, 'casier', d.id), { amendePaid: !d.amendePaid });
    showNotif(d.amendePaid ? '❌ Amende marquée comme non payée' : '✅ Amende marquée comme payée !');
    onReload();
  }
  async function deleteInfraction(infId) {
    if (!window.confirm('Supprimer cette verbalisation ?')) return;
    // Récupérer l'infraction avant suppression pour vérifier si elle est liée à une plainte
    const infSnap = await getDoc(doc(db, 'casier', d.id, 'infractions', infId));
    const infData = infSnap.exists() ? infSnap.data() : null;

    await deleteDoc(doc(db, 'casier', d.id, 'infractions', infId));
    const remaining = await getDocs(collection(db, 'casier', d.id, 'infractions'));
    let newTotal = 0, newSisika = false;
    remaining.forEach(d2 => { newTotal += d2.data().total || 0; if (d2.data().sisika) newSisika = true; });
    await updateDoc(doc(db, 'casier', d.id), { totalAmende: newTotal, sisika: newSisika, nbInfractions: remaining.size });

    // Si l'infraction était liée à une plainte, supprimer le signalement dans plaintesSignalees
    if (infData?.plainteId) {
      try {
        await deleteDoc(doc(db, 'casier', d.id, 'plaintesSignalees', infData.plainteId));
      } catch (e) {}
    }

    showNotif('Verbalisation supprimée !');
    onReload();
  }
  async function deleteDossier() {
    if (!window.confirm(`⚠ Supprimer le dossier complet de ${d.nomComplet} ?\nToutes les verbalisations et enquêtes seront effacées définitivement.`)) return;
    const infSnap = await getDocs(collection(db, 'casier', d.id, 'infractions'));
    const enqSnap = await getDocs(collection(db, 'casier', d.id, 'enquetes'));
    const batch = writeBatch(db);
    infSnap.forEach(x => batch.delete(x.ref));
    enqSnap.forEach(x => batch.delete(x.ref));
    batch.delete(doc(db, 'casier', d.id));
    await batch.commit();
    showNotif('Dossier supprimé !');
    onBack();
  }
  async function deleteEnquete(eid) {
    if (!window.confirm("Supprimer ce dossier d'enquête ?")) return;
    await deleteDoc(doc(db, 'casier', d.id, 'enquetes', eid));
    showNotif('Enquête supprimée');
    onReload();
  }

  function ToggleRow({ label, subtitle, on, colorOn, colorOff, onClick }) {
    return (
      <div className="toggle-switch" onClick={onClick}>
        <div style={{ position: 'relative', width: 44, height: 24, background: on ? colorOn : 'rgba(0,0,0,0.5)', borderRadius: 12, border: `1px solid ${on ? (colorOn === 'rgba(139,26,26,0.6)' ? '#CC0000' : '#4a9a4a') : 'rgba(201,168,76,0.3)'}`, flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 18, height: 18, background: '#fff', borderRadius: '50%', transition: 'left .3s' }} />
        </div>
        <div>
          <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 12, color: on ? (colorOn === 'rgba(139,26,26,0.6)' ? '#FF4444' : '#90ee90') : 'rgba(244,237,216,0.7)', letterSpacing: 1 }}>{label}</div>
          <div style={{ fontSize: 11, color: 'rgba(244,237,216,0.4)' }}>{subtitle}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {lightbox && <div className="modal-overlay open" onClick={() => setLightbox(null)}><img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 3, border: '2px solid var(--gold)' }} /></div>}
      {editInf && <EditModal dossierId={d.id} infraction={editInf} agents={agents} onClose={() => setEditInf(null)} onSaved={() => { setEditInf(null); onReload(); }} showNotif={showNotif} />}
      {showEnquete && <EnqueteModal dossierId={d.id} enquete={null} agents={agents} onClose={() => setShowEnquete(false)} onSaved={() => { setShowEnquete(false); onReload(); }} showNotif={showNotif} />}
      {editEnquete && <EnqueteModal dossierId={d.id} enquete={editEnquete} agents={agents} onClose={() => setEditEnquete(null)} onSaved={() => { setEditEnquete(null); onReload(); }} showNotif={showNotif} />}

      <button className="back-btn" onClick={onBack}>← Retour au casier</button>

      {/* Main card */}
      <div className="card" style={{ borderColor: 'var(--gold)' }}>
        {d.mostWanted && <div className="most-wanted-banner">⭐ MOST WANTED — RECHERCHÉ ACTIVEMENT ⭐</div>}
        <div className="card-title">📁 Dossier — {d.nomComplet}</div>

        <div className="form-grid three">
          <div><span className="field-label">N° Identité</span><div style={{ fontFamily: 'Special Elite, cursive', color: 'var(--gold)', fontSize: 16, letterSpacing: 2 }}>{d.idNum}</div></div>
          <div><span className="field-label">Sexe</span><div style={{ fontSize: 15 }}>{d.sexe || '—'}</div></div>
          <div><span className="field-label">Âge</span><div style={{ fontSize: 15 }}>{d.age || '—'} ans</div></div>
        </div>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div><span className="field-label">Total amendes</span><div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: '#ff9966' }}>{d.totalAmende || 0} $</div></div>
          <div><span className="field-label">Statut Sisika</span><div>{d.sisika ? <span className="tag-sisika">🔒 Condamnable à Sisika</span> : <span style={{ color: '#90ee90', fontFamily: 'Special Elite, cursive', fontSize: 12 }}>✓ Pas de peine Sisika</span>}</div></div>
        </div>

        {/* Groupes auxquels appartient l'individu */}
        {d.groupes && d.groupes.length > 0 && (
          <div style={{ marginTop: 14, background: 'rgba(139,26,26,.1)', border: '1px solid rgba(139,26,26,.3)', borderRadius: 3, padding: '12px 16px' }}>
            <span className="field-label" style={{ display: 'block', marginBottom: 8 }}>⚔ Appartenance à un groupe</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {d.groupes.map((g, i) => (
                <div key={i} style={{ background: 'rgba(139,26,26,.2)', border: '1px solid rgba(200,80,80,.4)', borderRadius: 3, padding: '8px 14px' }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: '#ff9966' }}>⚔ {g.nomGroupe}</span>
                  {g.role && <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(244,237,216,.6)', marginLeft: 8, letterSpacing: 1 }}>{g.role}</span>}
                  {g.pseudo && <div style={{ fontSize: 12, color: 'rgba(244,237,216,.5)', fontStyle: 'italic', marginTop: 3 }}>alias {g.pseudo}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="actions-row">
          <button className="btn-gold" onClick={() => exportPDF(d, infs, enqs, showNotif)}>📄 Exporter en PDF (pour le juge)</button>
          <button className="btn-blue" onClick={() => setShowEnquete(true)}>🔍 Créer un dossier d'enquête</button>
          <button className="btn-red" onClick={deleteDossier}>🗑 Supprimer le dossier complet</button>
        </div>
        <div className="actions-row" style={{ marginTop: 12 }}>
          <ToggleRow label="🎯 MOST WANTED" subtitle="Signaler comme recherché activement" on={!!d.mostWanted} colorOn="rgba(139,26,26,0.6)" onClick={toggleMostWanted} />
        </div>
      </div>

      {/* Infractions */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">⚖ Casier — Infractions ({infs.length})</div>
        {infs.length === 0 && <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>Aucune infraction enregistrée.</div>}
        {infs.map(inf => (
          <div key={inf.id} className="infraction-record">
            <div className="infraction-record-date">
              📅 {inf.date}{inf.heure ? ' à ' + inf.heure : ''}
              {inf.agent && <span style={{ marginLeft: 12, color: 'rgba(201,168,76,0.8)' }}>👮 {inf.agent}</span>}
              {inf.note && <span style={{ marginLeft: 12, fontStyle: 'italic', color: 'rgba(244,237,216,0.5)' }}>— {inf.note}</span>}
            </div>
            {inf.desc && <div style={{ fontSize: 13, color: 'rgba(244,237,216,.7)', marginBottom: 8, fontStyle: 'italic' }}>{inf.desc}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {(inf.infractions || []).map(x => <span key={x.num} className="infraction-tag">{x.num} — {x.nom}</span>)}
            </div>
            <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 12, color: '#ff9966' }}>
              Total : {inf.total || 0} ${inf.sisika ? ' — 🔒 Sisika' : ''}
            </div>
            {inf.photos && inf.photos.length > 0 && (
              <div className="record-photos">
                {inf.photos.map((url, i) => <img key={i} className="record-photo" src={url} alt="" onClick={() => setLightbox(url)} onError={e => e.target.style.display='none'} />)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn-blue" style={{ fontSize: 10, padding: '5px 10px' }} onClick={() => setEditInf(inf)}>✏ Modifier</button>
              <button className="btn-red" style={{ fontSize: 10, padding: '5px 10px' }} onClick={() => deleteInfraction(inf.id)}>🗑 Supprimer</button>
            </div>
          </div>
        ))}
      </div>

      {/* Enquêtes */}
      {/* Plaintes en cours signalées */}
      {plaintesSignalees && plaintesSignalees.filter(p => p.statut === 'ouverte' || p.statut === 'instruite').length > 0 && (
        <div className="card" style={{ marginTop: 16, borderLeft: '4px solid #ffcc44' }}>
          <div className="card-title" style={{ color: '#ffcc44' }}>
            📝 Dépôts de Plainte — Enquêtes en cours ({plaintesSignalees.filter(p => p.statut === 'ouverte' || p.statut === 'instruite').length})
          </div>
          {plaintesSignalees.filter(p => p.statut === 'ouverte' || p.statut === 'instruite').map(p => (
            <div key={p.id} style={{ background: 'rgba(255,204,68,.06)', border: '1px solid rgba(255,204,68,.25)', borderRadius: 3, padding: '12px 16px', marginBottom: 8 }}>
              <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(255,204,68,.8)', letterSpacing: 1, marginBottom: 4 }}>
                📅 {p.date || '—'} — <span style={{ color: p.statut === 'ouverte' ? '#ff6b6b' : '#ffcc44' }}>{p.statut === 'ouverte' ? '🔴 Ouverte' : '🟡 En instruction'}</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--paper)', marginBottom: 4 }}>
                <span style={{ color: '#ff9966' }}>Plaignant(s) :</span> {p.plaintifsStr || '—'}
              </div>
              {p.faits && <div style={{ fontSize: 13, color: 'rgba(244,237,216,.7)', fontStyle: 'italic', lineHeight: 1.5 }}>{p.faits.length > 200 ? p.faits.slice(0, 200) + '…' : p.faits}</div>}
            </div>
          ))}
        </div>
      )}

      {enqs.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">🔍 Dossiers d'Enquête ({enqs.length})</div>
          {enqs.map(enq => (
            <div key={enq.id} className="enquete-card">
              <div className="enquete-title">
                <span>🗂 {enq.titre || 'Enquête sans titre'}</span>
                <button className="btn-blue" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setEditEnquete(enq)}>✏ Modifier</button>
                <button className="btn-red" onClick={() => deleteEnquete(enq.id)}>🗑 Supprimer</button>
              </div>
              {(enq.date || enq.agent) && (
                <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(201,168,76,0.6)', letterSpacing: 1, marginBottom: 10 }}>
                  {enq.date && '📅 ' + enq.date}{enq.heure && ' à ' + enq.heure}
                  {enq.agent && <span style={{ marginLeft: 10, color: 'rgba(201,168,76,0.9)' }}>👮 {enq.agent}</span>}
                </div>
              )}
              {enq.localisation && <div className="enquete-field"><div className="enquete-field-label">📍 Localisation</div><div className="enquete-field-value">{enq.localisation}</div></div>}
              {enq.contact && <div className="enquete-field"><div className="enquete-field-label">📞 Contact(s)</div><div className="enquete-field-value">{enq.contact}</div></div>}
              {enq.membres && <div className="enquete-field"><div className="enquete-field-label">👥 Membres / Suspects</div><div className="enquete-field-value">{enq.membres}</div></div>}
              {enq.elementsEnquete && <div className="enquete-field"><div className="enquete-field-label" style={{ color: '#9ec4ff' }}>🔍 Éléments d'enquête en cours</div><div className="enquete-field-value" style={{ background: 'rgba(26,58,110,.15)', border: '1px solid rgba(26,58,110,.3)', borderRadius: 3, padding: '8px 12px', marginTop: 4 }}>{enq.elementsEnquete}</div></div>}
              {enq.photos && enq.photos.length > 0 && (
                <div className="enquete-field">
                  <div className="enquete-field-label">📷 Photos</div>
                  <div className="record-photos">{enq.photos.map((url, i) => <img key={i} className="record-photo" src={url} alt="" onClick={() => setLightbox(url)} onError={e => e.target.style.display='none'} />)}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Plaintes liées à ce dossier */}
      {plaintesDossier.length > 0 && (
        <div className="card" style={{ marginTop: 16, borderLeft: '3px solid #ff9966' }}>
          <div className="card-title">📝 Plaintes liées ({plaintesDossier.length})</div>
          {plaintesDossier.map(p => (
            <div key={p.id} style={{ background: 'rgba(139,80,0,.1)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 3, padding: '12px 16px', marginBottom: 8 }}>
              <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(201,168,76,.7)', letterSpacing: 1, marginBottom: 4 }}>
                📅 {p.date}{p.heure ? ' à ' + p.heure : ''}
                {p.agent && <span style={{ marginLeft: 10, color: 'rgba(201,168,76,.9)' }}>👮 {p.agent}</span>}
              </div>
              <div style={{ fontSize: 14, color: 'var(--paper)', marginBottom: 6 }}>
                <span style={{ color: '#ff9966' }}>Plaignant(s) :</span> {p.plaintifsStr || '—'}
              </div>
              {p.misStr && <div style={{ fontSize: 13, color: 'rgba(244,237,216,.6)', marginBottom: 4 }}>Mis en cause : {p.misStr}</div>}
              {p.faits && <div style={{ fontSize: 13, color: 'rgba(244,237,216,.7)', fontStyle: 'italic', lineHeight: 1.5 }}>{p.faits.length > 200 ? p.faits.slice(0, 200) + '…' : p.faits}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Casier component ──────────────────────────────────────
export default function Casier({ showNotif, initialDossierId, onDossierOpened }) {
  const [dossiers, setDossiers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [currentDossier, setCurrentDossier] = useState(null);
  const [currentInfs, setCurrentInfs] = useState([]);
  const [currentEnqs, setCurrentEnqs] = useState([]);

  const loadCasier = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'casier'), orderBy('nomComplet')));
      setDossiers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      showNotif('Erreur : ' + e.message, true);
    }
    setLoading(false);
  }, [showNotif]);

  // Load on mount
  React.useEffect(() => { loadCasier(); }, [loadCasier]);

  // Ouvrir directement un dossier si demandé depuis l'onglet Citoyens
  React.useEffect(() => {
    if (initialDossierId) {
      openDossier(initialDossierId);
      if (onDossierOpened) onDossierOpened();
    }
  }, [initialDossierId]); // eslint-disable-line

  const [currentPlaintes, setCurrentPlaintes] = useState([]);

  async function openDossier(id) {
    try {
      const dSnap = await getDoc(doc(db, 'casier', id));
      const dData = { id, ...dSnap.data() };
      const infSnap = await getDocs(query(collection(db, 'casier', id, 'infractions'), orderBy('createdAt', 'desc')));
      const enqSnap = await getDocs(query(collection(db, 'casier', id, 'enquetes'), orderBy('createdAt', 'desc')));
      const plSnap  = await getDocs(collection(db, 'casier', id, 'plaintesSignalees'));

      // Pour chaque signalement, vérifier le statut ACTUEL de la plainte dans Firestore
      // et nettoyer automatiquement les signalements périmés (plainte classée ou inexistante)
      const plaintesReelles = [];
      for (const sigDoc of plSnap.docs) {
        const sig = { id: sigDoc.id, ...sigDoc.data() };
        try {
          const plainteSnap = await getDoc(doc(db, 'plaintes', sig.plainteId));
          if (!plainteSnap.exists()) {
            // Plainte supprimée → nettoyer le signalement
            await deleteDoc(sigDoc.ref);
          } else {
            const statutActuel = plainteSnap.data().statut;
            if (statutActuel === 'classee') {
              // Plainte classée → nettoyer le signalement
              await deleteDoc(sigDoc.ref);
            } else {
              // Mettre à jour le statut si besoin
              plaintesReelles.push({ ...sig, statut: statutActuel, plaintifsStr: plainteSnap.data().plaintifsStr || sig.plaintifsStr, faits: plainteSnap.data().faits || sig.faits });
            }
          }
        } catch (e) {
          // En cas d'erreur, on garde le signalement tel quel
          plaintesReelles.push(sig);
        }
      }

      // Enrichir avec les données complètes du citoyen (comte, metier, telegram, armes)
      try {
        const nomComplet = dData.nomComplet || '';
        const citSnap = await getDocs(query(collection(db, 'citoyens'), where('nomComplet', '==', nomComplet)));
        if (!citSnap.empty) {
          const citData = citSnap.docs[0].data();
          dData.comte   = citData.comte   || dData.comte   || '';
          dData.metier  = citData.metier  || dData.metier  || '';
          dData.telegram= citData.telegram|| dData.telegram|| '';
          dData.armes   = citData.armes   || dData.armes   || [];
        }
      } catch (_) {}

      setCurrentDossier(dData);
      setCurrentInfs(infSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCurrentEnqs(enqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCurrentPlaintes(plaintesReelles);
      setView('detail');
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  async function reloadDossier() {
    if (currentDossier) await openDossier(currentDossier.id);
  }

  const filtered = dossiers.filter(d =>
    (d.nomComplet || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.idNum || '').toLowerCase().includes(search.toLowerCase())
  );

  if (view === 'detail' && currentDossier) {
    return <DossierDetail dossier={currentDossier} infs={currentInfs} enqs={currentEnqs} plaintesSignalees={currentPlaintes} onBack={() => { setView('list'); loadCasier(); }} onReload={reloadDossier} showNotif={showNotif} />;
  }

  return (
    <div className="card" style={{ paddingBottom: 16 }}>
      <div className="card-title">🗄 Casier Judiciaire</div>
      <div className="search-bar">
        <input type="text" className="field-input" style={{ flex: 1 }} placeholder="Rechercher par nom, prénom ou numéro d'identité..." value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn-gold" onClick={loadCasier}>🔄 Actualiser</button>
      </div>
      {loading ? (
        <div><span className="spinner" /> Chargement...</div>
      ) : (
        <div className="dossier-grid">
          {filtered.length === 0 && <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>Aucun dossier trouvé.</div>}
          {filtered.map(d => (
            <div key={d.id} className={`dossier-card${d.mostWanted ? ' most-wanted-card' : ''}`} onClick={() => openDossier(d.id)}>
              <div className="dossier-id">📋 ID : {d.idNum}</div>
              <div className="dossier-name">{d.nomComplet}</div>
              <div className="dossier-meta">{d.sexe || ''}{d.age ? ' • ' + d.age + ' ans' : ''}</div>
              <div className="dossier-stats">
                <span className="stat-badge">⚖ {d.nbInfractions || 0} infraction(s)</span>
                <span className="stat-badge">{d.totalAmende || 0} $</span>
                {d.sisika && <span className="stat-badge" style={{ borderColor: 'var(--red)', color: '#ff6b6b' }}>🔒 Sisika</span>}
                {d.mostWanted && <span className="badge-mw">🎯 MOST WANTED</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
