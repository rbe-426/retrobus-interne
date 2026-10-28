/**
 * Moteur de template balisé pour devis / factures + calcul des totaux.
 *
 * Balises disponibles ({{BALISE}}) :
 *  TYPE_DOCUMENT, NUM_DEVIS (alias NUM_DOCUMENT), OBJET, DATE, ECHEANCE,
 *  DESTINATAIRE_NOM, DESTINATAIRE_SOCIETE, DESTINATAIRE_ADRESSE, DESTINATAIRE_CONTACTS,
 *  VEHICULE, DATES_PRESTATION, TRAJET, DISTANCE_KM,
 *  DEVIS_LINES_TR (HTML, lignes <tr>), TOTAL_BRUT, REMISE, TOTAL_HT, TVA, TAUX_TVA,
 *  MONTANT (alias PRIX_NET = total TTC), ACOMPTE, RESTE_A_PAYER, REFERENCE_DEVIS,
 *  NOTES, CONDITIONS_PAIEMENT, LOGO_BIG, LOGO_SMALL
 */

export const TEMPLATE_PLACEHOLDERS = [
  'TYPE_DOCUMENT', 'NUM_DEVIS', 'OBJET', 'DATE', 'ECHEANCE',
  'DESTINATAIRE_NOM', 'DESTINATAIRE_SOCIETE', 'DESTINATAIRE_ADRESSE', 'DESTINATAIRE_CONTACTS',
  'VEHICULE', 'DATES_PRESTATION', 'TRAJET', 'DISTANCE_KM',
  'DEVIS_LINES_TR', 'TOTAL_BRUT', 'REMISE', 'TOTAL_HT', 'TVA', 'TAUX_TVA', 'MONTANT',
  'ACOMPTE', 'RESTE_A_PAYER', 'REFERENCE_DEVIS', 'NOTES', 'CONDITIONS_PAIEMENT',
  'LOGO_BIG', 'LOGO_SMALL'
];

export const DEFAULT_TEMPLATE_ID = '__default__';

export const DEFAULT_TEMPLATE = {
  id: DEFAULT_TEMPLATE_ID,
  name: 'Modèle standard Rétrobus',
  isBuiltIn: true,
  htmlContent: `<div style="font-family: Arial, Helvetica, sans-serif; color:#1a202c; font-size:13px; padding:8px;">
  <table style="width:100%; border-collapse:collapse;">
    <tr>
      <td style="vertical-align:top;">
        <img src="{{LOGO_BIG}}" alt="" style="max-height:70px; max-width:220px;" />
        <div style="font-weight:700; font-size:15px; margin-top:6px;">Rétrobus Essonne</div>
        <div style="color:#718096;">Association loi 1901</div>
      </td>
      <td style="text-align:right; vertical-align:top;">
        <div style="font-size:24px; font-weight:700; text-transform:uppercase;">{{TYPE_DOCUMENT}}</div>
        <div>N° <strong>{{NUM_DEVIS}}</strong></div>
        <div>Date : {{DATE}}</div>
        <div>{{ECHEANCE}}</div>
        <div style="color:#718096;">{{REFERENCE_DEVIS}}</div>
      </td>
    </tr>
  </table>

  <table style="width:100%; margin-top:18px; border-collapse:collapse;">
    <tr>
      <td style="width:50%;"></td>
      <td style="border:1px solid #cbd5e0; border-radius:6px; padding:10px;">
        <div style="font-weight:700;">{{DESTINATAIRE_SOCIETE}}</div>
        <div>{{DESTINATAIRE_NOM}}</div>
        <div style="white-space:pre-line;">{{DESTINATAIRE_ADRESSE}}</div>
        <div style="color:#718096;">{{DESTINATAIRE_CONTACTS}}</div>
      </td>
    </tr>
  </table>

  <div style="margin-top:18px;"><strong>Objet :</strong> {{OBJET}}</div>
  <div style="margin-top:4px; color:#4a5568;">{{VEHICULE}} {{DATES_PRESTATION}}</div>
  <div style="color:#4a5568;">{{TRAJET}}</div>

  <table style="width:100%; margin-top:16px; border-collapse:collapse;">
    <thead>
      <tr style="background:#edf2f7;">
        <th style="text-align:left; padding:8px; border-bottom:2px solid #cbd5e0;">Désignation</th>
        <th style="text-align:right; padding:8px; border-bottom:2px solid #cbd5e0;">Qté</th>
        <th style="text-align:right; padding:8px; border-bottom:2px solid #cbd5e0;">P.U.</th>
        <th style="text-align:right; padding:8px; border-bottom:2px solid #cbd5e0;">Total</th>
      </tr>
    </thead>
    <tbody>{{DEVIS_LINES_TR}}</tbody>
  </table>

  <table style="margin-left:auto; margin-top:14px; min-width:280px; border-collapse:collapse;">
    <tr><td style="padding:4px 8px;">Total brut</td><td style="padding:4px 8px; text-align:right;">{{TOTAL_BRUT}}</td></tr>
    <tr><td style="padding:4px 8px;">Remise</td><td style="padding:4px 8px; text-align:right;">{{REMISE}}</td></tr>
    <tr><td style="padding:4px 8px;">Total HT</td><td style="padding:4px 8px; text-align:right;">{{TOTAL_HT}}</td></tr>
    <tr><td style="padding:4px 8px;">TVA ({{TAUX_TVA}})</td><td style="padding:4px 8px; text-align:right;">{{TVA}}</td></tr>
    <tr style="font-weight:700; font-size:15px; background:#edf2f7;"><td style="padding:8px;">Total à régler</td><td style="padding:8px; text-align:right;">{{MONTANT}}</td></tr>
    <tr><td style="padding:4px 8px;">Acompte</td><td style="padding:4px 8px; text-align:right;">{{ACOMPTE}}</td></tr>
    <tr><td style="padding:4px 8px;"><strong>Reste à payer</strong></td><td style="padding:4px 8px; text-align:right;"><strong>{{RESTE_A_PAYER}}</strong></td></tr>
  </table>

  <div style="margin-top:22px; white-space:pre-line;">{{NOTES}}</div>
  <div style="margin-top:12px; color:#718096; font-size:12px;">{{CONDITIONS_PAIEMENT}}</div>
</div>`
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const formatEUR = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

export const escapeHtml = (value) => String(value ?? '')
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
  const lines = (pricing.lines || []);
  const subtotal = round2(lines.reduce((sum, l) => sum + lineTotal(l), 0));
  const d = pricing.discount || {};
  const rawDiscount = d.mode === 'amount'
    ? Number(d.value) || 0
    : subtotal * ((Number(d.value) || 0) / 100);
  const discountAmount = round2(Math.min(subtotal, Math.max(0, rawDiscount)));
  const netHT = round2(subtotal - discountAmount);
  const taxRate = Number(pricing.taxRate) || 0;
  const taxAmount = round2(netHT * taxRate / 100);
  const total = round2(netHT + taxAmount);
  const deposit = round2(Math.min(total, Math.max(0, Number(pricing.deposit) || 0)));
  return { subtotal, discountAmount, netHT, taxRate, taxAmount, total, deposit, remaining: round2(total - deposit) };
};

const logoSrc = (logo) => {
  if (!logo) return '';
  return String(logo).startsWith('data:') ? logo : `data:image/png;base64,${logo}`;
};

const formatDateFR = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR');
};

export const buildTemplateData = (doc) => {
  const totals = computeTotals(doc.pricing);
  const isInvoice = doc.type === 'INVOICE';
  const vehicle = doc.pricing?.vehicle;
  const trip = doc.pricing?.trip;
  const lines = doc.pricing?.lines || [];

  const rows = lines.map((l) => {
    const pct = Number(l.discountPct) || 0;
    const desc = `${escapeHtml(l.description)}${pct ? ` <em style="color:#718096;">(remise ${pct}%)</em>` : ''}`;
    return `<tr>
      <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">${desc}</td>
      <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0; text-align:right;">${escapeHtml(l.quantity)} ${escapeHtml(l.unit || '')}</td>
      <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0; text-align:right;">${formatEUR(l.unitPrice)}</td>
      <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0; text-align:right;">${formatEUR(lineTotal(l))}</td>
    </tr>`;
  }).join('');

  const tripText = trip?.points?.length
    ? `Trajet : ${trip.points.map(p => p.label?.split(',').slice(0, 2).join(',')).join(' → ')}${trip.roundTrip ? ' (aller-retour)' : ''}`
    : '';

  return {
    TYPE_DOCUMENT: isInvoice ? 'Facture' : 'Devis',
    NUM_DEVIS: doc.number || '(auto)',
    NUM_DOCUMENT: doc.number || '(auto)',
    OBJET: doc.title,
    DATE: formatDateFR(doc.date),
    ECHEANCE: doc.dueDate ? `${isInvoice ? 'Échéance' : 'Valable jusqu\'au'} : ${formatDateFR(doc.dueDate)}` : '',
    DESTINATAIRE_NOM: doc.clientName,
    DESTINATAIRE_SOCIETE: doc.clientCompany,
    DESTINATAIRE_ADRESSE: doc.clientAddress,
    DESTINATAIRE_CONTACTS: doc.clientContacts,
    VEHICULE: vehicle ? `Véhicule : ${vehicle.label}` : '',
    DATES_PRESTATION: vehicle?.startDate
      ? `— du ${formatDateFR(vehicle.startDate)}${vehicle.endDate ? ` au ${formatDateFR(vehicle.endDate)}` : ''}`
      : '',
    TRAJET: tripText,
    DISTANCE_KM: trip?.distanceKm ? `${trip.distanceKm.toFixed(1)} km` : '',
    TOTAL_BRUT: formatEUR(totals.subtotal),
    REMISE: totals.discountAmount ? `- ${formatEUR(totals.discountAmount)}` : formatEUR(0),
    TOTAL_HT: formatEUR(totals.netHT),
    TVA: formatEUR(totals.taxAmount),
    TAUX_TVA: totals.taxRate ? `${totals.taxRate}%` : 'non applicable',
    MONTANT: formatEUR(totals.total),
    PRIX_NET: formatEUR(totals.total),
    ACOMPTE: formatEUR(totals.deposit),
    RESTE_A_PAYER: formatEUR(totals.remaining),
    REFERENCE_DEVIS: doc.sourceQuoteNumber ? `Réf. devis ${doc.sourceQuoteNumber}` : '',
    NOTES: doc.notes,
    CONDITIONS_PAIEMENT: doc.paymentTerms ? `Paiement à ${doc.paymentTerms} jours.` : '',
    DEVIS_LINES_TR: rows
  };
};

export const toPreviewDocument = (bodyHtml) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;background:#fff;}@page{margin:12mm;}</style></head><body>${bodyHtml}</body></html>`;

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

const RAW_HTML_KEYS = new Set(['DEVIS_LINES_TR']);

/** Rend le HTML final : toutes les valeurs sont échappées sauf les lignes d'articles (générées ici). */
export const renderTemplate = (template, doc) => {
  const html = template?.htmlContent || DEFAULT_TEMPLATE.htmlContent;
  const data = buildTemplateData(doc);
  const logoBig = logoSrc(template?.logoBig);
  const logoSmall = logoSrc(template?.logoSmall);

  return html.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (key === 'LOGO_BIG') return escapeHtml(logoBig);
    if (key === 'LOGO_SMALL') return escapeHtml(logoSmall);
    if (!(key in data)) return match;
    return RAW_HTML_KEYS.has(key) ? data[key] : escapeHtml(data[key]);
  });
};
