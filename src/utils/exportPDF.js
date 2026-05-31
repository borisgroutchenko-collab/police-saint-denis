// PDF export — utilise jsPDF via CDN (chargé dans public/index.html)
// La fonction reçoit les données déjà chargées depuis Firestore.

export async function exportPDF(d, infs, enqs, showNotif) {
  if (!window.jspdf) { showNotif('jsPDF non chargé', true); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const W = 210, M = 15; let y = 20;
  const G = [201,168,76], DK = [26,18,8], R = [139,26,26], BL = [26,58,110], P = [244,237,216];

  const setFont = (sz, bold, color) => { doc.setFontSize(sz); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...(color || DK)); };
  const txt = (s, x, yy, sz, bold, color, align) => { setFont(sz || 10, bold, color); doc.text(String(s || ''), x, yy, { align: align || 'left' }); };
  const rectF = (color, x, yy, w, h) => { doc.setFillColor(...color); doc.rect(x, yy, w, h, 'F'); };
  const ln = (color, x1, y1, x2, y2, lw) => { doc.setDrawColor(...color); doc.setLineWidth(lw || 0.3); doc.line(x1, y1, x2, y2); };
  const newPage = () => { doc.addPage(); y = 20; };

  // Header
  rectF(DK, 0, 0, W, 42);
  ln(G, 0, 42, W, 42, 0.5);
  txt('POLICE DE SAINT-DENIS', W/2, 12, 18, true, G, 'center');
  txt('Comté de Lemoyne — Anno Domini 1905', W/2, 19, 10, false, P, 'center');
  txt('DOSSIER JUDICIAIRE OFFICIEL', W/2, 28, 13, true, [232,201,122], 'center');
  txt('CONFIDENTIEL — À REMETTRE AU JUGE COMPÉTENT', W/2, 36, 7, false, [180,100,100], 'center');
  y = 52;

  // Identity block
  rectF(DK, M, y, W-2*M, 44);
  ln(G, M, y, W-M, y, 0.5); ln(G, M, y+44, W-M, y+44, 0.3);
  txt('IDENTITÉ DU PRÉVENU', M+4, y+7, 9, true, G);
  txt('Nom complet :', M+4, y+15, 9, true, DK); txt(d.nomComplet || '—', M+44, y+15, 9, false, P);
  txt("N° d'identité :", M+4, y+23, 9, true, DK); txt(d.idNum || '—', M+44, y+23, 9, false, G);
  txt('Sexe :', M+4, y+31, 9, true, DK); txt(d.sexe || '—', M+44, y+31, 9, false, P);
  txt('Âge :', M+95, y+31, 9, true, DK); txt(d.age ? d.age + ' ans' : '—', M+115, y+31, 9, false, P);
  txt('Condamnable à Sisika :', M+4, y+39, 9, true, DK);
  txt(d.sisika ? 'OUI — SÉJOUR À SISIKA' : 'NON', M+58, y+39, 9, true, d.sisika ? [220,60,60] : [80,180,80]);
  y += 52;

  // Verbalisations header
  if (y > 240) newPage();
  rectF([40,20,10], M, y, W-2*M, 9);
  txt('DÉTAIL DES VERBALISATIONS (' + infs.length + ')', M+4, y+6, 10, true, G);
  y += 13;

  infs.forEach((inf, i) => {
    if (y > 255) newPage();
    rectF([30,15,5], M, y, W-2*M, 8);
    const agentStr = inf.agent ? '  |  👮 ' + inf.agent : '';
    const heureStr = inf.heure ? ' à ' + inf.heure : '';
    txt('Verbalisation N°' + (i+1) + '  —  ' + inf.date + heureStr + agentStr, M+3, y+5.5, 9, true, P);
    y += 11;
    (inf.infractions || []).forEach(x => {
      if (y > 262) newPage();
      rectF([20,10,3], M+3, y, W-2*M-6, 7);
      txt(x.num + '  ' + x.nom, M+6, y+5, 8, false, P);
      if (x.amende > 0) txt(x.amende + ' $', W-M-3, y+5, 8, true, [255,150,100], 'right');
      y += 8;
    });
    if (inf.note) { if (y > 262) newPage(); txt('Note : ' + inf.note, M+5, y+4, 8, false, [180,160,120]); y += 6; }
    if (inf.desc) {
      if (y > 262) newPage();
      const lines = doc.splitTextToSize('Circonstances : ' + inf.desc, W-2*M-10);
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(150,130,100);
      doc.text(lines, M+5, y+4); y += lines.length * 4 + 6;
    }
    if (y > 262) newPage();
    txt('Sous-total : ' + inf.total + ' $' + (inf.sisika ? ' + SÉJOUR À SISIKA' : ''), W-M-3, y, 9, true, [255,120,80], 'right');
    ln(G, M, y+2, W-M, y+2, 0.2); y += 8;
  });

  // Grand total
  if (y > 250) newPage();
  rectF(R, M, y, W-2*M, 15);
  txt('TOTAL GÉNÉRAL DES AMENDES :', M+4, y+9, 12, true, P);
  txt((d.totalAmende || 0) + ' $', W-M-4, y+10, 15, true, [255,200,80], 'right');
  y += 20;

  // Enquêtes
  if (enqs.length) {
    if (y > 240) newPage();
    rectF(BL, M, y, W-2*M, 9);
    txt("DOSSIERS D'ENQUÊTE (" + enqs.length + ')', M+4, y+6, 10, true, [150,200,255]);
    y += 13;
    enqs.forEach(enq => {
      if (y > 255) newPage();
      txt('▪ ' + (enq.titre || 'Sans titre'), M+3, y, 9, true, [100,160,220]); y += 7;
      if (enq.date || enq.agent) { const m = (enq.date||'') + (enq.heure?' à '+enq.heure:'') + (enq.agent?'  —  Agent : '+enq.agent:''); if (y>262)newPage(); txt(m,M+6,y,8,false,[180,160,100]); y+=6; }
      if (enq.localisation) { if(y>262)newPage(); txt('Localisation : '+enq.localisation,M+6,y,8,false,P); y+=6; }
      if (enq.contact) { if(y>262)newPage(); txt('Contact(s) : '+enq.contact,M+6,y,8,false,P); y+=6; }
      if (enq.membres) { if(y>262)newPage(); txt('Suspects/Membres : '+enq.membres,M+6,y,8,false,P); y+=6; }
      y += 4;
    });
  }

  // Summary
  if (y > 230) newPage();
  rectF([40,20,10], M, y, W-2*M, 9);
  txt('RÉSUMÉ ET RECOMMANDATION AU JUGE', M+4, y+6, 10, true, G);
  y += 13;
  const summary = `Le prévenu ${d.nomComplet} (N° identité : ${d.idNum}) a été verbalisé ${infs.length} fois pour un total d'amendes de ${d.totalAmende || 0} $.` +
    (d.sisika ? " Des infractions entraînant un séjour à Sisika ont été constatées, et il est recommandé au juge de prononcer ladite peine conformément aux dispositions du code pénal du Comté de Lemoyne." :
                " Aucune infraction entraînant un séjour à Sisika n'a été relevée.");
  const sl = doc.splitTextToSize(summary, W-2*M-6);
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(...P); doc.text(sl, M+3, y); y += sl.length * 5 + 12;

  // Signature
  if (y > 245) newPage();
  ln(G, M, y, M+65, y, 0.3); txt("Signature de l'Officier Verbalisateur", M+32, y+6, 8, false, [150,130,100], 'center');
  ln(G, W-M-65, y, W-M, y, 0.3); txt("Cachet de la Police de Saint-Denis", W-M-32, y+6, 8, false, [150,130,100], 'center');

  // Footer on all pages
  const tp = doc.internal.getNumberOfPages();
  for (let i = 1; i <= tp; i++) {
    doc.setPage(i);
    rectF(DK, 0, 285, W, 12);
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(100,80,50);
    doc.text('Police de Saint-Denis — Comté de Lemoyne — 1905 — DOCUMENT CONFIDENTIEL', W/2, 291, { align: 'center' });
    doc.text('Page ' + i + ' / ' + tp, W-M, 291, { align: 'right' });
  }

  doc.save('Dossier_Judiciaire_' + d.nomComplet.replace(/ /g, '_') + '.pdf');
  showNotif('PDF généré avec succès !');
}
