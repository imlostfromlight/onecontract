const FIELD_PAT = '[\\p{L}\\p{N}_]+';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function paraText(paraXml: string): string {
  return [...paraXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join('');
}

// Extract {{placeholders}} from DOCX XML, joining paragraph text so split-run
// placeholders (where Word split {{field}} across multiple runs) are found too.
export function extractPlaceholders(xml: string): string[] {
  const found = new Set<string>();
  const re = new RegExp(`\\{\\{(${FIELD_PAT})\\}\\}`, 'gu');
  for (const para of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    for (const m of paraText(para[0]).matchAll(re)) found.add(m[1]);
  }
  return [...found].sort();
}

// Replace {{placeholders}} in DOCX XML.
// Pass 1: simple replacement (handles single-run placeholders).
// Pass 2: for paragraphs where the placeholder is split across runs,
//         merge all runs into one and fill.
export function fillText(xml: string, fields: Record<string, string>): string {
  const re = () => new RegExp(`\\{\\{(${FIELD_PAT})\\}\\}`, 'gu');

  let out = xml.replace(re(), (_, k) => k in fields ? esc(fields[k]) : `{{${k}}}`);

  out = out.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (para) => {
    const text = paraText(para);
    if (!text.includes('{{')) return para;

    let anyFilled = false;
    const filled = text.replace(re(), (_, k) => {
      if (!(k in fields)) return `{{${k}}}`;
      anyFilled = true;
      return fields[k];
    });
    if (!anyFilled) return para;

    const pPr = para.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? '';
    const rPr = para.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? '';
    const attrs = (para.match(/^<w:p([^>]*)>/) ?? ['', ''])[1];
    return `<w:p${attrs}>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(filled)}</w:t></w:r></w:p>`;
  });

  return out;
}

export async function processDocx(
  arrayBuffer: ArrayBuffer,
  fields: Record<string, string>,
): Promise<{ buffer: ArrayBuffer; placeholders: string[] }> {
  const { default: PizZip } = await import('pizzip');
  const zip = new PizZip(arrayBuffer);
  const placeholders: string[] = [];

  const docXml = zip.file('word/document.xml');
  if (docXml) {
    let content = docXml.asText();
    placeholders.push(...extractPlaceholders(content));
    if (Object.keys(fields).length > 0) content = fillText(content, fields);
    zip.file('word/document.xml', content);
  }

  for (const f of Object.keys(zip.files).filter(
    f => f.startsWith('word/header') || f.startsWith('word/footer'),
  )) {
    const entry = zip.file(f);
    if (entry) {
      let content = entry.asText();
      placeholders.push(...extractPlaceholders(content));
      if (Object.keys(fields).length > 0) content = fillText(content, fields);
      zip.file(f, content);
    }
  }

  return {
    buffer: zip.generate({ type: 'arraybuffer' }),
    placeholders: [...new Set(placeholders)].sort(),
  };
}

export async function textToDocx(text: string): Promise<ArrayBuffer> {
  const { default: PizZip } = await import('pizzip');
  const zip = new PizZip();

  const bodyXml = text
    .split('\n')
    .map(line => `<w:p><w:r><w:t xml:space="preserve">${esc(line)}</w:t></w:r></w:p>`)
    .join('');

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}<w:sectPr/></w:body></w:document>`);

  return zip.generate({ type: 'arraybuffer' });
}

export async function docxToText(arrayBuffer: ArrayBuffer): Promise<string> {
  const { default: PizZip } = await import('pizzip');
  const zip = new PizZip(arrayBuffer);
  const docXml = zip.file('word/document.xml');
  if (!docXml) return '';
  let xml = docXml.asText();
  xml = xml.replace(/<\/w:p>/g, '\n');
  xml = xml.replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, '$1');
  xml = xml.replace(/<[^>]+>/g, '');
  return xml
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n').trim();
}
