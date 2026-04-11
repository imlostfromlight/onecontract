import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middleware/auth';
import type { Env, Variables } from '../types';

const docs = new Hono<{ Bindings: Env; Variables: Variables }>();

function uuid() { return crypto.randomUUID(); }

async function docWithSignatures(db: D1Database, doc: any) {
  const sigs = await db.prepare(
    'SELECT * FROM document_signatures WHERE document_id = ? ORDER BY signed_at ASC'
  ).bind(doc.id).all<any>();
  return {
    ...doc,
    signatures: sigs.results,
    signature_count: sigs.results.length,
  };
}

async function getFileUrl(bucket: R2Bucket, key: string): Promise<string> {
  // R2 public URL requires public bucket or custom domain — use worker proxy
  return `/api/documents/file/${key}`;
}

// ── Public: get doc by UUID ───────────────────────────────────────────────────
docs.get('/public/:uuid', async (c) => {
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE uuid = ?')
    .bind(c.req.param('uuid')).first<any>();
  if (!doc) return c.json({ detail: 'Not found' }, 404);
  return c.json(await docWithSignatures(c.env.DB, doc));
});

// ── Public: sign via UUID link ────────────────────────────────────────────────
docs.post('/public/:uuid/sign', requireAuth, async (c) => {
  const user = c.get('user');
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE uuid = ?')
    .bind(c.req.param('uuid')).first<any>();
  if (!doc) return c.json({ detail: 'Not found' }, 404);
  if (doc.status === 'CLOSED') return c.json({ detail: 'Document is closed' }, 400);

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

// ── File proxy: serve file from R2 ───────────────────────────────────────────
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
      'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.id).all<any>()).results;
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
docs.post('/', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN'), async (c) => {
  const user = c.get('user');
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
    'INSERT INTO documents (user_id, template_id, uuid, title, file_key, file_name) VALUES (?,?,?,?,?,?)'
  ).bind(user.id, templateId || null, docUuid, title, key, file.name).run();

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
docs.delete('/:id', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN'), async (c) => {
  const user = c.get('user');
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?')
    .bind(c.req.param('id')).first<any>();
  if (!doc) return c.json({ detail: 'Not found' }, 404);
  if (doc.user_id !== user.id && user.role !== 'SUPERADMIN')
    return c.json({ detail: 'Permission denied' }, 403);

  await c.env.BUCKET.delete(doc.file_key).catch(() => {});
  await c.env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(doc.id).run();
  return c.body(null, 204);
});

// ── Org sign ─────────────────────────────────────────────────────────────────
docs.post('/:id/org_sign', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN'), async (c) => {
  const user = c.get('user');
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first<any>();
  if (!doc) return c.json({ detail: 'Not found' }, 404);
  if (doc.org_signed_at) return c.json({ detail: 'Already signed by org' }, 400);

  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE documents SET org_signature = ?, org_signed_at = ? WHERE id = ?')
    .bind(`ORG_APPROVED_${user.id}`, now, doc.id).run();

  const updated = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(doc.id).first<any>();
  return c.json(await docWithSignatures(c.env.DB, updated));
});

// ── Close document ────────────────────────────────────────────────────────────
docs.post('/:id/close', requireAuth, requireRole('ORGANIZATION', 'SUPERADMIN'), async (c) => {
  const user = c.get('user');
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first<any>();
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
