import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middleware/auth';
import { processDocx } from '../utils/docx';
import type { Env, Variables } from '../types';

const docs = new Hono<{ Bindings: Env; Variables: Variables }>();

function uuid() { return crypto.randomUUID(); }

function getOrgId(user: any): string {
  return user.role === 'MANAGER' ? (user.organization_id || user.id) : user.id;
}

async function docWithSignatures(db: D1Database, doc: any) {
  const sigs = await db.prepare(
    'SELECT * FROM document_signatures WHERE document_id = ? ORDER BY signed_at ASC'
  ).bind(doc.id).all<any>();
  return {
    ...doc,
    signatures: sigs.results,
    signature_count: sigs.results.length,
    client_fields: JSON.parse(doc.client_fields || '[]'),
  };
}

// ── Public: get doc by UUID ───────────────────────────────────────────────────
docs.get('/public/:uuid', async (c) => {
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE uuid = ?')
    .bind(c.req.param('uuid')).first<any>();
  if (!doc) return c.json({ detail: 'Not found' }, 404);
  return c.json(await docWithSignatures(c.env.DB, doc));
});

// ── Public: serve document file without auth ──────────────────────────────────
docs.get('/public/:uuid/file', async (c) => {
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE uuid = ?')
    .bind(c.req.param('uuid')).first<any>();
  if (!doc) return c.json({ detail: 'Not found' }, 404);

  const obj = await c.env.BUCKET.get(doc.file_key);
  if (!obj) return c.json({ detail: 'File not found' }, 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Content-Disposition', `inline; filename="${doc.file_name}"`);
  headers.set('Cache-Control', 'private, max-age=3600');
  return new Response(obj.body, { headers });
});

// ── Public: client fills their fields before signing ─────────────────────────
docs.post('/public/:uuid/fill', async (c) => {
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE uuid = ?')
    .bind(c.req.param('uuid')).first<any>();
  if (!doc) return c.json({ detail: 'Not found' }, 404);
  if (doc.status === 'CLOSED') return c.json({ detail: 'Document is closed' }, 400);

  const clientFields: string[] = JSON.parse(doc.client_fields || '[]');
  if (clientFields.length === 0) return c.json({ detail: 'No client fields to fill' }, 400);
  if (!doc.template_id) return c.json({ detail: 'No template linked to this document' }, 400);

  const { fields } = await c.req.json<{ fields: Record<string, string> }>();
  if (!fields) return c.json({ detail: 'fields is required' }, 400);

  const tmpl = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?')
    .bind(doc.template_id).first<any>();
  if (!tmpl) return c.json({ detail: 'Template not found' }, 404);

  const obj = await c.env.BUCKET.get(tmpl.file_key);
  if (!obj) return c.json({ detail: 'Template file not found' }, 404);

  const arrayBuffer = await obj.arrayBuffer();
  const managerFields: Record<string, string> = JSON.parse(doc.manager_fields || '{}');
  const allFields = { ...managerFields, ...fields };

  let finalBuffer = arrayBuffer;
  if (tmpl.file_name.toLowerCase().endsWith('.docx')) {
    const result = await processDocx(arrayBuffer, allFields);
    finalBuffer = result.buffer;
  }

  // Overwrite document file with fully-filled version
  await c.env.BUCKET.put(doc.file_key, finalBuffer, {
    httpMetadata: { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  });

  await c.env.DB.prepare("UPDATE documents SET client_fields = '[]' WHERE id = ?")
    .bind(doc.id).run();

  const updated = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?')
    .bind(doc.id).first<any>();
  return c.json({ detail: 'Fields filled successfully', document: await docWithSignatures(c.env.DB, updated) });
});

// ── Public: sign via UUID link ────────────────────────────────────────────────
docs.post('/public/:uuid/sign', requireAuth, async (c) => {
  const user = c.get('user');
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE uuid = ?')
    .bind(c.req.param('uuid')).first<any>();
  if (!doc) return c.json({ detail: 'Not found' }, 404);
  if (doc.status === 'CLOSED') return c.json({ detail: 'Document is closed' }, 400);

  const clientFields: string[] = JSON.parse(doc.client_fields || '[]');
  if (clientFields.length > 0)
    return c.json({ detail: 'Please fill in your fields before signing' }, 400);

  const existing = await c.env.DB.prepare(
    'SELECT id FROM document_signatures WHERE document_id = ? AND client_id = ?'
  ).bind(doc.id, user.id).first();
  if (existing) return c.json({ detail: 'You already signed this document' }, 400);

  const { signature } = await c.req.json<any>();
  if (!signature) return c.json({ detail: 'Signature is required' }, 400);

  await c.env.DB.prepare(
    'INSERT INTO document_signatures (document_id, client_id, client_email, client_name, signature) VALUES (?,?,?,?,?)'
  ).bind(doc.id, user.id, user.email, `${user.first_name} ${user.last_name}`.trim() || user.username, signature).run();

  const updated = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(doc.id).first<any>();
  return c.json({
    detail: 'Signed successfully',
    document: await docWithSignatures(c.env.DB, updated),
  });
});

// ── File proxy: serve file from R2 (auth required) ───────────────────────────
docs.get('/file/:key{.+}', requireAuth, async (c) => {
  const key = c.req.param('key');
  const obj = await c.env.BUCKET.get(key);
  if (!obj) return c.json({ detail: 'File not found' }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=3600');
  return new Response(obj.body, { headers });
});

// ── List documents ────────────────────────────────────────────────────────────
docs.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  let rows: any[];

  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
    rows = (await c.env.DB.prepare('SELECT * FROM documents ORDER BY created_at DESC').all<any>()).results;
  } else if (user.role === 'ORGANIZATION') {
    rows = (await c.env.DB.prepare(
      'SELECT * FROM documents WHERE organization_id = ? OR (organization_id IS NULL AND user_id = ?) ORDER BY created_at DESC'
    ).bind(user.id, user.id).all<any>()).results;
  } else if (user.role === 'MANAGER') {
    rows = (await c.env.DB.prepare(
      'SELECT * FROM documents WHERE organization_id = ? ORDER BY created_at DESC'
    ).bind(getOrgId(user)).all<any>()).results;
  } else {
    // CLIENT: docs they signed
    rows = (await c.env.DB.prepare(`
      SELECT d.* FROM documents d
      INNER JOIN document_signatures s ON s.document_id = d.id
      WHERE s.client_id = ?
      ORDER BY d.created_at DESC
    `).bind(user.id).all<any>()).results;
  }

  const result = await Promise.all(rows.map(d => docWithSignatures(c.env.DB, d)));
  return c.json(result);
});

// ── Upload document ───────────────────────────────────────────────────────────
docs.post('/', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN', 'MANAGER'), async (c) => {
  const user = c.get('user');
  const orgId = getOrgId(user);
  const form = await c.req.formData();
  const file = form.get('file') as File | null;
  const title = (form.get('title') as string | null) || file?.name || 'Untitled';
  const templateId = form.get('template_id') as string | null;

  if (!file) return c.json({ detail: 'file is required' }, 400);

  const docUuid = uuid();
  const key = `documents/${docUuid}/${file.name}`;
  await c.env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  const res = await c.env.DB.prepare(
    'INSERT INTO documents (user_id, organization_id, template_id, uuid, title, file_key, file_name) VALUES (?,?,?,?,?,?,?)'
  ).bind(user.id, orgId, templateId || null, docUuid, title, key, file.name).run();

  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?')
    .bind(res.meta.last_row_id).first<any>();
  return c.json(await docWithSignatures(c.env.DB, doc), 201);
});

// ── Get single document ───────────────────────────────────────────────────────
docs.get('/:id', requireAuth, async (c) => {
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?')
    .bind(c.req.param('id')).first<any>();
  if (!doc) return c.json({ detail: 'Not found' }, 404);
  return c.json(await docWithSignatures(c.env.DB, doc));
});

// ── Delete document ───────────────────────────────────────────────────────────
docs.delete('/:id', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN', 'MANAGER'), async (c) => {
  const user = c.get('user');
  const orgId = getOrgId(user);
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?')
    .bind(c.req.param('id')).first<any>();
  if (!doc) return c.json({ detail: 'Not found' }, 404);
  if (doc.organization_id !== orgId && doc.user_id !== user.id && user.role !== 'SUPERADMIN')
    return c.json({ detail: 'Permission denied' }, 403);

  await c.env.BUCKET.delete(doc.file_key).catch(() => {});
  await c.env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(doc.id).run();
  return c.body(null, 204);
});

// ── Org sign ─────────────────────────────────────────────────────────────────
docs.post('/:id/org_sign', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN', 'MANAGER'), async (c) => {
  const user = c.get('user');
  const orgId = getOrgId(user);
  const doc = await c.env.DB.prepare(
    'SELECT * FROM documents WHERE id = ? AND (organization_id = ? OR user_id = ?)'
  ).bind(c.req.param('id'), orgId, user.id).first<any>();
  if (!doc) return c.json({ detail: 'Not found' }, 404);
  if (doc.org_signed_at) return c.json({ detail: 'Already signed by org' }, 400);

  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE documents SET org_signature = ?, org_signed_at = ? WHERE id = ?')
    .bind(`ORG_APPROVED_${orgId}`, now, doc.id).run();

  const updated = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(doc.id).first<any>();
  return c.json(await docWithSignatures(c.env.DB, updated));
});

// ── Close document ────────────────────────────────────────────────────────────
docs.post('/:id/close', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN', 'MANAGER'), async (c) => {
  const user = c.get('user');
  const orgId = getOrgId(user);
  const doc = await c.env.DB.prepare(
    'SELECT * FROM documents WHERE id = ? AND (organization_id = ? OR user_id = ?)'
  ).bind(c.req.param('id'), orgId, user.id).first<any>();
  if (!doc) return c.json({ detail: 'Not found' }, 404);

  await c.env.DB.prepare("UPDATE documents SET status = 'CLOSED' WHERE id = ?").bind(doc.id).run();
  const updated = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(doc.id).first<any>();
  return c.json(await docWithSignatures(c.env.DB, updated));
});

// ── Verify (list all signatures) ──────────────────────────────────────────────
docs.get('/:id/verify', requireAuth, async (c) => {
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?')
    .bind(c.req.param('id')).first<any>();
  if (!doc) return c.json({ detail: 'Not found' }, 404);
  const sigs = (await c.env.DB.prepare(
    'SELECT * FROM document_signatures WHERE document_id = ? ORDER BY signed_at ASC'
  ).bind(doc.id).all<any>()).results;
  return c.json({
    org_signed_at: doc.org_signed_at,
    client_signatures: sigs,
  });
});

export default docs;
