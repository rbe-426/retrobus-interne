/**
 * Moteur de template balisé pour devis / factures + calcul des totaux + aperçu HTML.
 *
 * Balises disponibles ({{BALISE}}) :
 *  TYPE_DOCUMENT, NUM_DEVIS (alias NUM_DOCUMENT), OBJET, DATE, ECHEANCE,
 *  DESTINATAIRE_NOM, DESTINATAIRE_SOCIETE, DESTINATAIRE_ADRESSE, DESTINATAIRE_CONTACTS,
 *  VEHICULE, DATES_PRESTATION, DISTANCE_KM,
 *  DEVIS_LINES_TR (HTML, lignes <tr>), TOTAL_BRUT, REMISE, TOTAL_HT, TVA, TAUX_TVA,
 *  MONTANT (alias PRIX_NET = total TTC), ACOMPTE, CONDITION_ACOMPTE, RESTE_A_PAYER,
 *  REFERENCE_DEVIS, NOTES, CONDITIONS_PAIEMENT, LOGO_IMG, BANDE_ENTETE, LOGO_BIG, LOGO_SMALL
 */

export const TEMPLATE_PLACEHOLDERS = [
  'TYPE_DOCUMENT', 'NUM_DEVIS', 'NUM_DOCUMENT', 'OBJET', 'DATE', 'ECHEANCE',
  'DESTINATAIRE_NOM', 'DESTINATAIRE_SOCIETE', 'DESTINATAIRE_ADRESSE', 'DESTINATAIRE_CONTACTS',
  'VEHICULE', 'DATES_PRESTATION', 'DISTANCE_KM',
  'DEVIS_LINES_TR', 'TOTAL_BRUT', 'REMISE', 'TOTAL_HT', 'TVA', 'TAUX_TVA',
  'MONTANT', 'PRIX_NET', 'ACOMPTE', 'CONDITION_ACOMPTE', 'RESTE_A_PAYER',
  'REFERENCE_DEVIS', 'NOTES', 'CONDITIONS_PAIEMENT',
  'LOGO_IMG', 'BANDE_ENTETE', 'LOGO_BIG', 'LOGO_SMALL'
];

export const DEFAULT_TEMPLATE_ID = '__default__';

// Chemin vers /public/icons/logo_devis.png (ou chaîne data:image/...;base64,...)
export const DEFAULT_RBE_LOGO = '/icons/logo_devis.png';

export const DEFAULT_TEMPLATE = {
  id: DEFAULT_TEMPLATE_ID,
  name: 'Modèle standard Rétrobus',
  isBuiltIn: true,
  htmlContent: `<style>
.rbe{background:#ffffff;font-family:Inter,Arial,Helvetica,sans-serif;color:#1e293b;font-size:12.5px;max-width:800px;margin:0 auto;padding:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.rbe table{border-collapse:collapse;width:100%;}
.rbe tr,.rbe .box,.rbe .bloc-break{break-inside:avoid;page-break-inside:avoid;}
.rbe .muted{color:#64748b;font-size:11px;}
.rbe .pill{display:inline-block;padding:3px 10px;background:#fff1f2;color:#e11d48;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;}
.rbe .box{padding:13px 15px;border-radius:12px;vertical-align:top;}
.rbe .lbl{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;}
.rbe th{padding:8px 10px;font-size:10px;text-transform:uppercase;color:#64748b;background:#f8fafc;border-bottom:2px solid #e2e8f0;}
</style>
<div class="rbe">
  <table style="border-bottom:1px solid #f1f5f9;">
    <tr>
      <td style="padding-bottom:14px;vertical-align:middle;text-align:left;width:45%;">
        {{LOGO_IMG}}
      </td>
      <td style="padding-bottom:14px;text-align:right;vertical-align:middle;width:55%;">
        <div class="pill">{{TYPE_DOCUMENT}} officiel</div>
        <div style="font-size:21px;font-weight:900;color:#0f172a;white-space:nowrap;margin-top:4px;">N° {{NUM_DEVIS}}</div>
        <div class="muted">Date : <strong style="color:#334155;">{{DATE}}</strong></div>
        <div class="muted">{{ECHEANCE}}</div>
        <div class="muted">{{REFERENCE_DEVIS}}</div>
      </td>
    </tr>
  </table>

  <table class="bloc-break" style="margin:14px 0;border-collapse:separate;border-spacing:12px 0;width:calc(100% + 24px);margin-left:-12px;">
    <tr>
      <td class="box" style="width:50%;background:#f8fafc;border:1px solid #e2e8f0;">
        <div class="lbl" style="color:#94a3b8;">Émetteur</div>
        <div style="font-weight:700;color:#0f172a;margin-top:4px;">Association Rétro Bus Essonne</div>
        <div class="muted" style="font-size:11.5px;">Représentée par M. BELAIDI Waiyl (Président)</div>
        <div class="muted" style="margin-top:6px;padding-top:6px;border-top:1px solid #e2e8f0;line-height:1.5;">
          RNA : W912016571 | SIRET : 942 508 607 00010<br/>
          association.rbe@gmail.com<br/>
          07.60.82.11.62 / 07.83.26.13.07<br/>
          www.association-rbe.fr
        </div>
      </td>
      <td class="box" style="width:50%;background:#0f172a;color:#fff;">
        <div class="lbl" style="color:#fb7185;">Destinataire</div>
        <div style="font-weight:700;font-size:15px;margin-top:4px;">{{DESTINATAIRE_NOM}}</div>
        <div style="font-size:11.5px;color:#cbd5e1;font-weight:600;">{{DESTINATAIRE_SOCIETE}}</div>
        <div style="margin-top:6px;padding-top:6px;border-top:1px solid #1e293b;font-size:11px;color:#cbd5e1;line-height:1.5;white-space:pre-line;">{{DESTINATAIRE_ADRESSE}}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">{{DESTINATAIRE_CONTACTS}}</div>
      </td>
    </tr>
  </table>

  <div class="bloc-break" style="margin-bottom:14px;padding:10px 14px;border-radius:12px;background:#fff1f2;border-left:4px solid #f43f5e;">
    <div class="lbl" style="color:#e11d48;">Objet du {{TYPE_DOCUMENT}}</div>
    <div style="font-size:13.5px;font-weight:700;color:#0f172a;margin-top:2px;">{{OBJET}}</div>
    <div class="muted" style="margin-top:2px;">{{VEHICULE}} {{DATES_PRESTATION}}</div>
  </div>

  <table style="margin-bottom:14px;">
    <thead>
      <tr>
        <th style="width:65px;text-align:center;">Qté</th>
        <th style="text-align:left;">Désignation des prestations</th>
        <th style="width:105px;text-align:right;">P.U.</th>
        <th style="width:115px;text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>{{DEVIS_LINES_TR}}</tbody>
  </table>

  <table class="bloc-break" style="margin-bottom:14px;border-top:1px solid #f1f5f9;">
    <tr>
      <td style="padding-top:12px;vertical-align:top;padding-right:16px;" class="muted">
        <strong>T.V.A ({{TAUX_TVA}})</strong> — article 293 B du Code Général des Impôts. Association régie par la Loi 1901 – Non destinée à être lucrative.
      </td>
      <td style="padding-top:12px;width:280px;vertical-align:top;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 14px;">
          <table style="font-size:11.5px;color:#475569;">
            <tr><td style="padding:2px 0;">Total brut :</td><td style="text-align:right;">{{TOTAL_BRUT}}</td></tr>
            <tr><td style="padding:2px 0;">Remise :</td><td style="text-align:right;">{{REMISE}}</td></tr>
            <tr><td style="padding:2px 0;">Montant Total :</td><td style="text-align:right;">{{TOTAL_HT}}</td></tr>
            <tr><td style="padding:2px 0;">TVA :</td><td style="text-align:right;">{{TVA}}</td></tr>
            <tr><td colspan="2" style="border-top:1px solid #e2e8f0;padding-top:5px;"></td></tr>
            <tr style="font-size:15px;font-weight:900;color:#0f172a;"><td>Net à payer :</td><td style="text-align:right;color:#e11d48;">{{MONTANT}}</td></tr>
            <tr><td style="padding-top:5px;">Acompte :</td><td style="text-align:right;padding-top:5px;">{{ACOMPTE}}</td></tr>
            <tr style="font-weight:700;"><td>Reste à payer :</td><td style="text-align:right;">{{RESTE_A_PAYER}}</td></tr>
          </table>
        </div>
      </td>
    </tr>
  </table>

  <div class="bloc-break" style="padding:11px 14px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;font-size:10.5px;color:#78350f;margin-bottom:14px;line-height:1.5;">
    <strong>Conditions de confirmation &amp; d'acompte</strong><br/>
    {{CONDITION_ACOMPTE}} Le RIB de l'association sera transmis après retour du présent document signé, précédé de la mention manuscrite <em>« Bon pour accord »</em>.
    <div style="white-space:pre-line;margin-top:4px;">{{NOTES}}</div>
    <div style="margin-top:3px;">{{CONDITIONS_PAIEMENT}}</div>
  </div>

  <table class="bloc-break" style="border-collapse:separate;border-spacing:12px 0;width:calc(100% + 24px);margin-left:-12px;">
    <tr>
      <td class="box" style="width:50%;border:1px solid #e2e8f0;background:#f8fafc;height:86px;">
        <div style="font-size:11.5px;font-weight:700;">Pour l'Association Rétro Bus Essonne</div>
        <div class="muted">Signature &amp; Tampon officiel</div>
      </td>
      <td class="box" style="width:50%;border:1px dashed #cbd5e1;height:86px;">
        <div style="font-size:11.5px;font-weight:700;">Pour le Client ({{DESTINATAIRE_NOM}})</div>
        <div class="muted">Mention manuscrite « Bon pour accord » + Date + Signature</div>
      </td>
    </tr>
  </table>

  <div class="bloc-break muted" style="margin-top:16px;padding-top:10px;border-top:1px solid #f1f5f9;text-align:center;font-size:10px;line-height:1.4;">
    Association Rétro Bus Essonne - RNA W912016571 - SIRET 942 508 607 00010<br/>
    Document généré via la plateforme URBEX
  </div>
</div>`
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const formatEUR = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const lineTotal = (line) => {
  const gross = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
  const pct = Math.min(100, Math.max(0, Number(line.discountPct) || 0));
  return round2(gross * (1 - pct / 100));
};

/**
 * pricing = { lines, discount: {mode:'percent'|'amount', value}, taxRate, deposit }
 */
export const computeTotals = (pricing = {}) => {
  const lines = pricing.lines || [];
  const subtotal = round2(lines.reduce((sum, l) => sum + lineTotal(l), 0));
  const d = pricing.discount || {};
  const rawDiscount = d.mode === 'amount'
    ? Number(d.value) || 0
    : subtotal * ((Number(d.value) || 0) / 100);
  const discountAmount = round2(Math.min(subtotal, Math.max(0, rawDiscount)));
  const netHT = round2(subtotal - discountAmount);
  const taxRate = Number(pricing.taxRate) || 0;
  const taxAmount = round2((netHT * taxRate) / 100);
  const total = round2(netHT + taxAmount);
  const deposit = round2(Math.min(total, Math.max(0, Number(pricing.deposit) || 0)));
  return {
    subtotal,
    discountAmount,
    netHT,
    taxRate,
    taxAmount,
    total,
    deposit,
    remaining: round2(total - deposit)
  };
};

const logoSrc = (logo) => {
  if (!logo) return '';
  const cleaned = String(logo).trim();

  if (/^data:image\/[a-zA-Z0-9+.-]+;base64,/.test(cleaned)) {
    return cleaned.replace(/\s+/g, '');
  }

  if (cleaned.startsWith('data:')) {
    const base64Part = cleaned.split(',').pop()?.replace(/\s+/g, '') || '';
    return base64Part ? `data:image/png;base64,${base64Part}` : '';
  }

  if (/^(https?:\/\/|\/|\.\/|\.\.\/)/.test(cleaned)) {
    if (cleaned.startsWith('/') && typeof window !== 'undefined' && window.location?.origin) {
      try {
        return new URL(cleaned, window.location.origin).href;
      } catch {
        return cleaned;
      }
    }
    return cleaned;
  }

  const compactBase64 = cleaned.replace(/\s+/g, '');
  return compactBase64 ? `data:image/png;base64,${compactBase64}` : '';
};

const formatDateFR = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR');
};

export const buildTemplateData = (doc = {}) => {
  const totals = computeTotals(doc.pricing);
  const isInvoice = doc.type === 'INVOICE';
  const vehicle = doc.pricing?.vehicle;
  const trip = doc.pricing?.trip;
  const lines = doc.pricing?.lines || [];

  const rows = lines.map((l) => {
    const pct = Number(l.discountPct) || 0;
    const desc = `${escapeHtml(l.description)}${pct ? ` <em style="color:#718096;">(remise ${pct}%)</em>` : ''}`;
    return `<tr>
      <td style="padding:8px 8px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;">${escapeHtml(l.quantity)}${l.unit ? ` <span style="color:#94a3b8;font-size:10px;">${escapeHtml(l.unit)}</span>` : ''}</td>
      <td style="padding:8px 8px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#0f172a;">${desc}</td>
      <td style="padding:8px 8px;border-bottom:1px solid #f1f5f9;text-align:right;">${formatEUR(l.unitPrice)}</td>
      <td style="padding:8px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;">${formatEUR(lineTotal(l))}</td>
    </tr>`;
  }).join('');

  return {
    TYPE_DOCUMENT: isInvoice ? 'Facture' : 'Devis',
    NUM_DEVIS: doc.number || '(auto)',
    NUM_DOCUMENT: doc.number || '(auto)',
    OBJET: doc.title || '',
    DATE: formatDateFR(doc.date),
    ECHEANCE: doc.dueDate ? `${isInvoice ? 'Échéance' : "Valable jusqu'au"} : ${formatDateFR(doc.dueDate)}` : '',
    DESTINATAIRE_NOM: doc.clientName || '',
    DESTINATAIRE_SOCIETE: doc.clientCompany || '',
    DESTINATAIRE_ADRESSE: doc.clientAddress || '',
    DESTINATAIRE_CONTACTS: doc.clientContacts || '',
    VEHICULE: vehicle ? `Véhicule : ${vehicle.label}` : '',
    DATES_PRESTATION: vehicle?.startDate
      ? `— du ${formatDateFR(vehicle.startDate)}${vehicle.endDate ? ` au ${formatDateFR(vehicle.endDate)}` : ''}`
      : '',
    DISTANCE_KM: trip?.distanceKm ? `${Number(trip.distanceKm).toFixed(1)} km` : '',
    TOTAL_BRUT: formatEUR(totals.subtotal),
    REMISE: totals.discountAmount ? `- ${formatEUR(totals.discountAmount)}` : formatEUR(0),
    TOTAL_HT: formatEUR(totals.netHT),
    TVA: formatEUR(totals.taxAmount),
    TAUX_TVA: totals.taxRate ? `${totals.taxRate}%` : 'non applicable',
    MONTANT: formatEUR(totals.total),
    PRIX_NET: formatEUR(totals.total),
    ACOMPTE: formatEUR(totals.deposit),
    RESTE_A_PAYER: formatEUR(totals.remaining),
    CONDITION_ACOMPTE: totals.deposit > 0
      ? `En cas de validation, un acompte de ${totals.total ? Math.round((totals.deposit / totals.total) * 100) : 0} % (soit ${formatEUR(totals.deposit)}) devra être versé par virement bancaire pour sécuriser l'opération.`
      : '',
    REFERENCE_DEVIS: doc.sourceQuoteNumber ? `Réf. devis ${doc.sourceQuoteNumber}` : '',
    NOTES: doc.notes || '',
    CONDITIONS_PAIEMENT: doc.paymentTerms ? `Paiement à ${doc.paymentTerms} jours.` : '',
    DEVIS_LINES_TR: rows
  };
};

const RAW_HTML_KEYS = new Set(['DEVIS_LINES_TR', 'BANDE_ENTETE', 'LOGO_IMG']);

/** Rend le HTML interne du document (sans <html>/<body>) avec logo ancré en haut à gauche. */
export const renderTemplate = (template = {}, doc = {}) => {
  const rawHtml = template?.htmlContent || DEFAULT_TEMPLATE.htmlContent;
  const resolvedLogo = logoSrc(template?.logoBig || template?.logoSmall || DEFAULT_RBE_LOGO);

  const logoImgHtml = resolvedLogo
    ? `<img src="${escapeHtml(resolvedLogo)}" alt="Logo Association Rétro Bus Essonne" style="display:block;max-width:360px;max-height:84px;width:auto;height:auto;object-fit:contain;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';" /><div style="display:none;font-size:18px;font-weight:800;color:#0f172a;">RétroBus Essonne</div>`
    : `<div style="font-size:18px;font-weight:800;color:#0f172a;">RétroBus Essonne</div><div style="color:#64748b;font-size:11px;">« Parce que collectionner devient un sixième sens ! »</div>`;

  const data = {
    ...buildTemplateData(doc),
    LOGO_IMG: logoImgHtml,
    BANDE_ENTETE: logoImgHtml,
    LOGO_BIG: resolvedLogo,
    LOGO_SMALL: resolvedLogo
  };

  const cleanedHtml = rawHtml.replace(
    /<img\b[^>]*\{\{\s*(LOGO_BIG|LOGO_SMALL)\s*\}\}[^>]*>/gi,
    (tag) => (resolvedLogo ? tag : '')
  );

  return cleanedHtml.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (!(key in data)) return match;
    return RAW_HTML_KEYS.has(key) ? data[key] : escapeHtml(data[key]);
  });
};

/** Génère la page HTML complète d'aperçu. */
export const renderPreviewHtml = (template = {}, doc = {}, { wrapped = true } = {}) => {
  const bodyContent = renderTemplate(template, doc);
  const sheetHtml = wrapped
    ? `<div class="sheet">${bodyContent}</div>`
    : bodyContent;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Aperçu ${escapeHtml(doc.type === 'INVOICE' ? 'Facture' : 'Devis')} — URBEX</title>
  <style>
    body { margin: 0; padding: 24px; background: #e2e8f0; font-family: Inter, Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet { background: #ffffff; max-width: 840px; margin: 0 auto; padding: 20px; border-radius: 14px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
    @page { size: A4 portrait; margin: 8mm 10mm; }
    @media print {
      body { padding: 0; background: #ffffff; }
      .sheet { max-width: none; padding: 0; border-radius: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  ${sheetHtml}
</body>
</html>`;
};

export const toPreviewDocument = (bodyHtml) =>
  renderPreviewHtml({ htmlContent: bodyHtml }, {}, { wrapped: false });

/** Ouvre la boîte d'impression (« Enregistrer en PDF ») dans un iframe sans scripts. */
export const printHtml = (bodyHtml) => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-same-origin allow-modals');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  iframe.srcdoc = toPreviewDocument(bodyHtml);
  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 60000);
  };
  document.body.appendChild(iframe);
};