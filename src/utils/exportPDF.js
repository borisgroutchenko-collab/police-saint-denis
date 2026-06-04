import jsPDF from 'jspdf';
import PAPER_BG from './paperBg';
import { SPECIAL_ELITE_B64 } from './specialEliteFont';

const INK       = [30,  15,  5];
const INK_LIGHT = [80,  45, 10];
const GOLD      = [130, 90,  20];
const RED       = [160,  0,   0];
const ORANGE    = [179, 107,  0];
const DARK_BROWN= [100, 50,   5];
const BLUE_INK  = [26,  58, 110];
const W = 210;
const H = 297;

function setFill(doc, rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
function setDraw(doc, rgb) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

function addSEFont(doc) {
  doc.addFileToVFS('SpecialElite.ttf', SPECIAL_ELITE_B64);
  doc.addFont('SpecialElite.ttf', 'SpecialElite', 'normal');
}

function drawPageBg(doc) {
  doc.setFillColor(220, 218, 189);
  doc.rect(0, 0, W, H, 'F');
  doc.addImage(PAPER_BG, 'JPEG', 0, 0, W, H);
}

function sep(doc, y) {
  setDraw(doc, GOLD);
  doc.setLineWidth(0.3);
  doc.line(18, y, W - 18, y);
  setFill(doc, GOLD);
  doc.setFont('SpecialElite', 'normal');
  doc.setFontSize(7);
  doc.text('*', W / 2, y + 3, { align: 'center' });
  return y + 7;
}

function sec(doc, y, txt) {
  setFill(doc, GOLD);
  doc.setFont('SpecialElite', 'normal');
  doc.setFontSize(11);
  doc.text(txt, 18, y);
  return y + 8;
}

function row(doc, label, value, y, rouge, orange) {
  setFill(doc, INK_LIGHT);
  doc.setFont('SpecialElite', 'normal');
  doc.setFontSize(9.5);
  doc.text(label, 18, y);
  var col = rouge ? RED : (orange ? ORANGE : INK);
  setFill(doc, col);
  doc.setFont('SpecialElite', 'normal');
  doc.setFontSize(9.5);
  doc.text(String(value || '-'), 65, y);
  return y + 5.5;
}

function tblock(doc, text, y, colorRgb, fs) {
  setFill(doc, colorRgb || INK);
  doc.setFont('SpecialElite', 'normal');
  doc.setFontSize(fs || 9.5);
  var lines = doc.splitTextToSize(text, W - 36);
  doc.text(lines, 18, y);
  return y + lines.length * 5.2;
}

function footer(doc, page, total) {
  setFill(doc, INK_LIGHT);
  doc.setFont('SpecialElite', 'normal');
  doc.setFontSize(7);
  doc.text(
    'Police de Lemoyne  -  Comte de Lemoyne  -  1905  -  DOCUMENT CONFIDENTIEL          Page ' + page + ' / ' + total,
    W / 2, H - 10, { align: 'center' }
  );
}

function checkBreak(doc, y, pageRef) {
  if (y > H - 55) {
    footer(doc, pageRef.current, '?');
    doc.addPage();
    drawPageBg(doc);
    addSEFont(doc);
    pageRef.current++;
    return 55;
  }
  return y;
}

export function exportPDF(dossier, infs, enqs, showNotif) {
  try {
    var d = dossier;
    var doc = new jsPDF({ unit: 'mm', format: 'a4' });
    addSEFont(doc);
    var pageRef = { current: 1 };

    drawPageBg(doc);
    var y = 52;

    // EN-TETE
    setFill(doc, RED);
    doc.setFont('SpecialElite', 'normal');
    doc.setFontSize(13);
    doc.text('POLICE DE LEMOYNE', W / 2, y, { align: 'center' }); y += 6;
    setFill(doc, INK_LIGHT);
    doc.setFontSize(9);
    doc.text('Comte de Lemoyne  -  Anno Domini 1905', W / 2, y, { align: 'center' }); y += 5;
    setFill(doc, GOLD);
    doc.setFontSize(12);
    doc.text('DOSSIER JUDICIAIRE OFFICIEL', W / 2, y, { align: 'center' }); y += 5;
    setFill(doc, INK_LIGHT);
    doc.setFontSize(8.5);
    doc.text('CONFIDENTIEL - A REMETTRE AU JUGE COMPETENT', W / 2, y, { align: 'center' }); y += 6;

    y = sep(doc, y);

    // IDENTITE
    y = sec(doc, y, '- IDENTITE DU PREVENU -');
    y = row(doc, 'Nom complet :', d.nomComplet, y);
    y = row(doc, "N° d'identite :", d.idNum, y);
    y = row(doc, 'Sexe :', d.sexe, y);
    y = row(doc, 'Age :', d.age ? d.age + ' ans' : null, y);
    y = row(doc, "Comte d'origine :", d.comte, y);
    y = row(doc, 'Metier :', d.metier, y);
    y = row(doc, 'N° Telegramme :', d.telegram, y);

    if (d.groupes && d.groupes.length > 0) {
      var gStr = d.groupes.map(function(g) {
        return g.nomGroupe + (g.role ? ' (' + g.role + ')' : '') + (g.pseudo ? ' alias ' + g.pseudo : '');
      }).join(', ');
      var gLines = doc.splitTextToSize(gStr, W - 71);
      setFill(doc, INK_LIGHT); doc.setFont('SpecialElite','normal'); doc.setFontSize(9.5);
      doc.text('Appartenance :', 18, y);
      setFill(doc, INK); doc.text(gLines, 65, y);
      y += gLines.length * 5.5;
    }

    if (d.armes && d.armes.length > 0) {
      setFill(doc, INK_LIGHT); doc.setFont('SpecialElite','normal'); doc.setFontSize(9.5);
      doc.text('Armes enregistrees :', 18, y);
      setFill(doc, INK);
      d.armes.forEach(function(arme, i) {
        doc.text((arme.nom || '-') + (arme.serie ? '  -  No ' + arme.serie : ''), 65, y + i * 4.8);
      });
      y += d.armes.length * 4.8 + 1;
    }

    y = row(doc, 'Condamnable Sisika :', d.sisika ? 'OUI - SEJOUR A SISIKA' : 'Non', y, d.sisika);
    y += 2; y = sep(doc, y);

    // VERBALISATIONS
    setFill(doc, GOLD); doc.setFont('SpecialElite','normal'); doc.setFontSize(11);
    doc.text('- DETAIL DES VERBALISATIONS (' + infs.length + ') -', 18, y); y += 8;

    for (var i = 0; i < infs.length; i++) {
      var inf = infs[i];
      y = checkBreak(doc, y, pageRef);
      setDraw(doc, GOLD); doc.setLineWidth(0.2);
      doc.line(18, y - 3, W - 18, y - 3);

      setFill(doc, GOLD); doc.setFont('SpecialElite','normal'); doc.setFontSize(9);
      doc.text('Verbalisation', 18, y);
      setFill(doc, INK_LIGHT); doc.setFontSize(8);
      if (inf.date) doc.text(inf.date + (inf.heure ? '  a  ' + inf.heure : ''), 50, y);
      if (inf.agent) doc.text(inf.agent, W - 18, y, { align: 'right' });
      y += 4.8;

      (inf.infractions || []).forEach(function(x) {
        y = checkBreak(doc, y, pageRef);
        setFill(doc, INK); doc.setFont('SpecialElite','normal'); doc.setFontSize(9.5);
        doc.text(x.num + '  -  ' + x.nom, 18, y);
        doc.text(x.amende + ' $', W - 18, y, { align: 'right' });
        y += 4.8;
      });

      if (inf.desc) {
        setFill(doc, INK_LIGHT); doc.setFont('SpecialElite','normal'); doc.setFontSize(8.5);
        var dlines = doc.splitTextToSize('Circonstances : ' + inf.desc, W - 30);
        for (var di = 0; di < dlines.length; di++) {
          y = checkBreak(doc, y, pageRef);
          doc.text(dlines[di], 18, y); y += 4.5;
        }
        y += 1;
      }

      setFill(doc, inf.sisika ? RED : INK_LIGHT); doc.setFont('SpecialElite','normal'); doc.setFontSize(8.5);
      doc.text(inf.sisika ? 'Sous-total : ' + (inf.total||0) + ' $  +  SEJOUR A SISIKA' : 'Sous-total : ' + (inf.total||0) + ' $', 18, y);
      y += 8;
    }

    y = sep(doc, y); y += 2;
    setFill(doc, INK); doc.setFont('SpecialElite','normal'); doc.setFontSize(11);
    doc.text('TOTAL GENERAL DES AMENDES :', 18, y);
    setFill(doc, DARK_BROWN); doc.setFontSize(13);
    doc.text((d.totalAmende || 0) + ' $', W - 18, y, { align: 'right' }); y += 5;
    y = sep(doc, y);

    if (enqs.length > 0) {
      y = checkBreak(doc, y, pageRef);
      setFill(doc, GOLD); doc.setFont('SpecialElite','normal'); doc.setFontSize(11);
      doc.text("- DOSSIERS D'ENQUETE (" + enqs.length + ') -', 18, y); y += 8;
      for (var j = 0; j < enqs.length; j++) {
        var enq = enqs[j];
        y = checkBreak(doc, y, pageRef);
        setDraw(doc, GOLD); doc.setLineWidth(0.2);
        doc.line(18, y - 3, W - 18, y - 3);
        setFill(doc, GOLD); doc.setFont('SpecialElite','normal'); doc.setFontSize(9.5);
        doc.text(enq.titre || 'Enquete sans titre', 18, y); y += 4.8;
        setFill(doc, INK_LIGHT); doc.setFontSize(8.5);
        if (enq.date) { y = checkBreak(doc, y, pageRef); doc.text(enq.date + (enq.heure ? ' a ' + enq.heure : ''), 18, y); y += 4.8; }
        if (enq.localisation) { y = checkBreak(doc, y, pageRef); doc.text('Localisation : ' + enq.localisation, 18, y); y += 4.8; }
        if (enq.contact) { y = checkBreak(doc, y, pageRef); doc.text('Contact(s) : ' + enq.contact, 18, y); y += 4.8; }
        if (enq.elementsEnquete) {
          var eLines = doc.splitTextToSize('Elements : ' + enq.elementsEnquete, W - 30);
          for (var eli = 0; eli < eLines.length; eli++) {
            y = checkBreak(doc, y, pageRef);
            doc.text(eLines[eli], 18, y); y += 4.5;
          }
        }
        y += 4;
      }
      y = sep(doc, y);
    }

    y = checkBreak(doc, y, pageRef);
    setFill(doc, GOLD); doc.setFont('SpecialElite','normal'); doc.setFontSize(11);
    doc.text('- RESUME ET RECOMMANDATION AU JUGE -', 18, y); y += 8;
    var sisikaTxt = d.sisika
      ? "Des infractions entrainant un sejour a Sisika ont ete constatees, et il est recommande au juge de prononcer ladite peine conformement au code penal du Comte de Lemoyne."
      : "Aucune infraction n'entraine de sejour a Sisika. Le prevenu est passible d'amendes uniquement.";
    var resume = 'Le prevenu ' + d.nomComplet + ' (No identite : ' + d.idNum + ') a ete verbalise ' + infs.length + " fois pour un total d'amendes de " + (d.totalAmende||0) + ' $. ' + sisikaTxt;
    var resumeLines = doc.splitTextToSize(resume, W - 36);
    setFill(doc, INK); doc.setFont('SpecialElite','normal'); doc.setFontSize(9.5);
    for (var rl = 0; rl < resumeLines.length; rl++) {
      y = checkBreak(doc, y, pageRef);
      doc.text(resumeLines[rl], 18, y); y += 5.2;
    }

    var totalPages = pageRef.current + 1;
    footer(doc, pageRef.current, totalPages);
    doc.addPage(); drawPageBg(doc);
    y = 40;
    setFill(doc, GOLD); doc.setFont('SpecialElite','normal'); doc.setFontSize(11);
    doc.text('- SIGNATURES ET CACHETS -', W / 2, y, { align: 'center' }); y += 20;
    setFill(doc, INK_LIGHT); doc.setFontSize(9.5);
    doc.text("Signature de l'Officier Verbalisateur", W / 4, y, { align: 'center' });
    setDraw(doc, INK_LIGHT); doc.setLineWidth(0.4);
    doc.line(15, y + 20, W / 2 - 10, y + 20);
    var cx = (W / 2 + W) / 2;
    doc.text('Cachet de la Police de Lemoyne', cx, y, { align: 'center' });
    setDraw(doc, GOLD); doc.setLineWidth(0.5);
    doc.circle(cx, y + 20, 12, 'S'); doc.setLineWidth(0.25); doc.circle(cx, y + 20, 9.5, 'S');
    setFill(doc, GOLD); doc.setFontSize(6);
    doc.text('POLICE DE', cx, y + 18, { align: 'center' });
    doc.text('LEMOYNE', cx, y + 21.5, { align: 'center' });
    doc.setFontSize(5.5); doc.text('- 1905 -', cx, y + 25, { align: 'center' });
    footer(doc, totalPages, totalPages);

    var filename = 'Dossier_' + (d.nomComplet || 'inconnu').replace(/ /g, '_') + '.pdf';
    doc.save(filename);
    if (showNotif) showNotif('PDF exporte avec succes !');
  } catch (e) {
    console.error(e);
    if (showNotif) showNotif('Erreur export PDF : ' + e.message, true);
  }
}
