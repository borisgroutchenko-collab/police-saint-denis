import jsPDF from 'jspdf';
import PAPER_BG from './paperBg';

const INK       = [30,  15,  5];
const INK_LIGHT = [80,  45, 10];
const GOLD      = [130, 90,  20];
const RED       = [160,  0,   0];
const ORANGE    = [204, 136, 0];
const BLUE_INK  = [26,  58,  110];
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
  return y + 7;
}

function sec(doc, y, txt) {
  setFill(doc, GOLD);
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(txt, 13, y);
  return y + 8;
}

function row(doc, label, value, y, rouge, orange) {
  setFill(doc, INK_LIGHT);
  doc.setFont('times', 'italic');
  doc.setFontSize(9.5);
  doc.text(label, 13, y);
  var col = rouge ? RED : (orange ? ORANGE : INK);
  setFill(doc, col);
  doc.setFont('times', (rouge || orange) ? 'bold' : 'normal');
  doc.setFontSize(9.5);
  doc.text(String(value || '-'), 58, y);
  return y + 5;
}

function tblock(doc, text, y, colorRgb, fs) {
  setFill(doc, colorRgb || INK);
  doc.setFont('times', 'italic');
  doc.setFontSize(fs || 9.5);
  var lines = doc.splitTextToSize(text, W - 26);
  doc.text(lines, 13, y);
  return y + lines.length * 5;
}

function footer(doc, page, total) {
  setFill(doc, INK_LIGHT);
  doc.setFont('times', 'italic');
  doc.setFontSize(7);
  doc.text(
    'Police de Saint-Denis  -  Comte de Lemoyne  -  1905  -  DOCUMENT CONFIDENTIEL          Page ' + page + ' / ' + total,
    W / 2, H - 8, { align: 'center' }
  );
}

function drawSignatures(doc, y) {
  // Libellés sur la même ligne gauche/droite
  setFill(doc, INK_LIGHT);
  doc.setFont('times', 'italic');
  doc.setFontSize(9.5);
  doc.text("Signature de l'Agent Receptionnaire", 13, y);
  doc.text('Cachet de la Police de Saint-Denis', W - 13, y, { align: 'right' });
  y += 15;
  // Ligne de signature
  setDraw(doc, INK_LIGHT);
  doc.setLineWidth(0.5);
  doc.line(13, y, 90, y);
  // Cachet
  var cx = 160;
  var cy = y - 7;
  setDraw(doc, GOLD);
  doc.setLineWidth(1.5);
  doc.circle(cx, cy, 10, 'S');
  doc.setLineWidth(1);
  doc.circle(cx, cy, 8, 'S');
  setFill(doc, GOLD);
  doc.setFont('times', 'bold');
  doc.setFontSize(6);
  doc.text('POLICE DE', cx, cy - 1, { align: 'center' });
  doc.text('SAINT-DENIS', cx, cy + 2.5, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.setFontSize(5);
  doc.text('- 1905 -', cx, cy + 5.5, { align: 'center' });
  return y + 10;
}

export function exportPlaintePDF(plainte, casiersLies, showNotif) {
  try {
    var doc = new jsPDF({ unit: 'mm', format: 'a4' });
    var SIG_HEIGHT = 28;
    var statutLabel = { ouverte: 'OUVERTE', instruite: 'EN INSTRUCTION', classee: 'CLASSEE' }[plainte.statut] || (plainte.statut || '').toUpperCase();

    drawPageBg(doc);
    var y = 22;

    // EN-TÊTE
    setFill(doc, GOLD);
    doc.setFont('times', 'bold');
    doc.setFontSize(15);
    doc.text('POLICE DE SAINT-DENIS', W / 2, y, { align: 'center' }); y += 6;
    setFill(doc, INK_LIGHT);
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.text('Comte de Lemoyne  -  Anno Domini 1905', W / 2, y, { align: 'center' }); y += 5;
    setFill(doc, GOLD);
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('RAPPORT DE DEPOT DE PLAINTE', W / 2, y, { align: 'center' }); y += 5;
    setFill(doc, INK_LIGHT);
    doc.setFont('times', 'italic');
    doc.setFontSize(8.5);
    doc.text('CONFIDENTIEL - A REMETTRE AU JUGE COMPETENT', W / 2, y, { align: 'center' }); y += 6;

    y = sep(doc, y);

    // INFOS GÉNÉRALES
    y = sec(doc, y, '- INFORMATIONS GENERALES -');
    y = row(doc, 'Date du depot :', (plainte.date || '-') + (plainte.heure ? '  a  ' + plainte.heure : ''), y);
    y = row(doc, 'Agent receptionnaire :', plainte.agent || '-', y);
    y = row(doc, 'Statut :', statutLabel, y,
      plainte.statut === 'ouverte', plainte.statut === 'instruite');
    y += 2; y = sep(doc, y);

    // PLAIGNANTS
    y = sec(doc, y, '- PLAIGNANT(S) -');
    (plainte.plaignants || []).forEach(function(p) {
      setFill(doc, INK);
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.text(((p.prenom || '') + ' ' + (p.nom || '')).trim(), 13, y);
      y += 5;
    });
    y += 2; y = sep(doc, y);

    // MIS EN CAUSE
    y = sec(doc, y, '- PERSONNE(S) MISE(S) EN CAUSE -');
    (plainte.misEnCause || []).forEach(function(m) {
      if (m.inconnu) {
        setFill(doc, RED);
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        doc.text('Auteur inconnu - Plainte contre X', 13, y);
      } else {
        var nom = ((m.prenom || '') + ' ' + (m.nom || '')).trim();
        setFill(doc, INK);
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        doc.text(nom, 13, y);
        if (m.carteId) {
          var wNom = doc.getTextWidth(nom);
          setFill(doc, GOLD);
          doc.setFont('times', 'italic');
          doc.setFontSize(9);
          doc.text('Carte N° ' + m.carteId, 13 + wNom + 2, y);
        }
      }
      y += 5;
    });
    (plainte.groupesMisEnCause || []).filter(function(g) { return g.groupeId; }).forEach(function(g) {
      setFill(doc, RED);
      doc.setFont('times', 'italic');
      doc.setFontSize(10);
      doc.text('Groupe mis en cause : ' + g.nomGroupe, 13, y);
      y += 5;
    });
    y += 2; y = sep(doc, y);

    // FAITS
    if (plainte.faits) {
      y = sec(doc, y, '- CIRCONSTANCES ET FAITS -');
      y = tblock(doc, plainte.faits, y, INK);
      y += 2; y = sep(doc, y);
    }

    // ÉLÉMENTS D'ENQUÊTE
    if (plainte.elementsEnquete) {
      y = sec(doc, y, "- ELEMENTS D'ENQUETE EN COURS -");
      y = tblock(doc, plainte.elementsEnquete, y, BLUE_INK);
      y += 2; y = sep(doc, y);
    }

    // CASIERS LIÉS
    if (casiersLies && casiersLies.length > 0) {
      y = sec(doc, y, '- CASIERS JUDICIAIRES LIES -');
      casiersLies.forEach(function(cas) {
        y = row(doc, 'Nom complet :', cas.nomComplet, y);
        y = row(doc, 'Infractions :', (cas.nbInfractions || 0) + '  -  Total amendes : ' + (cas.totalAmende || 0) + ' $', y);
        y += 2;
      });
      y += 2; y = sep(doc, y);
    }

    // RÉSUMÉ
    y = sec(doc, y, '- RESUME ET RECOMMANDATION AU JUGE -');
    var misNoms = (plainte.misEnCause || []).map(function(m) {
      return m.inconnu ? 'Auteur inconnu' : ((m.prenom || '') + ' ' + (m.nom || '')).trim();
    });
    var plaignantsNoms = (plainte.plaignants || []).map(function(p) {
      return ((p.prenom || '') + ' ' + (p.nom || '')).trim();
    });
    var resume = 'La plainte deposee le ' + (plainte.date || '-') + ' par ' + plaignantsNoms.join(' et ') +
      ' vise ' + misNoms.join(', ') + '. L\'affaire est actuellement ' + statutLabel.toLowerCase() + '. ' +
      'Il est recommande au juge de prendre connaissance des elements d\'enquete et d\'ordonner ' +
      'les diligences necessaires conformement au code penal du Comte de Lemoyne.';
    y = tblock(doc, resume, y, INK);
    y += 3;

    // SIGNATURES : même page si assez de place, sinon nouvelle page
    if ((H - y - 10) >= SIG_HEIGHT) {
      y = sep(doc, y);
      drawSignatures(doc, y);
      footer(doc, 1, 1);
    } else {
      footer(doc, 1, 2);
      doc.addPage();
      drawPageBg(doc);
      y = 30;
      y = sep(doc, y);
      drawSignatures(doc, y);
      footer(doc, 2, 2);
    }

    var filename = 'Plainte_' + (plaignantsNoms[0] || 'inconnu').replace(/ /g, '_') + '.pdf';
    doc.save(filename);
    if (showNotif) showNotif('PDF exporté avec succès !');
  } catch (e) {
    console.error(e);
    if (showNotif) showNotif('Erreur export PDF : ' + e.message, true);
  }
}
