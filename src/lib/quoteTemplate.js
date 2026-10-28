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
  'ACOMPTE', 'CONDITION_ACOMPTE', 'RESTE_A_PAYER', 'REFERENCE_DEVIS', 'NOTES', 'CONDITIONS_PAIEMENT',
  'LOGO_BIG', 'LOGO_SMALL'
];

export const DEFAULT_TEMPLATE_ID = '__default__';

export const DEFAULT_TEMPLATE = {
  id: DEFAULT_TEMPLATE_ID,
  name: 'Modèle standard Rétrobus',
  isBuiltIn: true,
  htmlContent: `<style>
.rbe{font-family:Inter,Arial,Helvetica,sans-serif;color:#1e293b;font-size:13px;max-width:800px;margin:0 auto;padding:8px;}
.rbe table{border-collapse:collapse;width:100%;}
.rbe .muted{color:#64748b;font-size:11px;}
.rbe .pill{display:inline-block;padding:3px 12px;background:#fff1f2;color:#e11d48;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;}
.rbe .box{padding:16px;border-radius:12px;vertical-align:top;}
.rbe .lbl{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;}
.rbe th{padding:10px 12px;font-size:10px;text-transform:uppercase;color:#64748b;background:#f8fafc;border-bottom:2px solid #e2e8f0;}
</style>
<div class="rbe">
  <table style="border-bottom:1px solid #f1f5f9;">
    <tr>
      <td style="padding-bottom:20px;vertical-align:middle;">
        <img src="{{LOGO_BIG}}" alt="Association Rétro Bus Essonne" style="max-height:48px;max-width:220px;" />
        <div class="muted" style="margin-top:6px;font-weight:600;">Patrimoine roulant &amp; Événementiel</div>
      </td>
      <td style="padding-bottom:20px;text-align:right;vertical-align:middle;">
        <div class="pill">{{TYPE_DOCUMENT}} officiel</div>
        <div style="font-size:24px;font-weight:900;color:#0f172a;">N° {{NUM_DEVIS}}</div>
        <div class="muted">Date : <strong style="color:#334155;">{{DATE}}</strong></div>
        <div class="muted">{{ECHEANCE}}</div>
        <div class="muted">{{REFERENCE_DEVIS}}</div>
      </td>
    </tr>
  </table>

  <table style="margin:24px 0;border-collapse:separate;border-spacing:12px 0;width:calc(100% + 24px);margin-left:-12px;">
    <tr>
      <td class="box" style="width:50%;background:#f8fafc;border:1px solid #f1f5f9;">
        <div class="lbl" style="color:#94a3b8;">Émetteur</div>
        <div style="font-weight:700;color:#0f172a;margin-top:6px;">Association Rétro Bus Essonne</div>
        <div class="muted" style="font-size:12px;">Représentée par M. BELAIDI Waiyl (Président)</div>
        <div class="muted" style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;line-height:1.6;">
          RNA : W912016571 | SIRET : 942 508 607 00010<br/>association.rbe@gmail.com<br/>07.60.82.11.62 / 07.83.26.13.07<br/>www.association-rbe.fr
        </div>
      </td>
      <td class="box" style="width:50%;background:#0f172a;color:#fff;">
        <div class="lbl" style="color:#fb7185;">Destinataire</div>
        <div style="font-weight:700;font-size:16px;margin-top:6px;">{{DESTINATAIRE_NOM}}</div>
        <div style="font-size:12px;color:#cbd5e1;font-weight:600;">{{DESTINATAIRE_SOCIETE}}</div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #1e293b;font-size:11px;color:#cbd5e1;line-height:1.6;white-space:pre-line;">{{DESTINATAIRE_ADRESSE}}</div>
        <div style="font-size:11px;color:#94a3b8;">{{DESTINATAIRE_CONTACTS}}</div>
      </td>
    </tr>
  </table>

  <div style="margin-bottom:24px;padding:12px 16px;border-radius:12px;background:#fff1f2;border-left:4px solid #f43f5e;">
    <div class="lbl" style="color:#e11d48;">Objet du {{TYPE_DOCUMENT}}</div>
    <div style="font-size:14px;font-weight:600;color:#0f172a;">{{OBJET}}</div>
    <div class="muted">{{VEHICULE}} {{DATES_PRESTATION}}</div>
    <div class="muted">{{TRAJET}}</div>
  </div>

  <table style="margin-bottom:24px;">
    <thead>
      <tr>
        <th style="width:60px;text-align:center;">Qté</th>
        <th style="text-align:left;">Désignation des prestations</th>
        <th style="width:110px;text-align:right;">P.U. HT</th>
        <th style="width:120px;text-align:right;">Total HT</th>
      </tr>
    </thead>
    <tbody>{{DEVIS_LINES_TR}}</tbody>
  </table>

  <table style="margin-bottom:24px;border-top:1px solid #f1f5f9;">
    <tr>
      <td style="padding-top:16px;vertical-align:top;" class="muted">
        <strong>T.V.A ({{TAUX_TVA}})</strong> — si non applicable : article 239 B du Code Général des Impôts. Association régie par la Loi 1901 – Non destinée à être lucrative.
      </td>
      <td style="padding-top:16px;width:290px;">
        <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;padding:12px 16px;">
          <table style="font-size:12px;color:#475569;">
            <tr><td style="padding:2px 0;">Total brut :</td><td style="text-align:right;">{{TOTAL_BRUT}}</td></tr>
            <tr><td style="padding:2px 0;">Remise :</td><td style="text-align:right;">{{REMISE}}</td></tr>
            <tr><td style="padding:2px 0;">Montant Total HT :</td><td style="text-align:right;">{{TOTAL_HT}}</td></tr>
            <tr><td style="padding:2px 0;">TVA :</td><td style="text-align:right;">{{TVA}}</td></tr>
            <tr><td colspan="2" style="border-top:1px solid #e2e8f0;padding-top:6px;"></td></tr>
            <tr style="font-size:16px;font-weight:900;color:#0f172a;"><td>Net à payer :</td><td style="text-align:right;color:#e11d48;">{{MONTANT}}</td></tr>
            <tr><td style="padding-top:6px;">Acompte :</td><td style="text-align:right;padding-top:6px;">{{ACOMPTE}}</td></tr>
            <tr style="font-weight:700;"><td>Reste à payer :</td><td style="text-align:right;">{{RESTE_A_PAYER}}</td></tr>
          </table>
        </div>
      </td>
    </tr>
  </table>

  <div style="padding:14px 16px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;font-size:11px;color:#78350f;margin-bottom:24px;line-height:1.6;">
    <strong>Conditions de confirmation &amp; d'acompte</strong><br/>
    {{CONDITION_ACOMPTE}} Le RIB de l'association sera transmis après retour du présent document signé, précédé de la mention manuscrite <em>« Bon pour accord »</em>.
    <div style="white-space:pre-line;margin-top:6px;">{{NOTES}}</div>
    <div style="margin-top:4px;">{{CONDITIONS_PAIEMENT}}</div>
  </div>

  <table style="border-collapse:separate;border-spacing:12px 0;width:calc(100% + 24px);margin-left:-12px;">
    <tr>
      <td class="box" style="width:50%;border:1px solid #e2e8f0;background:#f8fafc;height:110px;">
        <div style="font-size:12px;font-weight:700;">Pour l'Association Rétro Bus Essonne</div>
        <div class="muted">Signature &amp; Tampon officiel</div>
      </td>
      <td class="box" style="width:50%;border:1px dashed #cbd5e1;height:110px;">
        <div style="font-size:12px;font-weight:700;">Pour le Client ({{DESTINATAIRE_NOM}})</div>
        <div class="muted">Mention manuscrite « Bon pour accord » + Date + Signature</div>
      </td>
    </tr>
  </table>

  <div class="muted" style="margin-top:32px;padding-top:16px;border-top:1px solid #f1f5f9;text-align:center;font-size:10px;">
    Association Rétro Bus Essonne - RNA W912016571 - SIRET 942 508 607 00010<br/>Document généré via la plateforme URBEX
  </div>
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

const DEFAULT_LOGO = '/rbe-classique.png';

const logoSrc = (logo) => {
  if (!logo) return typeof window !== 'undefined' ? `${window.location.origin}${DEFAULT_LOGO}` : DEFAULT_LOGO;
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
      <td style="padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:center; font-weight:600;">${escapeHtml(l.quantity)}${l.unit ? ` <span style="color:#94a3b8;font-size:10px;">${escapeHtml(l.unit)}</span>` : ''}</td>
      <td style="padding:10px 8px; border-bottom:1px solid #f1f5f9; font-weight:600; color:#0f172a;">${desc}</td>
      <td style="padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:right;">${formatEUR(l.unitPrice)}</td>
      <td style="padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:right; font-weight:700;">${formatEUR(lineTotal(l))}</td>
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
    CONDITION_ACOMPTE: totals.deposit > 0
      ? `En cas de validation, un acompte de ${totals.total ? Math.round((totals.deposit / totals.total) * 100) : 0} % (soit ${formatEUR(totals.deposit)}) devra être versé par virement bancaire pour sécuriser l'opération.`
      : '',
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
