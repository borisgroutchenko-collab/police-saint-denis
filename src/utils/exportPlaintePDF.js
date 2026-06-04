import jsPDF from 'jspdf';
import PAPER_BG from './paperBg';
import { SPECIAL_ELITE_B64 } from './specialEliteFont';

const INK       = [30,  15,  5];
const INK_LIGHT = [80,  45, 10];
const GOLD      = [130, 90,  20];
const RED       = [160,  0,   0];
const ORANGE    = [179, 107,  0];
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
  setDraw(doc, GOLD); doc.setLineWidth(0.3);
  doc.line(18, y, W - 18, y);
  setFill(doc, GOLD); doc.setFont('SpecialElite', 'normal'); doc.setFontSize(7);
  doc.text('*', W / 2, y + 3, { align: 'center' });
  return y + 7;
}

function sec(doc, y, txt) {
  setFill(doc, GOLD); doc.setFont('SpecialElite', 'normal'); doc.setFontSize(11);
  doc.text(txt, 18, y);
  return y + 8;
}

function row(doc, label, value, y, rouge, orange) {
  setFill(doc, INK_LIGHT); doc.setFont('SpecialElite', 'normal'); doc.setFontSize(9.5);
  doc.text(label, 18, y);
  setFill(doc, rouge ? RED : (orange ? ORANGE : INK));
  doc.setFont('SpecialElite', 'normal'); doc.setFontSize(9.5);
  doc.text(String(value || '-'), 65, y);
  return y + 5.5;
}

function checkBreak(doc, y, pageRef, fs) {
  if (y > H - 55) {
    footer(doc, pageRef.current, '?');
    doc.addPage();
    drawPageBg(doc);
    addSEFont(doc);
    doc.setFont('SpecialElite', 'normal');
    if (fs) doc.setFontSize(fs);
    pageRef.current++;
    return 55;
  }
  return y;
}

function tblock(doc, text, y, colorRgb, fs) {
  setFill(doc, colorRgb || INK);
  doc.setFont('SpecialElite', 'normal'); doc.setFontSize(fs || 9.5);
  var lines = doc.splitTextToSize(text, W - 36);
  doc.text(lines, 18, y);
  return y + lines.length * 5.2;
}

function footer(doc, page, total) {
  setFill(doc, INK_LIGHT); doc.setFont('SpecialElite', 'normal'); doc.setFontSize(7);
  doc.text('Police de Lemoyne  -  Comte de Lemoyne  -  1905  -  DOCUMENT CONFIDENTIEL          Page ' + page + ' / ' + total,
    W / 2, H - 10, { align: 'center' });
}

function drawSignatures(doc, y) {
  setFill(doc, INK_LIGHT); doc.setFont('SpecialElite', 'normal'); doc.setFontSize(9.5);
  doc.text("Signature de l'Agent Receptionnaire", 18, y);
  doc.text('Cachet de la Police de Lemoyne', W - 18, y, { align: 'right' });
  y += 15;
  setDraw(doc, INK_LIGHT); doc.setLineWidth(0.5);
  doc.line(18, y, 90, y);
  var cx = 160;
  setDraw(doc, GOLD); doc.setLineWidth(1);
  doc.circle(cx, y - 7, 10, 'S'); doc.setLineWidth(0.25); doc.circle(cx, y - 7, 8, 'S');
  setFill(doc, GOLD); doc.setFontSize(6);
  doc.text('POLICE DE', cx, y - 9, { align: 'center' });
  doc.text('LEMOYNE', cx, y - 5.5, { align: 'center' });
  doc.setFontSize(5); doc.text('- 1905 -', cx, y - 2, { align: 'center' });
  return y + 10;
}

export function exportPlaintePDF(plainte, casiersLies, showNotif) {
  try {
    var doc = new jsPDF({ unit: 'mm', format: 'a4' });
    addSEFont(doc);
    var SIG_HEIGHT = 28;
    var pageRef = { current: 1 };
    var statutLabel = { ouverte: 'OUVERTE', instruite: 'EN INSTRUCTION', classee: 'CLASSEE' }[plainte.statut] || (plainte.statut || '').toUpperCase();

    drawPageBg(doc);
    var y = 52;

    // EN-TETE
    setFill(doc, RED); doc.setFont('SpecialElite', 'normal'); doc.setFontSize(13);
    doc.text('RAPPORT DE DEPOT DE PLAINTE', W / 2, y, { align: 'center' }); y += 6;
    setFill(doc, INK_LIGHT); doc.setFontSize(8.5);
    doc.text('CONFIDENTIEL - A REMETTRE AU JUGE COMPETENT', W / 2, y, { align: 'center' }); y += 8;

    y = sep(doc, y);
    y = sec(doc, y, '- INFORMATIONS GENERALES -');
    y = row(doc, 'Date du depot :', (plainte.date || '-') + (plainte.heure ? '  a  ' + plainte.heure : ''), y);
    y = row(doc, 'Agent receptionnaire :', plainte.agent || '-', y);
    y = row(doc, 'Statut :', statutLabel, y, plainte.statut === 'ouverte', plainte.statut === 'instruite');
    y += 2; y = sep(doc, y);

    y = checkBreak(doc, y, pageRef);
    y = sec(doc, y, '- PLAIGNANT(S) -');
    (plainte.plaignants || []).forEach(function(p) {
      setFill(doc, INK); doc.setFont('SpecialElite', 'normal'); doc.setFontSize(10);
      doc.text(((p.prenom || '') + ' ' + (p.nom || '')).trim(), 18, y); y += 5.5;
    });
    y += 2; y = sep(doc, y);

    y = checkBreak(doc, y, pageRef);
    y = sec(doc, y, '- PERSONNE(S) MISE(S) EN CAUSE -');
    (plainte.misEnCause || []).forEach(function(m) {
      if (m.inconnu) {
        setFill(doc, RED); doc.setFont('SpecialElite', 'normal'); doc.setFontSize(10);
        doc.text('Auteur inconnu - Plainte contre X', 18, y);
      } else {
        var nom = ((m.prenom || '') + ' ' + (m.nom || '')).trim();
        setFill(doc, INK); doc.setFont('SpecialElite', 'normal'); doc.setFontSize(10);
        doc.text(nom, 18, y);
        if (m.carteId) {
          var wNom = doc.getTextWidth(nom);
          setFill(doc, GOLD); doc.setFontSize(9);
          doc.text('Carte N° ' + m.carteId, 18 + wNom + 2, y);
        }
      }
      y += 5.5;
    });
    (plainte.groupesMisEnCause || []).filter(function(g) { return g.groupeId; }).forEach(function(g) {
      setFill(doc, RED); doc.setFont('SpecialElite', 'normal'); doc.setFontSize(10);
      doc.text('Groupe mis en cause : ' + g.nomGroupe, 18, y); y += 5.5;
    });
    y += 2; y = sep(doc, y);

    if (plainte.faits) {
      y = checkBreak(doc, y, pageRef);
      y = sec(doc, y, '- CIRCONSTANCES ET FAITS -');
      var fLines = doc.splitTextToSize(plainte.faits, W - 36);
      setFill(doc, INK); doc.setFont('SpecialElite', 'normal'); doc.setFontSize(9.5);
      for (var fi = 0; fi < fLines.length; fi++) {
        y = checkBreak(doc, y, pageRef, 9.5);
        doc.text(fLines[fi], 18, y); y += 5.2;
      }
      y += 2; y = checkBreak(doc, y, pageRef); y = sep(doc, y);
    }

    if (plainte.elementsEnquete) {
      y = checkBreak(doc, y, pageRef);
      y = sec(doc, y, "- ELEMENTS D'ENQUETE EN COURS -");
      var eqLines = doc.splitTextToSize(plainte.elementsEnquete, W - 36);
      setFill(doc, BLUE_INK); doc.setFont('SpecialElite', 'normal'); doc.setFontSize(9.5);
      for (var ei = 0; ei < eqLines.length; ei++) {
        y = checkBreak(doc, y, pageRef, 9.5);
        doc.text(eqLines[ei], 18, y); y += 5.2;
      }
      y += 2; y = checkBreak(doc, y, pageRef); y = sep(doc, y);
    }

    if (casiersLies && casiersLies.length > 0) {
      y = checkBreak(doc, y, pageRef);
      y = sec(doc, y, '- CASIERS JUDICIAIRES LIES -');
      casiersLies.forEach(function(cas) {
        y = row(doc, 'Nom complet :', cas.nomComplet, y);
        y = row(doc, 'Infractions :', (cas.nbInfractions || 0) + '  -  Total amendes : ' + (cas.totalAmende || 0) + ' $', y);
        y += 2;
      });
      y += 2; y = sep(doc, y);
    }

    y = checkBreak(doc, y, pageRef);
    y = sec(doc, y, '- RESUME ET RECOMMANDATION AU JUGE -');
    var misNoms = (plainte.misEnCause || []).map(function(m) {
      return m.inconnu ? 'Auteur inconnu' : ((m.prenom || '') + ' ' + (m.nom || '')).trim();
    });
    var plaignantsNoms = (plainte.plaignants || []).map(function(p) {
      return ((p.prenom || '') + ' ' + (p.nom || '')).trim();
    });
    var resume = 'La plainte deposee le ' + (plainte.date || '-') + ' par ' + plaignantsNoms.join(' et ') +
      ' vise ' + misNoms.join(', ') + '. L\'affaire est actuellement ' + statutLabel.toLowerCase() + '. ' +
      'Il est recommande au juge d\'ordonner les diligences necessaires conformement au code penal du Comte de Lemoyne.';
    var rLines = doc.splitTextToSize(resume, W - 36);
    setFill(doc, INK); doc.setFont('SpecialElite', 'normal'); doc.setFontSize(9.5);
    for (var ri = 0; ri < rLines.length; ri++) {
      y = checkBreak(doc, y, pageRef, 9.5);
      doc.text(rLines[ri], 18, y); y += 5.2;
    }
    y += 3;

    var totalPages = (H - y - 10) >= SIG_HEIGHT ? pageRef.current : pageRef.current + 1;
    if ((H - y - 10) >= SIG_HEIGHT) {
      y = sep(doc, y); drawSignatures(doc, y); footer(doc, pageRef.current, totalPages);
    } else {
      footer(doc, pageRef.current, totalPages);
      doc.addPage(); drawPageBg(doc);
      var y2 = 30; y2 = sep(doc, y2); drawSignatures(doc, y2); footer(doc, totalPages, totalPages);
    }

    var filename = 'Plainte_' + (plaignantsNoms[0] || 'inconnu').replace(/ /g, '_') + '.pdf';
    doc.save(filename);
    if (showNotif) showNotif('PDF exporte avec succes !');
  } catch (e) {
    console.error(e);
    if (showNotif) showNotif('Erreur export PDF : ' + e.message, true);
  }
}
