export const AG_DOCUMENT_ACCEPT = '.txt,.md,.markdown,.csv,.rtf,.html,.htm,.xml,.json,.docx,.odt,.pdf,text/*';

const ARTICLE_LINE = /^\s*(?:#+\s*)?(?:\*\*)?\s*art(?:icle)?\.?\s*(?:premier|1er|\d+)/i;

const stripHtml = (html) => String(html)
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
  .replace(/<\/(p|div|h[1-6]|li|tr|text:p|text:h)>|<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

const stripRtf = (rtf) => String(rtf)
  .replace(/\\'([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  .replace(/\\par[d]?/g, '\n')
  .replace(/\\[a-z]+-?\d* ?/gi, '')
  .replace(/[{}]/g, '');

async function readPdf(file) {
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const content = await (await pdf.getPage(number)).getTextContent();
    let lastY = null;
    let line = '';
    const lines = [];
    for (const item of content.items) {
      const y = item.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(line); line = ''; }
      line += item.str;
      if (item.hasEOL) { lines.push(line); line = ''; lastY = null; } else { lastY = y; }
    }
    lines.push(line);
    pages.push(lines.join('\n'));
  }
  return pages.join('\n');
}

async function readDocx(file) {
  const mammoth = await import('mammoth/mammoth.browser');
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

async function readOdt(file) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  return stripHtml(await zip.file('content.xml').async('string'));
}

export async function extractDocumentText(file) {
  const name = file.name.toLowerCase();
  let text;
  if (name.endsWith('.pdf')) text = await readPdf(file);
  else if (name.endsWith('.docx')) text = await readDocx(file);
  else if (name.endsWith('.odt')) text = await readOdt(file);
  else if (name.endsWith('.doc')) throw new Error('Le format .doc ancien n\'est pas lisible : enregistrez le fichier en .docx ou .pdf.');
  else if (/\.html?$|\.xml$/.test(name)) text = stripHtml(await file.text());
  else if (name.endsWith('.rtf')) text = stripRtf(await file.text());
  else text = await file.text();
  return text.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Titre = première ligne non vide avant le premier article (ex. « Règlement intérieur »).
export function detectTitle(text, fileName = '') {
  for (const raw of String(text).split('\n')) {
    const line = raw.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
    if (!line) continue;
    if (ARTICLE_LINE.test(line)) break;
    if (line.length <= 120) return line;
    break;
  }
  return fileName.replace(/\.[^.]+$/, '');
}

export function countArticles(text) {
  return splitArticles(text).filter((article) => article.label !== 'Texte intégral' && article.label !== 'Préambule').length;
}

// Même règle de découpe que le serveur (ag.routes.js) ; sert à l'aperçu éditable article par article.
const ARTICLE_HEADING = /^\s*(?:#+\s*)?(?:\*\*)?\s*(art(?:icle)?\.?\s*(?:premier|1er|\d+[a-z]?(?:[.-]\d+)*)\b[^\n]*)$/i;

export function splitArticles(text) {
  const articles = [];
  const preamble = [];
  let current = null;
  for (const line of String(text || '').replace(/\r\n?/g, '\n').split('\n')) {
    const match = line.match(ARTICLE_HEADING);
    if (match) {
      if (current) articles.push(current);
      current = { label: match[1].replace(/\*\*/g, '').trim().slice(0, 200), body: [] };
    } else if (current) current.body.push(line);
    else preamble.push(line);
  }
  if (current) articles.push(current);
  const result = articles.map((article) => ({ label: article.label, body: article.body.join('\n').trim() }));
  const intro = preamble.join('\n').trim();
  if (!result.length) return intro ? [{ label: 'Texte intégral', body: intro }] : [];
  if (intro) result.unshift({ label: 'Préambule', body: intro });
  return result;
}
