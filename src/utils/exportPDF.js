import jsPDF from 'jspdf';
import PAPER_BG from './paperBg';

const INK        = [26,  10,  0];
const INK_LIGHT  = [61,  31,  0];
const GOLD       = [122, 92,  30];
const RED        = [139, 0,   0];
const DARK_BROWN = [74,  34,  0];
const W = 210;
const H = 297;

function setFill(doc, rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
function setDraw(doc, rgb) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

function drawPageBg(doc) {
  doc.setFillColor(240, 223, 194);
  doc.rect(0, 0, W, H, 'F');
  doc.addImage(PAPER_BG, 'JPEG', 0, 0, W, H);
  setDraw(doc, GOLD);
  doc.setLineWidth(0.6);
  doc.rect(7, 7, W - 14, H - 14);
  doc.setLineWidth(0.2);
  doc.rect(8.5, 8.5, W - 17, H - 17);
}

function sep(doc, y) {
  setDraw(doc, GOLD);
  doc.setLineWidth(0.3);
  doc.line(12, y, W - 12, y);
  setFill(doc, GOLD);
  doc.setFont('times', 'bold');
  doc.setFontSize(7);
  doc.text('-', W / 2, y + 3, { align: 'center' });
}

function addRow(doc, label, value, y, rouge) {
  setFill(doc, INK_LIGHT);
  doc.setFont('times', 'italic');
  doc.setFontSize(9.5);
  doc.text(label, 13, y);
  setFill(doc, rouge ? RED : INK);
  doc.setFont('times', rouge ? 'bold' : 'normal');
  doc.setFontSize(9.5);
  doc.text(String(value || '-'), 58, y);
  return y + 5;
}

function footerPage(doc, pageNum, total) {
  setFill(doc, INK_LIGHT);
  doc.setFont('times', 'italic');
  doc.setFontSize(7);
  doc.text(
    'Police de Saint-Denis  -  Comte de Lemoyne  -  1905  -  DOCUMENT CONFIDENTIEL          Page ' + pageNum + ' / ' + total,
    W / 2, H - 8, { align: 'center' }
  );
}

function checkBreak(doc, y, pageRef) {
  if (y > H - 50) {
    footerPage(doc, pageRef.current, '?');
    doc.addPage();
    drawPageBg(doc);
    pageRef.current++;
    return 22;
  }
  return y;
}

export function exportPDF(dossier, infs, enqs, showNotif) {
  try {
    const d = dossier;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageRef = { current: 1 };

    drawPageBg(doc);
    let y = 22;

    // En-tete
    setFill(doc, GOLD);
    doc.setFont('times', 'bold');
    doc.setFontSize(15);
    doc.text('POLICE DE SAINT-DENIS', W / 2, y, { align: 'center' }); y += 6;
    setFill(doc, INK_LIGHT);
    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.text('Comte de Lemoyne  -  Anno Domini 1905', W / 2, y, { align: 'center' }); y += 5;
    setFill(doc, GOLD);
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('DOSSIER JUDICIAIRE OFFICIEL', W / 2, y, { align: 'center' }); y += 5;
    setFill(doc, INK_LIGHT);
    doc.setFont('times', 'italic');
    doc.setFontSize(8.5);
    doc.text('CONFIDENTIEL - A REMETTRE AU JUGE COMPETENT', W / 2, y, { align: 'center' }); y += 6;

    sep(doc, y); y += 7;

    // Identite
    setFill(doc, GOLD);
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.text('- IDENTITE DU PREVENU -', 13, y); y += 5.5;

    y = addRow(doc, 'Nom complet :', d.nomComplet, y);
    y = addRow(doc, "N° d'identite :", d.idNum, y);
    y = addRow(doc, 'Sexe :', d.sexe, y);
    y = addRow(doc, 'Age :', d.age ? d.age + ' ans' : null, y);
    y = addRow(doc, "Comte d'origine :", d.comte, y);
    y = addRow(doc, 'Metier :', d.metier, y);
    y = addRow(doc, 'N° Telegramme :', d.telegram, y);

    if (d.groupes && d.groupes.length > 0) {
      const gStr = d.groupes.map(g =>
        g.nomGroupe + (g.role ? ' (' + g.role + ')' : '') + (g.pseudo ? ' alias ' + g.pseudo : '')
      ).join(', ');
      const gLines = doc.splitTextToSize(gStr, W - 71);
      setFill(doc, INK_LIGHT);
      doc.setFont('times', 'italic');
      doc.setFontSize(9.5);
      doc.text('Appartenance :', 13, y);
      setFill(doc, INK);
      doc.setFont('times', 'normal');
      doc.text(gLines, 58, y);
      y += gLines.length * 5;
    }

    if (d.armes && d.armes.length > 0) {
      setFill(doc, INK_LIGHT);
      doc.setFont('times', 'italic');
      doc.setFontSize(9.5);
      doc.text('Armes enregistrees :', 13, y);
      setFill(doc, INK);
      doc.setFont('times', 'normal');
      doc.setFontSize(9.5);
      d.armes.forEach(function(arme, i) {
        var txt = (arme.nom || '-') + (arme.serie ? '  -  No ' + arme.serie : '');
        doc.text(txt, 58, y + i * 4.8);
      });
      y += d.armes.length * 4.8 + 1;
    }

    y = addRow(doc, 'Condamnable Sisika :', d.sisika ? 'OUI - SEJOUR A SISIKA' : 'Non', y, d.sisika);
    y += 2;

    sep(doc, y); y += 7;

    // Verbalisations
    setFill(doc, GOLD);
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.text('- DETAIL DES VERBALISATIONS (' + infs.length + ') -', 13, y); y += 6;

    for (var i = 0; i < infs.length; i++) {
      var inf = infs[i];
      y = checkBreak(doc, y, pageRef);

      var descText = inf.desc ? doc.splitTextToSize('Circonstances : ' + inf.desc, W - 30) : [];

      // Filet doré léger au-dessus de chaque verbalisation
      setDraw(doc, GOLD);
      doc.setLineWidth(0.15);
      doc.line(13, y - 3, W - 13, y - 3);

      setFill(doc, GOLD);
      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.text('Verbalisation', 14, y);
      setFill(doc, INK_LIGHT);
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      if (inf.date) doc.text(inf.date + (inf.heure ? '  a  ' + inf.heure : ''), 46, y);
      if (inf.agent) doc.text(inf.agent, W - 14, y, { align: 'right' });
      y += 4.8;

      (inf.infractions || []).forEach(function(x) {
        setFill(doc, INK);
        doc.setFont('times', 'normal');
        doc.setFontSize(9.5);
        doc.text(x.num + '  -  ' + x.nom, 14, y);
        doc.setFont('times', 'bold');
        doc.text(x.amende + ' $', W - 14, y, { align: 'right' });
        y += 4.8;
      });

      if (descText.length > 0) {
        setFill(doc, INK_LIGHT);
        doc.setFont('times', 'italic');
        doc.setFontSize(8.5);
        doc.text(descText, 14, y);
        y += descText.length * 4.5 + 1;
      }

      setFill(doc, inf.sisika ? RED : INK_LIGHT);
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.text(
        inf.sisika
          ? 'Sous-total : ' + (inf.total || 0) + ' $  +  SEJOUR A SISIKA'
          : 'Sous-total : ' + (inf.total || 0) + ' $',
        14, y
      );
      y += 8;
    }

    sep(doc, y); y += 5;

    setFill(doc, INK);
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL GENERAL DES AMENDES :', 13, y);
    setFill(doc, DARK_BROWN);
    doc.setFontSize(13);
    doc.text((d.totalAmende || 0) + ' $', W - 13, y, { align: 'right' });
    y += 5;

    sep(doc, y); y += 7;

    // Enquetes
    if (enqs.length > 0) {
      y = checkBreak(doc, y, pageRef);
      setFill(doc, GOLD);
      doc.setFont('times', 'bold');
      doc.setFontSize(10.5);
      doc.text("- DOSSIERS D'ENQUETE (" + enqs.length + ') -', 13, y); y += 6;

      for (var j = 0; j < enqs.length; j++) {
        var enq = enqs[j];
        y = checkBreak(doc, y, pageRef);
        // Filet doré léger au-dessus de chaque enquête
        setDraw(doc, GOLD);
        doc.setLineWidth(0.15);
        doc.line(13, y - 3, W - 13, y - 3);

        setFill(doc, GOLD);
        doc.setFont('times', 'bold');
        doc.setFontSize(9.5);
        doc.text(enq.titre || 'Enquete sans titre', 14, y); y += 4.8;
        setFill(doc, INK_LIGHT);
        doc.setFont('times', 'normal');
        doc.setFontSize(8.5);
        if (enq.date) { doc.text(enq.date + (enq.heure ? ' a ' + enq.heure : ''), 14, y); y += 4.8; }
        if (enq.localisation) { doc.text('Localisation : ' + enq.localisation, 14, y); y += 4.8; }
        if (enq.contact) { doc.text('Contact(s) : ' + enq.contact, 14, y); y += 4.8; }
        if (enq.membres) { doc.text('Membres / Suspects : ' + enq.membres, 14, y); y += 4.8; }
        if (enq.elementsEnquete) {
          var eLines = doc.splitTextToSize('Elements : ' + enq.elementsEnquete, W - 30);
          doc.text(eLines, 14, y); y += eLines.length * 4.5;
        }
        y += 5;
      }

      sep(doc, y); y += 7;
    }

    // Resume
    y = checkBreak(doc, y, pageRef);
    setFill(doc, GOLD);
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.text('- RESUME ET RECOMMANDATION AU JUGE -', 13, y); y += 6;

    var sisikaTxt = d.sisika
      ? "Des infractions entrainant un sejour a Sisika ont ete constatees, et il est recommande au juge de prononcer ladite peine conformement aux dispositions du code penal du Comte de Lemoyne."
      : "Aucune infraction n'entraine de sejour a Sisika. Le prevenu est passible d'amendes uniquement.";
    var resume =
      'Le prevenu ' + d.nomComplet + ' (No identite : ' + d.idNum + ') a ete verbalise ' +
      infs.length + " fois pour un total d'amendes de " + (d.totalAmende || 0) + ' $. ' + sisikaTxt;
    setFill(doc, INK);
    doc.setFont('times', 'italic');
    doc.setFontSize(9.5);
    var resumeLines = doc.splitTextToSize(resume, W - 26);
    doc.text(resumeLines, 13, y);

    footerPage(doc, pageRef.current, pageRef.current + 1);

    // Page signatures
    doc.addPage();
    drawPageBg(doc);
    y = 40;
    setFill(doc, GOLD);
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('- SIGNATURES ET CACHETS -', W / 2, y, { align: 'center' }); y += 20;

    setFill(doc, INK_LIGHT);
    doc.setFont('times', 'italic');
    doc.setFontSize(9.5);
    doc.text("Signature de l'Officier Verbalisateur", W / 4, y, { align: 'center' });
    var ly = y + 20;
    setDraw(doc, INK_LIGHT);
    doc.setLineWidth(0.4);
    doc.line(15, ly, W / 2 - 10, ly);

    setFill(doc, INK_LIGHT);
    doc.text('Cachet de la Police de Saint-Denis', (W / 2 + W) / 2, y, { align: 'center' });
    var cx = (W / 2 + W) / 2;
    setDraw(doc, GOLD);
    doc.setLineWidth(0.5);
    doc.circle(cx, y + 20, 12, 'S');
    doc.setLineWidth(0.25);
    doc.circle(cx, y + 20, 9.5, 'S');
    setFill(doc, GOLD);
    doc.setFont('times', 'bold');
    doc.setFontSize(6);
    doc.text('POLICE DE', cx, y + 18, { align: 'center' });
    doc.text('SAINT-DENIS', cx, y + 22, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(5.5);
    doc.text('- 1905 -', cx, y + 26, { align: 'center' });

    footerPage(doc, pageRef.current + 1, pageRef.current + 1);

    var filename = 'Dossier_' + (d.nomComplet || 'inconnu').replace(/ /g, '_') + '.pdf';
    doc.save(filename);
    if (showNotif) showNotif('PDF exporte avec succes !');
  } catch (e) {
    console.error(e);
    if (showNotif) showNotif('Erreur export PDF : ' + e.message, true);
  }
}
