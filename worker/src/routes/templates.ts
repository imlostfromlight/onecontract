import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middleware/auth';
import type { Env, Variables } from '../types';

const templates = new Hono<{ Bindings: Env; Variables: Variables }>();

function uuid() { return crypto.randomUUID(); }

// Extract {{placeholder}} names from text
function extractPlaceholders(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/\{\{(\w+)\}\}/g)) found.add(m[1]);
  return [...found].sort();
}

// Simple placeholder replacement in text
function fillText(text: string, fields: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => fields[k] ?? `{{${k}}}`);
}

// For DOCX: we replace in the XML directly (basic approach for Workers)
async function processDocx(
  arrayBuffer: ArrayBuffer,
  fields: Record<string, string>,
): Promise<{ buffer: ArrayBuffer; placeholders: string[] }> {
  // Unzip the DOCX (it's a zip file)
  const { default: PizZip } = await import('pizzip');
  const zip = new PizZip(arrayBuffer);

  const placeholders: string[] = [];

  // Process word/document.xml
  const docXml = zip.file('word/document.xml');
  if (docXml) {
    let content = docXml.asText();
    placeholders.push(...extractPlaceholders(content));
    if (Object.keys(fields).length > 0) {
      content = fillText(content, fields);
    }
    zip.file('word/document.xml', content);
  }

  // Process headers and footers
  const files = Object.keys(zip.files).filter(
    f => f.startsWith('word/header') || f.startsWith('word/footer')
  );
  for (const f of files) {
    const entry = zip.file(f);
    if (entry) {
      let content = entry.asText();
      placeholders.push(...extractPlaceholders(content));
      if (Object.keys(fields).length > 0) {
        content = fillText(content, fields);
      }
      zip.file(f, content);
    }
  }

  const output = zip.generate({ type: 'arraybuffer' });
  return { buffer: output, placeholders: [...new Set(placeholders)].sort() };
}

// GET /api/documents/templates/
templates.get('/', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN'), async (c) => {
  const user = c.get('user');
  const rows = user.role === 'SUPERADMIN'
    ? (await c.env.DB.prepare('SELECT * FROM templates ORDER BY created_at DESC').all<any>()).results
    : (await c.env.DB.prepare(
        'SELECT * FROM templates WHERE organization_id = ? ORDER BY created_at DESC'
      ).bind(user.id).all<any>()).results;

  return c.json(rows.map(t => ({ ...t, template_fields: JSON.parse(t.template_fields || '[]') })));
});

// POST /api/documents/templates/
templates.post('/', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN'), async (c) => {
  const user = c.get('user');
  const form = await c.req.formData();
  const file = form.get('file') as File | null;
  const title = (form.get('title') as string | null) || file?.name || 'Untitled';
  const description = (form.get('description') as string | null) || '';

  if (!file) return c.json({ detail: 'file is required' }, 400);

  const key = `templates/${uuid()}/${file.name}`;
  const arrayBuffer = await file.arrayBuffer();

  let placeholders: string[] = [];
  let finalBuffer = arrayBuffer;

  if (file.name.toLowerCase().endsWith('.docx')) {
    const result = await processDocx(arrayBuffer, {});
    placeholders = result.placeholders;
    finalBuffer = result.buffer;
  }

  await c.env.BUCKET.put(key, finalBuffer, {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  const res = await c.env.DB.prepare(
    'INSERT INTO templates (organization_id, title, description, file_key, file_name, template_fields) VALUES (?,?,?,?,?,?)'
  ).bind(user.id, title, description, key, file.name, JSON.stringify(placeholders)).run();

  const tmpl = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?')
    .bind(res.meta.last_row_id).first<any>();
  return c.json({ ...tmpl, template_fields: JSON.parse(tmpl.template_fields || '[]') }, 201);
});

// DELETE /api/documents/templates/:id
templates.delete('/:id', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN'), async (c) => {
  const user = c.get('user');
  const tmpl = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?')
    .bind(c.req.param('id')).first<any>();
  if (!tmpl) return c.json({ detail: 'Not found' }, 404);
  if (tmpl.organization_id !== user.id && user.role !== 'SUPERADMIN')
    return c.json({ detail: 'Permission denied' }, 403);

  await c.env.BUCKET.delete(tmpl.file_key).catch(() => {});
  await c.env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(tmpl.id).run();
  return c.body(null, 204);
});

// POST /api/documents/templates/:id/use
templates.post('/:id/use', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN'), async (c) => {
  const user = c.get('user');
  const tmpl = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?')
    .bind(c.req.param('id')).first<any>();
  if (!tmpl) return c.json({ detail: 'Not found' }, 404);

  const body = await c.req.json<{ title?: string; fields?: Record<string, string> }>();
  const title = body.title || tmpl.title;
  const fields = body.fields || {};

  // Download template file from R2
  const obj = await c.env.BUCKET.get(tmpl.file_key);
  if (!obj) return c.json({ detail: 'Template file not found in storage' }, 404);

  const arrayBuffer = await obj.arrayBuffer();
  let finalBuffer = arrayBuffer;

  if (tmpl.file_name.toLowerCase().endsWith('.docx')) {
    const result = await processDocx(arrayBuffer, fields);
    finalBuffer = result.buffer;
  }

  const docUuid = uuid();
  const key = `documents/${docUuid}/${tmpl.file_name}`;
  await c.env.BUCKET.put(key, finalBuffer, {
    httpMetadata: { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  });

  const res = await c.env.DB.prepare(
    'INSERT INTO documents (user_id, template_id, uuid, title, file_key, file_name) VALUES (?,?,?,?,?,?)'
  ).bind(user.id, tmpl.id, docUuid, title, key, tmpl.file_name).run();

  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?')
    .bind(res.meta.last_row_id).first<any>();

  const sigs = (await c.env.DB.prepare(
    'SELECT * FROM document_signatures WHERE document_id = ?'
  ).bind(doc.id).all<any>()).results;

  return c.json({ ...doc, signatures: sigs, signature_count: 0 }, 201);
});

// GET template file proxy
templates.get('/:id/file', requireAuth, async (c) => {
  const tmpl = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?')
    .bind(c.req.param('id')).first<any>();
  if (!tmpl) return c.json({ detail: 'Not found' }, 404);

  const obj = await c.env.BUCKET.get(tmpl.file_key);
  if (!obj) return c.json({ detail: 'File not found' }, 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Content-Disposition', `attachment; filename="${tmpl.file_name}"`);
  return new Response(obj.body, { headers });
});

export default templates;
