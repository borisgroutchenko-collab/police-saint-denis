import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, addDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { ALL_INFRACTIONS } from '../data/penalCode';

export default function Verbalization({ showNotif }) {
  const today = new Date();
  const nowTime = today.getHours().toString().padStart(2,'0') + ':' + today.getMinutes().toString().padStart(2,'0');

  const [form, setForm] = useState({
    date: today.toISOString().split('T')[0],
    heure: nowTime,
    agent: '',
    nom: '',
    prenom: '',
    idNum: '',
    sexe: '',
    age: '',
    note: '',
    desc: '',
  });
  const [selected, setSelected] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [lightbox, setLightbox] = useState(null);

  const total = selected.reduce((s, x) => s + x.amende, 0);
  const hasSisika = selected.some(x => x.sisika);

  function toggleInfraction(art) {
    setSelected(prev => {
      const exists = prev.find(x => x.num === art.num);
      return exists ? prev.filter(x => x.num !== art.num) : [...prev, art];
    });
  }

  function addPhoto() {
    if (!photoUrl.startsWith('http')) { showNotif('Le lien doit commencer par http...', true); return; }
    setPhotos(prev => [...prev, photoUrl]);
    setPhotoUrl('');
    showNotif('Photo ajoutée !');
  }

  function resetForm() {
    const now = new Date();
    setForm({
      date: now.toISOString().split('T')[0],
      heure: now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0'),
      agent: '', nom: '', prenom: '', idNum: '', sexe: '', age: '', note: '', desc: '',
    });
    setSelected([]);
    setPhotos([]);
  }

  async function submit() {
    if (!form.date || !form.nom || !form.prenom || !form.idNum || !selected.length) {
      showNotif('Champs obligatoires manquants ou aucune infraction sélectionnée', true); return;
    }
    const record = {
      ...form, age: parseInt(form.age) || 0,
      infractions: selected, total, sisika: hasSisika,
      photos: [...photos],
      createdAt: serverTimestamp(),
      nomComplet: form.prenom + ' ' + form.nom,
    };
    try {
      const dRef = doc(db, 'casier', form.idNum);
      const dSnap = await getDoc(dRef);
      if (!dSnap.exists()) {
        await setDoc(dRef, {
          idNum: form.idNum, nom: form.nom, prenom: form.prenom,
          nomComplet: form.prenom + ' ' + form.nom,
          sexe: form.sexe, age: parseInt(form.age) || 0,
          createdAt: serverTimestamp(), totalAmende: 0, sisika: false, nbInfractions: 0,
        });
      }
      await addDoc(collection(dRef, 'infractions'), record);
      await updateDoc(dRef, {
        totalAmende: increment(total),
        sisika: hasSisika || (dSnap.exists() && dSnap.data().sisika),
        nbInfractions: increment(1),
      });
      showNotif('Verbalisation enregistrée !');
      resetForm();
    } catch (e) { showNotif('Erreur : ' + e.message, true); }
  }

  return (
    <div>
      {lightbox && (
        <div className="modal-overlay open" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="preuve" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 3, border: '2px solid var(--gold)' }} />
        </div>
      )}

      <div className="card">
        <div className="card-title">📋 Nouvelle Verbalisation</div>

        {/* Date / Heure / Agent */}
        <div className="form-grid three" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">Date de l'infraction *</label>
            <input type="date" className="field-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Heure de l'infraction *</label>
            <input type="time" className="field-input" value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Agent verbalisateur *</label>
            <input type="text" className="field-input" placeholder="Ex: Shérif Morgan" value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))} />
          </div>
        </div>

        {/* ID / Sexe / Âge */}
        <div className="form-grid three" style={{ marginBottom: 16 }}>
          <div>
            <label className="field-label">N° Pièce d'identité *</label>
            <input type="text" className="field-input" placeholder="Ex: SD-1905-001" value={form.idNum} onChange={e => setForm(f => ({ ...f, idNum: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Sexe</label>
            <select className="field-select" value={form.sexe} onChange={e => setForm(f => ({ ...f, sexe: e.target.value }))}>
              <option value="">— Sélectionner —</option>
              <option>Masculin</option>
              <option>Féminin</option>
            </select>
          </div>
          <div>
            <label className="field-label">Âge</label>
            <input type="number" className="field-input" placeholder="Ex: 35" min="0" max="120" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
          </div>
        </div>

        {/* Nom / Prénom */}
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

        {/* Note */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Note / Appréciation</label>
          <input type="text" className="field-input" placeholder="Note de l'officier verbalisateur" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Description complémentaire</label>
          <textarea className="field-textarea" placeholder="Circonstances, lieu, description des faits..." value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
        </div>

        {/* Infractions grid */}
        <div style={{ marginBottom: 20 }}>
          <label className="field-label" style={{ marginBottom: 12 }}>Nature(s) des infraction(s) *</label>
          <div className="infractions-grid">
            {ALL_INFRACTIONS.map(art => {
              const isSel = selected.some(x => x.num === art.num);
              return (
                <div key={art.num} className={`infraction-item${isSel ? ' selected' : ''}`} onClick={() => toggleInfraction(art)}>
                  <div className="infraction-check">{isSel ? '✓' : ''}</div>
                  <div>
                    <div className="infraction-art">{art.num}</div>
                    <div className="infraction-name">{art.nom}</div>
                    <div className="infraction-amount">
                      {art.sisika ? '🔒 Sisika ' : ''}{art.amende > 0 ? art.amende + ' $' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total */}
        <div className="total-box">
          <div>
            <div className="total-label">Amende totale</div>
            {hasSisika && <span className="sisika-badge">⚠ SÉJOUR À SISIKA</span>}
          </div>
          <div className="total-amount">{total} $</div>
        </div>

        {/* Photos */}
        <div style={{ marginTop: 20 }}>
          <label className="field-label">Photos de preuves (liens URL)</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input type="url" className="field-input" style={{ flex: 1 }} placeholder="https://upload.fixitfy.com.tr/..." value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} />
            <button className="btn-blue" onClick={addPhoto} style={{ whiteSpace: 'nowrap' }}>+ Ajouter</button>
          </div>
          <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 10, color: 'rgba(244,237,216,.3)', letterSpacing: 1, marginBottom: 10 }}>
            Uploadez sur fixitfy.com.tr, imgbb.com ou imgur.com puis collez le lien
          </div>
          <div className="photo-preview-grid">
            {photos.map((url, i) => (
              <div key={i} className="photo-preview">
                <img src={url} alt="" onClick={() => setLightbox(url)} onError={e => { e.target.parentElement.style.background = 'rgba(139,26,26,0.3)'; e.target.style.display = 'none'; }} />
                <button className="photo-remove" onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="actions-row" style={{ marginTop: 24 }}>
          <button className="btn-submit" onClick={submit}>⚖ Enregistrer la Verbalisation</button>
          <button className="btn-red" onClick={resetForm}>✕ Réinitialiser</button>
        </div>
      </div>
    </div>
  );
}
