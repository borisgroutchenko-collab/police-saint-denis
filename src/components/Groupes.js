import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { exportGroupePDF } from '../utils/exportGroupePDF';
import SearchableSelect from './SearchableSelect';
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc,
  doc, orderBy, query, serverTimestamp, getDoc, setDoc,
} from 'firebase/firestore';

// ── Enquête modal (réutilisé depuis Casier) ────────────────────
function EnqueteModal({ groupeId, enquete, agents, onClose, onSaved, showNotif }) {
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
        await updateDoc(doc(db, 'groupes', groupeId, 'enquetes', enquete.id), { ...form, photos });
        showNotif("Dossier d'enquête modifié !");
      } else {
        await addDoc(collection(db, 'groupes', groupeId, 'enquetes'), { ...form, photos, createdAt: serverTimestamp() });
        showNotif("Dossier d'enquête créé !");
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
        <div style={{ marginBottom: 16 }}><label className="field-label">Contact(s)</label><textarea className="field-textarea" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
        <div style={{ marginBottom: 16 }}><label className="field-label">Membres / Suspects</label><textarea className="field-textarea" value={form.membres} onChange={e => setForm(f => ({ ...f, membres: e.target.value }))} /></div>
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">🔍 Éléments d'enquête en cours</label>
          <textarea className="field-textarea" style={{ minHeight: 100 }} placeholder="Témoignages, indices, pistes, actions en cours..." value={form.elementsEnquete} onChange={e => setForm(f => ({ ...f, elementsEnquete: e.target.value }))} />
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
                <img src={url} alt="" onError={e => e.target.style.display = 'none'} />
                <button className="photo-remove" onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
        </div>
        <div className="actions-row">
          <button className="btn-blue" onClick={save}>💾 {enquete?.id ? 'Sauvegarder les modifications' : "Créer le dossier d'enquête"}</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal création / modification groupe ───────────────────────
function GroupeModal({ groupe, citoyens, onClose, onSaved, showNotif }) {
  const [form, setForm] = useState({
    nom:          groupe?.nom          || '',
    territoire:   groupe?.territoire   || '',
    notes:        groupe?.notes        || '',
    pseudonymes:  groupe?.pseudonymes  || '',
    suspicions:   groupe?.suspicions   || '',
  });
  const [membres, setMembres] = useState(groupe?.membres || []);

  function addMembre() {
    setMembres(m => [...m, { citoyenId: '', nom: '', prenom: '', role: '' }]);
  }
  function removeMembre(i) { setMembres(m => m.filter((_, j) => j !== i)); }
  function selectCitoyen(i, cid) {
    const c = citoyens.find(x => x.id === cid);
    setMembres(m => m.map((x, j) => j !== i ? x : c
      ? { ...x, citoyenId: cid, nom: c.nom, prenom: c.prenom, nomComplet: c.nomComplet || c.prenom + ' ' + c.nom }
      : { ...x, citoyenId: '' }
    ));
  }
  function updateRole(i, role) { setMembres(m => m.map((x, j) => j === i ? { ...x, role } : x)); }
  function updatePseudo(i, pseudo) { setMembres(m => m.map((x, j) => j === i ? { ...x, pseudo } : x)); }

  // Synchronise l'appartenance au groupe dans le casier de chaque membre
  async function syncMembresGroupe(groupeId, nomGroupe, nouveauxMembres, anciensMembres) {
    // Membres retirés → supprimer la référence groupe dans leur casier
    const nouveauxIds = nouveauxMembres.filter(m => m.citoyenId).map(m => m.citoyenId);
    for (const ancien of (anciensMembres || [])) {
      if (!ancien.citoyenId || nouveauxIds.includes(ancien.citoyenId)) continue;
      const casierKey = (ancien.nomComplet || ancien.prenom + ' ' + ancien.nom).toLowerCase().replace(/ /g, '_');
      try {
        const casierRef = doc(db, 'casier', casierKey);
        const snap = await getDoc(casierRef);
        if (snap.exists()) {
          const groupes = (snap.data().groupes || []).filter(g => g.groupeId !== groupeId);
          await updateDoc(casierRef, { groupes });
        }
      } catch (e) {}
    }
    // Membres ajoutés / maintenus → ajouter/mettre à jour la référence groupe dans leur casier
    for (const m of nouveauxMembres) {
      if (!m.citoyenId || !m.nom) continue;
      const nomComplet = m.nomComplet || (m.prenom ? m.prenom + ' ' : '') + m.nom;
      const casierKey = nomComplet.toLowerCase().replace(/ /g, '_');
      const casierRef = doc(db, 'casier', casierKey);
      const snap = await getDoc(casierRef);
      const groupeRef = { groupeId, nomGroupe, role: m.role || '', pseudo: m.pseudo || '' };
      if (!snap.exists()) {
        // Créer le casier automatiquement
        await setDoc(casierRef, {
          idNum: casierKey, nom: m.nom, prenom: m.prenom || '',
          nomComplet, sexe: '', age: 0,
          createdAt: serverTimestamp(),
          totalAmende: 0, sisika: false, nbInfractions: 0,
          groupes: [groupeRef],
        });
      } else {
        const existingGroupes = (snap.data().groupes || []).filter(g => g.groupeId !== groupeId);
        await updateDoc(casierRef, { groupes: [...existingGroupes, groupeRef] });
      }
    }
  }

  async function save() {
    if (!form.nom.trim()) { showNotif('Le nom du groupe est obligatoire', true); return; }
    const membresFiltres = membres.filter(m => m.citoyenId);
    const data = { ...form, membres: membresFiltres, updatedAt: serverTimestamp() };
    try {
      let savedId = groupe?.id;
      if (groupe?.id) {
        await updateDoc(doc(db, 'groupes', groupe.id), data);
        showNotif('Groupe modifié !');
      } else {
        const ref = await addDoc(collection(db, 'groupes'), { ...data, createdAt: serverTimestamp() });
        savedId = ref.id;
        showNotif('Groupe créé !');
      }
      await syncMembresGroupe(savedId, form.nom, membresFiltres, groupe?.membres || []);
      onSaved();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div className="modal-overlay open">
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-title">{groupe?.id ? '✏ Modifier le groupe' : '➕ Nouveau groupe'}</div>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">Nom du groupe *</label>
            <input type="text" className="field-input" placeholder="Ex: Les Loups du Bayou" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Territoire connu</label>
            <input type="text" className="field-input" placeholder="Ex: Marais de Lemoyne, Rhodes..." value={form.territoire} onChange={e => setForm(f => ({ ...f, territoire: e.target.value }))} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Notes</label>
          <textarea className="field-textarea" style={{ minHeight: 70 }} placeholder="Activités connues, dangerosité, observations..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Pseudonymes de membres connus</label>
          <textarea className="field-textarea" style={{ minHeight: 60 }} placeholder="Ex: Le Borgne, Black Jack, La Veuve..." value={form.pseudonymes} onChange={e => setForm(f => ({ ...f, pseudonymes: e.target.value }))} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Suspicions</label>
          <textarea className="field-textarea" style={{ minHeight: 70 }} placeholder="Activités illicites suspectées, affaires en cours..." value={form.suspicions} onChange={e => setForm(f => ({ ...f, suspicions: e.target.value }))} />
        </div>

        {/* Membres */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label className="field-label" style={{ margin: 0 }}>Membres du groupe</label>
            <button className="btn-blue" style={{ fontSize: 10, padding: '4px 10px' }} onClick={addMembre}>+ Ajouter un membre</button>
          </div>
          {citoyens.length === 0 && <div style={{ color: '#ff9966', fontFamily: "'Special Elite', cursive", fontSize: 12 }}>⚠ Aucun citoyen enregistré.</div>}
          {membres.map((m, i) => (
            <div key={i} style={{ background: 'rgba(0,0,0,.2)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 3, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(201,168,76,.7)', letterSpacing: 1 }}>Membre {i + 1}</span>
                <button className="btn-red" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => removeMembre(i)}>✕ Retirer</button>
              </div>
              <div className="form-grid">
                <div>
                  <label className="field-label">Citoyen</label>
                  <select className="field-select" value={m.citoyenId || ''} onChange={e => selectCitoyen(i, e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {citoyens.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}{c.metier ? ' (' + c.metier + ')' : ''}</option>)}
                  </select>
                  {m.citoyenId && <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(201,168,76,.7)', fontFamily: "'Special Elite', cursive" }}>✓ {m.prenom} {m.nom}</div>}
                </div>
                <div>
                  <label className="field-label">Rôle / Rang</label>
                  <input type="text" className="field-input" placeholder="Ex: Chef, Lieutenant, Membre..." value={m.role || ''} onChange={e => updateRole(i, e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <label className="field-label">Pseudonyme(s) connu(s)</label>
                <input type="text" className="field-input" placeholder="Ex: Le Borgne, Black Jack, ..." value={m.pseudo || ''} onChange={e => updatePseudo(i, e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        <div className="actions-row">
          <button className="btn-submit" onClick={save}>💾 Sauvegarder</button>
          <button className="btn-red" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Vue détail groupe ──────────────────────────────────────────
function GroupeDetail({ groupe, enqs, plaintes, agents, onBack, onEdit, onDelete, onReload, showNotif }) {
  const [showEnquete, setShowEnquete] = useState(false);
  const [editEnquete, setEditEnquete] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [citoyensInfo, setCitoyensInfo] = React.useState({});

  React.useEffect(() => {
    // Charger statut citoyen + mostWanted pour les membres
    const ids = (groupe.membres || []).filter(m => m.citoyenId).map(m => m.citoyenId);
    if (!ids.length) return;
    Promise.all([
      getDocs(collection(db, 'citoyens')),
      getDocs(collection(db, 'casier')),
    ]).then(([citSnap, casierSnap]) => {
      const citMap = {};
      citSnap.docs.forEach(d => { citMap[d.id] = d.data(); });
      const casierMap = {};
      casierSnap.docs.forEach(d => {
        const data = d.data();
        if (data.nomComplet) casierMap[data.nomComplet.toLowerCase()] = data;
      });
      const info = {};
      (groupe.membres || []).forEach(m => {
        if (!m.citoyenId) return;
        const cit = citMap[m.citoyenId] || {};
        const nom = (m.nomComplet || (m.prenom + ' ' + m.nom) || '').toLowerCase();
        const casier = casierMap[nom] || null;
        info[m.citoyenId] = {
          statut: cit.statut || 'actif',
          mostWanted: casier?.mostWanted || false,
        };
      });
      setCitoyensInfo(info);
    }).catch(() => {});
  }, [groupe.id]);

  async function deleteEnquete(eid) {
    if (!window.confirm("Supprimer ce dossier d'enquête ?")) return;
    await deleteDoc(doc(db, 'groupes', groupe.id, 'enquetes', eid));
    showNotif('Enquête supprimée');
    onReload();
  }

  return (
    <div>
      {lightbox && <div className="modal-overlay open" onClick={() => setLightbox(null)}><img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 3, border: '2px solid var(--gold)' }} /></div>}
      {showEnquete && <EnqueteModal groupeId={groupe.id} enquete={null} agents={agents} onClose={() => setShowEnquete(false)} onSaved={() => { setShowEnquete(false); onReload(); }} showNotif={showNotif} />}
      {editEnquete && <EnqueteModal groupeId={groupe.id} enquete={editEnquete} agents={agents} onClose={() => setEditEnquete(null)} onSaved={() => { setEditEnquete(null); onReload(); }} showNotif={showNotif} />}

      <button className="back-btn" onClick={onBack}>← Retour aux groupes</button>

      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>⚔ {groupe.nom}</span>
          <button
            className="btn-gold"
            style={{ fontSize: 12, padding: '6px 14px' }}
            onClick={() => exportGroupePDF(groupe, enqs, plaintes, citoyensInfo, showNotif)}
          >📄 Exporter PDF</button>
        </div>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div>
            <span className="field-label">Territoire connu</span>
            <div style={{ fontSize: 15, color: 'var(--paper)', marginTop: 4 }}>{groupe.territoire || '—'}</div>
          </div>
          <div>
            <span className="field-label">Membres</span>
            <div style={{ fontSize: 15, color: 'var(--paper)', marginTop: 4 }}>{(groupe.membres || []).length} membre(s)</div>
          </div>
        </div>

        {groupe.notes && (
          <div style={{ marginBottom: 12, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 3, padding: '12px 16px' }}>
            <span className="field-label">Notes</span>
            <div style={{ fontSize: 14, color: 'rgba(244,237,216,.85)', lineHeight: 1.7, marginTop: 6, whiteSpace: 'pre-wrap' }}>{groupe.notes}</div>
          </div>
        )}

        {groupe.pseudonymes && (
          <div style={{ marginBottom: 12, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 3, padding: '12px 16px' }}>
            <span className="field-label">Pseudonymes de membres connus</span>
            <div style={{ fontSize: 14, color: 'rgba(244,237,216,.7)', lineHeight: 1.7, marginTop: 6, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>{groupe.pseudonymes}</div>
          </div>
        )}

        {groupe.suspicions && (
          <div style={{ marginBottom: 12, background: 'rgba(139,26,26,.1)', border: '1px solid rgba(139,26,26,.3)', borderRadius: 3, padding: '12px 16px' }}>
            <span className="field-label" style={{ color: '#ff9966' }}>⚠ Suspicions</span>
            <div style={{ fontSize: 14, color: 'rgba(244,237,216,.85)', lineHeight: 1.7, marginTop: 6, whiteSpace: 'pre-wrap' }}>{groupe.suspicions}</div>
          </div>
        )}

        {/* Liste des membres */}
        {(groupe.membres || []).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <span className="field-label" style={{ display: 'block', marginBottom: 10 }}>👥 Membres</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {groupe.membres.map((m, i) => {
                const info = citoyensInfo[m.citoyenId] || {};
                const statut = info.statut || 'actif';
                const mw = info.mostWanted || false;
                const bordeColor = mw ? '#CC0000' : statut === 'decede' ? 'rgba(136,136,136,.4)' : statut === 'disparu' ? 'rgba(255,204,68,.4)' : 'rgba(201,168,76,.2)';
                const opacity = statut === 'decede' ? 0.65 : 1;
                return (
                  <div key={i} style={{ background: 'rgba(0,0,0,.25)', border: '1px solid ' + bordeColor, borderRadius: 3, padding: '10px 14px', opacity }}>
                    {mw && <div style={{ marginBottom: 4 }}><span className="badge-mw" style={{ fontSize: 9 }}>🎯 MOST WANTED</span></div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: 'var(--paper)' }}>{m.prenom} {m.nom}</div>
                      {statut === 'decede'  && <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 10, color: '#888' }}>⚰ Décédé</span>}
                      {statut === 'disparu' && <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 10, color: '#ffcc44' }}>❓ Disparu</span>}
                    </div>
                    {m.role && <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'var(--gold)', letterSpacing: 1, marginTop: 3 }}>{m.role}</div>}
                    {m.pseudo && <div style={{ fontSize: 12, color: 'rgba(244,237,216,.5)', fontStyle: 'italic', marginTop: 3 }}>alias {m.pseudo}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="actions-row">
          <button className="btn-gold" onClick={onEdit}>✏ Modifier</button>
          <button className="btn-blue" onClick={() => setShowEnquete(true)}>🔍 Créer un dossier d'enquête</button>
          <button className="btn-red" onClick={onDelete}>🗑 Supprimer le groupe</button>
        </div>
      </div>

      {/* Plaintes liées au groupe */}
      {plaintes && plaintes.filter(p => p.statut === 'ouverte' || p.statut === 'instruite').length > 0 && (
        <div className="card" style={{ marginTop: 16, borderLeft: '4px solid #ffcc44' }}>
          <div className="card-title" style={{ color: '#ffcc44' }}>
            📝 Dépôts de Plainte — Enquêtes en cours ({plaintes.filter(p => p.statut === 'ouverte' || p.statut === 'instruite').length})
          </div>
          {plaintes.filter(p => p.statut === 'ouverte' || p.statut === 'instruite').map(p => {
            const STATUTS = { ouverte: { label: '🔴 Ouverte', color: '#ff6b6b' }, instruite: { label: '🟡 En instruction', color: '#ffcc44' } };
            const s = STATUTS[p.statut] || STATUTS.ouverte;
            return (
              <div key={p.id} style={{ background: 'rgba(255,204,68,.06)', border: '1px solid rgba(255,204,68,.25)', borderRadius: 3, padding: '12px 16px', marginBottom: 8 }}>
                <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: s.color, letterSpacing: 1, marginBottom: 4 }}>
                  📅 {p.date || '—'} — <span style={{ color: s.color }}>{s.label}</span>
                  {p.agent && <span style={{ marginLeft: 10, color: 'rgba(201,168,76,.8)' }}>👮 {p.agent}</span>}
                </div>
                <div style={{ fontSize: 14, color: 'var(--paper)', marginBottom: 4 }}>
                  <span style={{ color: '#ff9966' }}>Plaignant(s) :</span> {p.plaintifsStr || '—'}
                </div>
                {p.faits && <div style={{ fontSize: 13, color: 'rgba(244,237,216,.7)', fontStyle: 'italic', lineHeight: 1.5 }}>{p.faits.length > 200 ? p.faits.slice(0, 200) + '…' : p.faits}</div>}
              </div>
            );
          })}
        </div>
      )}
      {plaintes && plaintes.filter(p => p.statut === 'classee').length > 0 && (
        <div className="card" style={{ marginTop: 16, borderLeft: '4px solid #90ee90' }}>
          <div className="card-title" style={{ color: '#90ee90' }}>
            📝 Plaintes classées ({plaintes.filter(p => p.statut === 'classee').length})
          </div>
          {plaintes.filter(p => p.statut === 'classee').map(p => (
            <div key={p.id} style={{ background: 'rgba(20,80,20,.08)', border: '1px solid rgba(20,120,20,.2)', borderRadius: 3, padding: '10px 14px', marginBottom: 6 }}>
              <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: '#90ee90', letterSpacing: 1, marginBottom: 3 }}>📅 {p.date || '—'} — 🟢 Classée</div>
              <div style={{ fontSize: 13, color: 'rgba(244,237,216,.7)' }}>{p.plaintifsStr || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Dossiers d'enquête */}
      {enqs.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">🔍 Dossiers d'Enquête ({enqs.length})</div>
          {enqs.map(enq => (
            <div key={enq.id} className="enquete-card">
              <div className="enquete-title">
                <span>🗂 {enq.titre || 'Enquête sans titre'}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-blue" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setEditEnquete(enq)}>✏ Modifier</button>
                  <button className="btn-red" onClick={() => deleteEnquete(enq.id)}>🗑 Supprimer</button>
                </div>
              </div>
              {(enq.date || enq.agent) && (
                <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: 'rgba(201,168,76,0.6)', letterSpacing: 1, marginBottom: 10 }}>
                  {enq.date && '📅 ' + enq.date}{enq.heure && ' à ' + enq.heure}
                  {enq.agent && <span style={{ marginLeft: 10, color: 'rgba(201,168,76,.9)' }}>👮 {enq.agent}</span>}
                </div>
              )}
              {enq.localisation && <div className="enquete-field"><div className="enquete-field-label">📍 Localisation</div><div className="enquete-field-value">{enq.localisation}</div></div>}
              {enq.contact && <div className="enquete-field"><div className="enquete-field-label">📞 Contact(s)</div><div className="enquete-field-value">{enq.contact}</div></div>}
              {enq.membres && <div className="enquete-field"><div className="enquete-field-label">👥 Membres / Suspects</div><div className="enquete-field-value">{enq.membres}</div></div>}
              {enq.elementsEnquete && (
                <div className="enquete-field">
                  <div className="enquete-field-label" style={{ color: '#9ec4ff' }}>🔍 Éléments d'enquête</div>
                  <div className="enquete-field-value" style={{ background: 'rgba(26,58,110,.15)', border: '1px solid rgba(26,58,110,.3)', borderRadius: 3, padding: '8px 12px', marginTop: 4 }}>{enq.elementsEnquete}</div>
                </div>
              )}
              {enq.photos && enq.photos.length > 0 && (
                <div className="enquete-field">
                  <div className="enquete-field-label">📷 Photos</div>
                  <div className="record-photos">{enq.photos.map((url, i) => <img key={i} className="record-photo" src={url} alt="" onClick={() => setLightbox(url)} onError={e => e.target.style.display = 'none'} />)}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────
export default function Groupes({ showNotif }) {
  const [groupes, setGroupes] = useState([]);
  const [citoyens, setCitoyens] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(null);
  const [selectedEnqs, setSelectedEnqs] = useState([]);
  const [selectedPlaintes, setSelectedPlaintes] = useState([]);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gSnap, cSnap, aSnap] = await Promise.all([
        getDocs(query(collection(db, 'groupes'), orderBy('nom'))),
        getDocs(query(collection(db, 'citoyens'), orderBy('nomComplet'))),
        getDocs(query(collection(db, 'effectif'), orderBy('nom'))),
      ]);
      setGroupes(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCitoyens(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAgents(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
    setLoading(false);
  }, [showNotif]);

  useEffect(() => { load(); }, [load]);

  async function openGroupe(groupe) {
    try {
      const enqSnap = await getDocs(query(collection(db, 'groupes', groupe.id, 'enquetes'), orderBy('createdAt', 'desc')));
      const plSnap = await getDocs(collection(db, 'plaintes'));
      const groupePlaintes = plSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.groupesLies && p.groupesLies.includes(groupe.id));
      setSelected(groupe);
      setSelectedEnqs(enqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSelectedPlaintes(groupePlaintes);
      setView('detail');
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  async function reloadDetail() {
    if (!selected) return;
    const gSnap = await getDoc(doc(db, 'groupes', selected.id));
    const enqSnap = await getDocs(query(collection(db, 'groupes', selected.id, 'enquetes'), orderBy('createdAt', 'desc')));
    const plSnap = await getDocs(collection(db, 'plaintes'));
    const groupePlaintes = plSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.groupesLies && p.groupesLies.includes(selected.id));
    setSelected({ id: selected.id, ...gSnap.data() });
    setSelectedEnqs(enqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setSelectedPlaintes(groupePlaintes);
    load();
  }

  async function deleteGroupe() {
    if (!window.confirm(`Supprimer le groupe "${selected.nom}" ?`)) return;
    try {
      // Retirer le groupe des casiers des membres
      for (const m of (selected.membres || [])) {
        if (!m.citoyenId || !m.nom) continue;
        const nomComplet = m.nomComplet || (m.prenom ? m.prenom + ' ' : '') + m.nom;
        const casierKey = nomComplet.toLowerCase().replace(/ /g, '_');
        try {
          const snap = await getDoc(doc(db, 'casier', casierKey));
          if (snap.exists()) {
            const groupes = (snap.data().groupes || []).filter(g => g.groupeId !== selected.id);
            await updateDoc(doc(db, 'casier', casierKey), { groupes });
          }
        } catch (e) {}
      }
      // Supprimer les enquêtes du groupe
      const enqSnap = await getDocs(collection(db, 'groupes', selected.id, 'enquetes'));
      for (const e of enqSnap.docs) await deleteDoc(e.ref);
      await deleteDoc(doc(db, 'groupes', selected.id));
      showNotif('Groupe supprimé');
      setView('list');
      setSelected(null);
      load();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  const filtered = groupes.filter(g =>
    (g.nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (g.territoire || '').toLowerCase().includes(search.toLowerCase())
  );

  if (view === 'detail' && selected) {
    const current = groupes.find(g => g.id === selected.id) || selected;
    return (
      <>
        {modal && (
          <GroupeModal groupe={modal} citoyens={citoyens}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); reloadDetail(); }}
            showNotif={showNotif} />
        )}
        <GroupeDetail
          groupe={current} enqs={selectedEnqs} plaintes={selectedPlaintes} agents={agents}
          onBack={() => { setView('list'); setSelected(null); load(); }}
          onEdit={() => setModal(current)}
          onDelete={deleteGroupe}
          onReload={reloadDetail}
          showNotif={showNotif}
        />
      </>
    );
  }

  return (
    <div>
      {modal !== null && (
        <GroupeModal groupe={modal} citoyens={citoyens}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          showNotif={showNotif} />
      )}
      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>⚔ Groupes & Organisations</span>
          <button className="btn-submit" style={{ padding: '8px 20px', fontSize: 13 }} onClick={() => setModal({})}>➕ Nouveau groupe</button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input type="text" className="field-input" style={{ flex: 1 }} placeholder="Rechercher par nom ou territoire..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn-gold" onClick={load}>🔄 Actualiser</button>
        </div>
        {loading && <div><span className="spinner" /> Chargement...</div>}
        {!loading && filtered.length === 0 && <div style={{ color: 'rgba(244,237,216,.4)', fontStyle: 'italic', fontSize: 14 }}>Aucun groupe enregistré.</div>}
        {!loading && filtered.length > 0 && (
          <div className="dossier-grid">
            {filtered.map(g => (
              <div key={g.id} className="dossier-card" onClick={() => openGroupe(g)}>
                <div className="dossier-name">⚔ {g.nom}</div>
                {g.territoire && <div className="dossier-meta">📍 {g.territoire}</div>}
                <div className="dossier-stats" style={{ marginTop: 8 }}>
                  <span className="stat-badge">👥 {(g.membres || []).length} membre(s)</span>
                </div>
                {g.notes && <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(244,237,216,.5)', lineHeight: 1.5 }}>{g.notes.length > 80 ? g.notes.slice(0, 80) + '…' : g.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
