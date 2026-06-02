import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, addDoc, updateDoc, increment, serverTimestamp, getDocs, orderBy, query } from 'firebase/firestore';
import { ALL_INFRACTIONS } from '../data/penalCode';

export default function Verbalization({ showNotif }) {
  const today = new Date();
  const nowTime = today.getHours().toString().padStart(2,'0') + ':' + today.getMinutes().toString().padStart(2,'0');
  const rpDate = '1905-' + String(today.getMonth() + 1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

  const [agents, setAgents] = useState([]);
  const [citoyens, setCitoyens] = useState([]);
  const [citoyenChoisi, setCitoyenChoisi] = useState(null); // objet citoyen sélectionné

  useEffect(() => {
    getDocs(query(collection(db, 'effectif'), orderBy('nom')))
      .then(snap => setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
    getDocs(query(collection(db, 'citoyens'), orderBy('nomComplet')))
      .then(snap => setCitoyens(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, []);

  const emptyForm = {
    date: rpDate,
    heure: nowTime,
    agent: '',
    note: '',
    desc: '',
  };

  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [totalOverride, setTotalOverride] = useState('');
  const [saisiesObjets, setSaisiesObjets] = useState([]);
  const [saisiesArmes, setSaisiesArmes] = useState([]);

  const totalAuto = selected.reduce((s, x) => s + x.amende, 0);
  const total = totalOverride !== '' ? parseInt(totalOverride) || 0 : totalAuto;
  const hasSisika = selected.some(x => x.sisika);

  function handleCitoyenSelect(e) {
    const val = e.target.value;
    if (!val) { setCitoyenChoisi(null); return; }
    const c = citoyens.find(c => c.id === val);
    setCitoyenChoisi(c || null);
  }

  function toggleInfraction(art) {
    setSelected(prev => prev.find(x => x.num === art.num) ? prev.filter(x => x.num !== art.num) : [...prev, art]);
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
      ...emptyForm,
      date: '1905-' + String(now.getMonth() + 1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0'),
      heure: now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0'),
    });
    setCitoyenChoisi(null);
    setSelected([]);
    setPhotos([]);
    setTotalOverride('');
    setSaisiesObjets([]);
    setSaisiesArmes([]);
  }


  // Met à jour le statut de l'arme dans la fiche citoyen si elle existe
  async function markArmeSaisie(nomComplet, serie) {
    if (!serie) return;
    try {
      const citSnap = await getDocs(query(collection(db, 'citoyens'), where('nomComplet', '==', nomComplet)));
      if (citSnap.empty) return;
      const citDoc = citSnap.docs[0];
      const armes = citDoc.data().armes || [];
      const updated = armes.map(a => a.serie === serie ? { ...a, statutArme: 'saisie' } : a);
      await updateDoc(doc(db, 'citoyens', citDoc.id), { armes: updated });
    } catch (_) {}
  }

  async function submit() {
    if (!citoyenChoisi) {
      showNotif('Sélectionnez un citoyen enregistré', true); return;
    }
    if (!form.date || !selected.length) {
      showNotif('Date et au moins une infraction obligatoires', true); return;
    }
    const nomComplet = citoyenChoisi.nomComplet || (citoyenChoisi.prenom + ' ' + citoyenChoisi.nom);
    // Clé stable = nomComplet en minuscules, espaces remplacés par underscores
    const casierKey = nomComplet.toLowerCase().replace(/ /g, '_');
    const record = {
      date: form.date, heure: form.heure, agent: form.agent,
      note: form.note, desc: form.desc,
      nom: citoyenChoisi.nom, prenom: citoyenChoisi.prenom,
      idNum: citoyenChoisi.carteId || casierKey,
      sexe: citoyenChoisi.sexe || '', age: citoyenChoisi.age || 0,
      nomComplet,
      infractions: selected, total, sisika: hasSisika,
      photos: [...photos], createdAt: serverTimestamp(),
    };
    try {
      const dRef = doc(db, 'casier', casierKey);
      const dSnap = await getDoc(dRef);
      if (!dSnap.exists()) {
        await setDoc(dRef, {
          idNum: citoyenChoisi.carteId || casierKey,
          nom: citoyenChoisi.nom, prenom: citoyenChoisi.prenom,
          nomComplet, sexe: citoyenChoisi.sexe || '',
          age: citoyenChoisi.age || 0, createdAt: serverTimestamp(),
          totalAmende: 0, sisika: false, nbInfractions: 0,
        });
      }
      await addDoc(collection(dRef, 'infractions'), record);
      await updateDoc(dRef, {
        totalAmende: increment(total),
        sisika: hasSisika || (dSnap.exists() && dSnap.data().sisika),
        nbInfractions: increment(1),
      });
      // Saisies
      const saisieBase = { source: 'verbalisation', date: form.date, heure: form.heure, agent: form.agent, nomComplet, createdAt: serverTimestamp() };
      for (const obj of saisiesObjets.filter(o => o.trim())) {
        await addDoc(collection(db, 'saisies'), { ...saisieBase, type: 'objet', description: obj });
      }
      for (const arme of saisiesArmes.filter(a => a.nom || a.serie)) {
        await addDoc(collection(db, 'saisies'), { ...saisieBase, type: 'arme', description: arme.nom, serie: arme.serie || '' });
        if (arme.serie) await markArmeSaisie(nomComplet, arme.serie);
      }
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

        {/* Sélection citoyen — obligatoire */}
        <div style={{ marginBottom: 20, padding: '16px', background: 'rgba(201,168,76,.06)', border: '1px solid rgba(201,168,76,.3)', borderRadius: 3 }}>
          <label className="field-label" style={{ marginBottom: 8 }}>Citoyen verbalisé *</label>
          {citoyens.length === 0 ? (
            <div style={{ color: '#ff9966', fontFamily: "'Special Elite', cursive", fontSize: 13, padding: '10px 0' }}>
              ⚠ Aucun citoyen enregistré. Rendez-vous dans l'onglet Citoyens pour en ajouter.
            </div>
          ) : (
            <select className="field-select" value={citoyenChoisi?.id || ''} onChange={handleCitoyenSelect}>
              <option value="">— Sélectionner un citoyen enregistré —</option>
              {citoyens.map(c => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom}{c.carteId ? ' — ' + c.carteId : ''}{c.metier ? ' (' + c.metier + ')' : ''}
                </option>
              ))}
            </select>
          )}
          {/* Fiche récap du citoyen sélectionné */}
          {citoyenChoisi && (
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {[
                ['Nom', citoyenChoisi.nomComplet || citoyenChoisi.prenom + ' ' + citoyenChoisi.nom],
                ['Carte d\'identité', citoyenChoisi.carteId || '—'],
                ['Âge', citoyenChoisi.age ? citoyenChoisi.age + ' ans' : '—'],
                ['Sexe', citoyenChoisi.sexe || '—'],
                ['Comté', citoyenChoisi.comte || '—'],
                ['Métier', citoyenChoisi.metier || '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 10, color: 'rgba(201,168,76,.7)', letterSpacing: 1 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--paper)' }}>{val}</div>
                </div>
              ))}
            </div>
          )}
        </div>

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
            {agents.length > 0 ? (
              <select className="field-select" value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))}>
                <option value="">— Sélectionner un agent —</option>
                {agents.map(a => (
                  <option key={a.id} value={`${a.grade} ${a.prenom} ${a.nom}`}>
                    {a.grade} — {a.prenom} {a.nom}
                  </option>
                ))}
              </select>
            ) : (
              <input type="text" className="field-input" placeholder="Ex: Shérif Morgan" value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))} />
            )}
          </div>
        </div>

        {/* Note / Description */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Note / Appréciation</label>
          <input type="text" className="field-input" placeholder="Note de l'officier verbalisateur" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Description complémentaire</label>
          <textarea className="field-textarea" placeholder="Circonstances, lieu, description des faits..." value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
        </div>

        {/* Infractions */}
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
                    <div className="infraction-amount">{art.sisika ? '🔒 Sisika ' : ''}{art.amende > 0 ? art.amende + ' $' : ''}</div>
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
            <div style={{ fontSize: 10, color: 'rgba(201,168,76,.5)', fontFamily: "'Special Elite', cursive", marginTop: 4 }}>Calculé : {totalAuto} $</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number" min="0"
              style={{ width: 90, textAlign: 'right', fontSize: 22, fontFamily: "'Special Elite', cursive", color: 'var(--gold)', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(201,168,76,.4)', borderRadius: 3, padding: '4px 8px', MozAppearance: 'textfield', WebkitAppearance: 'none' }}
              placeholder={totalAuto}
              value={totalOverride}
              onChange={e => setTotalOverride(e.target.value)}
            />
            <span className="total-amount" style={{ fontSize: 22 }}>$</span>
          </div>
        </div>

        {/* Photos */}
        <div style={{ marginTop: 20 }}>
          <label className="field-label">Photos de preuves (liens URL)</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input type="url" className="field-input" style={{ flex: 1 }} placeholder="https://..." value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} />
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

        {/* Saisies */}
        <div style={{ marginTop: 20, padding: '16px', background: 'rgba(201,168,76,.06)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 3 }}>
          <label className="field-label" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>📦 Objets & Armes saisis</label>
          <div style={{ marginBottom: 14 }}>
            <label className="field-label" style={{ fontSize: 11, marginBottom: 6 }}>Objets saisis</label>
            {saisiesObjets.map((obj, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input type="text" className="field-input" style={{ flex: 1 }} placeholder="Ex: Sac de billets, documents falsifiés..." value={obj}
                  onChange={e => setSaisiesObjets(s => s.map((x, j) => j === i ? e.target.value : x))} />
                <button className="btn-red" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setSaisiesObjets(s => s.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button className="btn-gold" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setSaisiesObjets(s => [...s, ''])}>+ Ajouter un objet</button>
          </div>
          <div>
            <label className="field-label" style={{ fontSize: 11, marginBottom: 6 }}>Armes saisies</label>
            {saisiesArmes.map((arme, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <input type="text" className="field-input" style={{ flex: 2 }} placeholder="Nom de l'arme" value={arme.nom || ''}
                  onChange={e => setSaisiesArmes(s => s.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))} />
                <input type="text" className="field-input" style={{ flex: 2, fontFamily: "'Special Elite', cursive", letterSpacing: 1 }} placeholder="N° série : 0000000000-0000" value={arme.serie || ''}
                  onChange={e => setSaisiesArmes(s => s.map((x, j) => j === i ? { ...x, serie: e.target.value } : x))} />
                <button className="btn-red" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setSaisiesArmes(s => s.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button className="btn-gold" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setSaisiesArmes(s => [...s, { nom: '', serie: '' }])}>+ Ajouter une arme</button>
          </div>
        </div>

        <div className="actions-row" style={{ marginTop: 24 }}>
          <button className="btn-submit" onClick={submit}>⚖ Enregistrer la Verbalisation</button>
          <button className="btn-red" onClick={resetForm}>✕ Réinitialiser</button>
        </div>
      </div>
    </div>
  );
}
