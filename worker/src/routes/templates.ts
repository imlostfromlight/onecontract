import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middleware/auth';
import { processDocx, textToDocx, docxToText } from '../utils/docx';
import type { Env, Variables } from '../types';

const templates = new Hono<{ Bindings: Env; Variables: Variables }>();

function uuid() { return crypto.randomUUID(); }

function getOrgId(user: any): string {
  return user.role === 'MANAGER' ? (user.organization_id || user.id) : user.id;
}

// GET /api/documents/templates/
templates.get('/', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN', 'MANAGER'), async (c) => {
  const user = c.get('user');
  const rows = user.role === 'SUPERADMIN'
    ? (await c.env.DB.prepare('SELECT * FROM templates ORDER BY created_at DESC').all<any>()).results
    : (await c.env.DB.prepare(
        'SELECT * FROM templates WHERE organization_id = ? ORDER BY created_at DESC'
      ).bind(getOrgId(user)).all<any>()).results;

  return c.json(rows.map(t => ({ ...t, template_fields: JSON.parse(t.template_fields || '[]') })));
});

// POST /api/documents/templates/ — accepts file upload OR plain-text content
templates.post('/', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN', 'MANAGER'), async (c) => {
  const user = c.get('user');
  const form = await c.req.formData();
  const file = form.get('file') as File | null;
  const content = form.get('content') as string | null;
  const title = (form.get('title') as string | null) || file?.name || 'Шаблон';
  const description = (form.get('description') as string | null) || '';

  if (!file && !content) return c.json({ detail: 'file or content is required' }, 400);

  const fileName = file ? file.name : `${title}.docx`;
  const key = `templates/${uuid()}/${fileName}`;

  let finalBuffer: ArrayBuffer;
  let placeholders: string[] = [];

  if (file) {
    const arrayBuffer = await file.arrayBuffer();
    if (fileName.toLowerCase().endsWith('.docx')) {
      const result = await processDocx(arrayBuffer, {});
      placeholders = result.placeholders;
      finalBuffer = result.buffer;
    } else {
      finalBuffer = arrayBuffer;
    }
  } else {
    finalBuffer = await textToDocx(content!);
    const result = await processDocx(finalBuffer, {});
    placeholders = result.placeholders;
    finalBuffer = result.buffer;
  }

  await c.env.BUCKET.put(key, finalBuffer, {
    httpMetadata: { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  });

  const orgId = getOrgId(user);
  const res = await c.env.DB.prepare(
    'INSERT INTO templates (organization_id, title, description, file_key, file_name, file_data, template_fields) VALUES (?,?,?,?,?,?,?)'
  ).bind(orgId, title, description, key, fileName, content || '', JSON.stringify(placeholders)).run();

  const tmpl = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?')
    .bind(res.meta.last_row_id).first<any>();
  return c.json({ ...tmpl, template_fields: JSON.parse(tmpl.template_fields || '[]') }, 201);
});

// DELETE /api/documents/templates/:id
templates.delete('/:id', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN', 'MANAGER'), async (c) => {
  const user = c.get('user');
  const tmpl = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?')
    .bind(c.req.param('id')).first<any>();
  if (!tmpl) return c.json({ detail: 'Not found' }, 404);
  if (tmpl.organization_id !== getOrgId(user) && user.role !== 'SUPERADMIN')
    return c.json({ detail: 'Permission denied' }, 403);

  await c.env.BUCKET.delete(tmpl.file_key).catch(() => {});
  await c.env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(tmpl.id).run();
  return c.body(null, 204);
});

// POST /api/documents/templates/:id/use
templates.post('/:id/use', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN', 'MANAGER'), async (c) => {
  const user = c.get('user');
  const orgId = getOrgId(user);

  const tmpl = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?')
    .bind(c.req.param('id')).first<any>();
  if (!tmpl) return c.json({ detail: 'Not found' }, 404);
  if (tmpl.organization_id !== orgId && user.role !== 'SUPERADMIN')
    return c.json({ detail: 'Permission denied' }, 403);

  const body = await c.req.json<{
    title?: string;
    fields?: Record<string, string>;
    client_fields?: Array<{ name: string; type: string }>;
  }>();
  const title = body.title || tmpl.title;
  const managerFields = body.fields || {};
  const clientFields = body.client_fields || [];

  const obj = await c.env.BUCKET.get(tmpl.file_key);
  if (!obj) return c.json({ detail: 'Template file not found in storage' }, 404);

  const arrayBuffer = await obj.arrayBuffer();
  let finalBuffer = arrayBuffer;

  if (tmpl.file_name.toLowerCase().endsWith('.docx')) {
    const result = await processDocx(arrayBuffer, managerFields);
    finalBuffer = result.buffer;
  }

  const docUuid = uuid();
  const key = `documents/${docUuid}/${tmpl.file_name}`;
  await c.env.BUCKET.put(key, finalBuffer, {
    httpMetadata: { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  });

  const res = await c.env.DB.prepare(
    'INSERT INTO documents (user_id, organization_id, template_id, uuid, title, file_key, file_name, client_fields, manager_fields) VALUES (?,?,?,?,?,?,?,?,?)'
  ).bind(
    user.id, orgId, tmpl.id, docUuid, title, key, tmpl.file_name,
    JSON.stringify(clientFields), JSON.stringify(managerFields),
  ).run();

  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?')
    .bind(res.meta.last_row_id).first<any>();

  return c.json({
    ...doc,
    signatures: [],
    signature_count: 0,
    client_fields: clientFields,
  }, 201);
});

// GET /api/documents/templates/:id/file
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

// GET /api/documents/templates/:id/text — returns editable text content
templates.get('/:id/text', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN', 'MANAGER'), async (c) => {
  const user = c.get('user');
  const tmpl = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?')
    .bind(c.req.param('id')).first<any>();
  if (!tmpl) return c.json({ detail: 'Not found' }, 404);
  if (tmpl.organization_id !== getOrgId(user) && user.role !== 'SUPERADMIN')
    return c.json({ detail: 'Permission denied' }, 403);

  // Return stored text if created via editor
  if (tmpl.file_data) return c.json({ content: tmpl.file_data });

  // Otherwise extract from DOCX
  if (!tmpl.file_name.toLowerCase().endsWith('.docx'))
    return c.json({ content: '' });

  const obj = await c.env.BUCKET.get(tmpl.file_key);
  if (!obj) return c.json({ content: '' });

  const content = await docxToText(await obj.arrayBuffer());
  return c.json({ content });
});

// PUT /api/documents/templates/:id/text — update template from text editor
templates.put('/:id/text', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN', 'MANAGER'), async (c) => {
  const user = c.get('user');
  const tmpl = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?')
    .bind(c.req.param('id')).first<any>();
  if (!tmpl) return c.json({ detail: 'Not found' }, 404);
  if (tmpl.organization_id !== getOrgId(user) && user.role !== 'SUPERADMIN')
    return c.json({ detail: 'Permission denied' }, 403);

  const body = await c.req.json<{ content: string; title?: string; description?: string }>();
  const content = body.content || '';
  const newTitle = body.title || tmpl.title;
  const newDesc = body.description ?? tmpl.description;

  const buf = await textToDocx(content);
  const { buffer, placeholders } = await processDocx(buf, {});

  // If original was not DOCX, generate a new key with .docx extension
  let fileKey = tmpl.file_key;
  let fileName = tmpl.file_name;
  if (!fileName.toLowerCase().endsWith('.docx')) {
    fileName = `${newTitle}.docx`;
    fileKey = `templates/${uuid()}/${fileName}`;
    await c.env.BUCKET.delete(tmpl.file_key).catch(() => {});
  }

  await c.env.BUCKET.put(fileKey, buffer, {
    httpMetadata: { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  });

  await c.env.DB.prepare(
    'UPDATE templates SET file_data=?, file_key=?, file_name=?, template_fields=?, title=?, description=? WHERE id=?'
  ).bind(content, fileKey, fileName, JSON.stringify(placeholders), newTitle, newDesc, tmpl.id).run();

  const updated = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?')
    .bind(tmpl.id).first<any>();
  return c.json({ ...updated, template_fields: JSON.parse(updated.template_fields || '[]') });
});

export default templates;
