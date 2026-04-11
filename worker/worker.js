// ============================================================
// OneContract API — Cloudflare Worker (single-file, no deps)
// Paste this into the Cloudflare Dashboard worker editor
// ============================================================

export default {
  async fetch(request, env) {
    try {
      return await router(request, env);
    } catch (e) {
      return json({ detail: String(e) }, 500);
    }
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function cors(response, origin) {
  const allowed = [
    'https://onecontract.pages.dev',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  const o = allowed.includes(origin) ? origin : allowed[0];
  response.headers.set('Access-Control-Allow-Origin', o);
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

// ── Simple path router ────────────────────────────────────────────────────────

function matchPath(pattern, path) {
  const pp = pattern.split('/').filter(Boolean);
  const ap = path.split('/').filter(Boolean);
  if (pp.length !== ap.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = ap[i];
    else if (pp[i] !== ap[i]) return null;
  }
  return params;
}

async function router(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const method = request.method;
  const origin = request.headers.get('Origin') || '';

  if (method === 'OPTIONS')
    return cors(new Response(null, { status: 204 }), origin);

  const R = (response) => cors(response, origin);

  // ── Auth ──────────────────────────────────────────────────
  if (path === '/api/auth/login' && method === 'POST')        return R(await login(request, env));
  if (path === '/api/auth/register' && method === 'POST')     return R(await register(request, env));
  if (path === '/api/auth/user' && method === 'GET')          return R(await getUser(request, env));
  if (path === '/api/auth/google' && method === 'GET')        return googleLogin(request, env);
  if (path === '/api/auth/google/callback' && method === 'GET') return googleCallback(request, env);

  // ── Chat ──────────────────────────────────────────────────
  if (path === '/api/chat/message' && method === 'POST')      return R(await chatMessage(request, env));
  if (path === '/api/chat/history' && method === 'GET')       return R(await chatHistory(request, env, url));
  if (path === '/api/chat/clear' && method === 'DELETE')      return R(await chatClear(request, env, url));

  // ── Templates (must be before /api/documents/:id) ─────────
  if (path === '/api/documents/templates' && method === 'GET')    return R(await listTemplates(request, env));
  if (path === '/api/documents/templates' && method === 'POST')   return R(await createTemplate(request, env));
  {
    let p;
    if ((p = matchPath('/api/documents/templates/:id', path))) {
      if (method === 'DELETE') return R(await deleteTemplate(request, env, p));
    }
    if ((p = matchPath('/api/documents/templates/:id/use', path))) {
      if (method === 'POST') return R(await useTemplate(request, env, p));
    }
    if ((p = matchPath('/api/documents/templates/:id/file', path))) {
      if (method === 'GET') return R(await serveTemplateFile(request, env, p));
    }
  }

  // ── Documents ─────────────────────────────────────────────
  {
    let p;
    if (path === '/api/documents' && method === 'GET')  return R(await listDocs(request, env));
    if (path === '/api/documents' && method === 'POST') return R(await createDoc(request, env));

    if ((p = matchPath('/api/documents/public/:uuid', path)) && method === 'GET')
      return R(await publicRetrieve(request, env, p));
    if ((p = matchPath('/api/documents/public/:uuid/sign', path)) && method === 'POST')
      return R(await publicSign(request, env, p));

    if ((p = matchPath('/api/documents/file/:key', path)) && method === 'GET')
      return R(await serveFile(request, env, p));

    if ((p = matchPath('/api/documents/:id', path)) && method === 'DELETE')
      return R(await deleteDoc(request, env, p));
    if ((p = matchPath('/api/documents/:id/org_sign', path)) && method === 'POST')
      return R(await orgSign(request, env, p));
    if ((p = matchPath('/api/documents/:id/close', path)) && method === 'POST')
      return R(await closeDoc(request, env, p));
    if ((p = matchPath('/api/documents/:id/verify', path)) && method === 'GET')
      return R(await verifyDoc(request, env, p));
  }

  if (path === '/health') return R(json({ status: 'ok', db: 'D1', storage: 'R2' }));

  return R(json({ detail: 'Not found' }, 404));
}

// ── JWT ───────────────────────────────────────────────────────────────────────

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function b64urlDecode(s) {
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
async function jwtKey(secret, use) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, [use],
  );
}
async function signJWT(payload, secret) {
  const h = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const b = b64url(new TextEncoder().encode(JSON.stringify({
    ...payload, iat: Math.floor(Date.now() / 1e3), exp: Math.floor(Date.now() / 1e3) + 86400 * 30,
  })));
  const sig = await crypto.subtle.sign('HMAC', await jwtKey(secret, 'sign'), new TextEncoder().encode(`${h}.${b}`));
  return `${h}.${b}.${b64url(sig)}`;
}
async function verifyJWT(token, secret) {
  try {
    const [h, b, s] = token.split('.');
    if (!h || !b || !s) return null;
    const ok = await crypto.subtle.verify('HMAC', await jwtKey(secret, 'verify'),
      b64urlDecode(s), new TextEncoder().encode(`${h}.${b}`));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(b64urlDecode(b)));
    if (p.exp && p.exp < Date.now() / 1e3) return null;
    return p;
  } catch { return null; }
}

// ── Password ──────────────────────────────────────────────────────────────────

async function hashPassword(pwd) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `${btoa(String.fromCharCode(...salt))}:${btoa(String.fromCharCode(...new Uint8Array(hash)))}`;
}
async function verifyPassword(pwd, stored) {
  try {
    const [saltB64, hashB64] = stored.split(':');
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), 'PBKDF2', false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
    return btoa(String.fromCharCode(...new Uint8Array(hash))) === hashB64;
  } catch { return false; }
}

// ── Auth middleware ───────────────────────────────────────────────────────────

async function authenticate(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload?.sub) return null;
  return env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.sub).first();
}

async function requireUser(request, env) {
  const user = await authenticate(request, env);
  if (!user) throw { status: 401, detail: 'Authentication required' };
  return user;
}

function requireRole(user, ...roles) {
  if (!roles.includes(user.role)) throw { status: 403, detail: 'Permission denied' };
}

// ── User helpers ──────────────────────────────────────────────────────────────

function safeUser(u) {
  return { id: u.id, username: u.username, email: u.email, first_name: u.first_name, last_name: u.last_name, role: u.role };
}

async function docWithSigs(db, doc) {
  const sigs = (await db.prepare('SELECT * FROM document_signatures WHERE document_id = ? ORDER BY signed_at ASC').bind(doc.id).all()).results;
  return { ...doc, signatures: sigs, signature_count: sigs.length };
}

// ── Auth handlers ─────────────────────────────────────────────────────────────

async function register(request, env) {
  const b = await request.json();
  const { email, password, password2, first_name = '', last_name = '', role = 'CLIENT' } = b;
  const username = b.username || email.split('@')[0];
  if (!email || !password) return json({ detail: 'email and password required' }, 400);
  if (password !== password2) return json({ detail: 'Passwords do not match' }, 400);
  const finalRole = ['CLIENT', 'ORGANIZATION'].includes(role) ? role : 'CLIENT';
  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ? OR username = ?').bind(email, username).first();
  if (exists) return json({ detail: 'Email or username already taken' }, 400);
  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);
  await env.DB.prepare('INSERT INTO users (id,username,email,first_name,last_name,password_hash,role) VALUES (?,?,?,?,?,?,?)')
    .bind(id, username, email, first_name, last_name, password_hash, finalRole).run();
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  const token = await signJWT({ sub: id }, env.JWT_SECRET);
  return json({ token, user: safeUser(user) }, 201);
}

async function login(request, env) {
  const { email, password } = await request.json();
  if (!email || !password) return json({ detail: 'email and password required' }, 400);
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash)))
    return json({ detail: 'Invalid credentials' }, 400);
  const token = await signJWT({ sub: user.id }, env.JWT_SECRET);
  return json({ token, user: safeUser(user) });
}

async function getUser(request, env) {
  try {
    const user = await requireUser(request, env);
    return json(safeUser(user));
  } catch (e) { return json({ detail: e.detail }, e.status || 401); }
}

function googleLogin(request, env) {
  if (!env.GOOGLE_CLIENT_ID) return json({ error: 'GOOGLE_CLIENT_ID not set' }, 500);
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email');
  return Response.redirect(authUrl.toString(), 302);
}

async function googleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const fe = env.FRONTEND_URL || 'https://onecontract.pages.dev';
  if (!code) return Response.redirect(`${fe}/login?error=no_code`, 302);
  try {
    const redirectUri = `${url.origin}/api/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) return Response.redirect(`${fe}/login?error=${tokens.error}`, 302);
    const info = await (await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } })).json();
    if (!info.email) return Response.redirect(`${fe}/login?error=no_email`, 302);
    let user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(info.email).first();
    if (!user) {
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO users (id,username,email,first_name,last_name,role) VALUES (?,?,?,?,?,?)')
        .bind(id, info.email.split('@')[0], info.email, info.given_name || '', info.family_name || '', 'CLIENT').run();
      user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
    }
    const token = await signJWT({ sub: user.id }, env.JWT_SECRET);
    return Response.redirect(`${fe}/auth/callback?token=${token}`, 302);
  } catch (e) {
    return Response.redirect(`${fe}/login?error=${encodeURIComponent(String(e))}`, 302);
  }
}

// ── Document handlers ─────────────────────────────────────────────────────────

async function listDocs(request, env) {
  try {
    const user = await requireUser(request, env);
    let rows;
    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
      rows = (await env.DB.prepare('SELECT * FROM documents ORDER BY created_at DESC').all()).results;
    } else if (user.role === 'ORGANIZATION') {
      rows = (await env.DB.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all()).results;
    } else {
      rows = (await env.DB.prepare('SELECT d.* FROM documents d INNER JOIN document_signatures s ON s.document_id=d.id WHERE s.client_id=? ORDER BY d.created_at DESC').bind(user.id).all()).results;
    }
    return json(await Promise.all(rows.map(d => docWithSigs(env.DB, d))));
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function createDoc(request, env) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN');
    const form = await request.formData();
    const file = form.get('file');
    const title = form.get('title') || file?.name || 'Untitled';
    const templateId = form.get('template_id') || null;
    if (!file) return json({ detail: 'file is required' }, 400);
    const docUuid = crypto.randomUUID();
    const key = `documents/${docUuid}/${file.name}`;
    await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type || 'application/octet-stream' } });
    const res = await env.DB.prepare('INSERT INTO documents (user_id,template_id,uuid,title,file_key,file_name) VALUES (?,?,?,?,?,?)')
      .bind(user.id, templateId, docUuid, title, key, file.name).run();
    const doc = await env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(res.meta.last_row_id).first();
    return json(await docWithSigs(env.DB, doc), 201);
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function deleteDoc(request, env, params) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN');
    const doc = await env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(params.id).first();
    if (!doc) return json({ detail: 'Not found' }, 404);
    if (doc.user_id !== user.id && user.role !== 'SUPERADMIN') return json({ detail: 'Permission denied' }, 403);
    await env.BUCKET.delete(doc.file_key).catch(() => {});
    await env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(doc.id).run();
    return new Response(null, { status: 204 });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function publicRetrieve(request, env, params) {
  const doc = await env.DB.prepare('SELECT * FROM documents WHERE uuid = ?').bind(params.uuid).first();
  if (!doc) return json({ detail: 'Not found' }, 404);
  return json(await docWithSigs(env.DB, doc));
}

async function publicSign(request, env, params) {
  try {
    const user = await requireUser(request, env);
    const doc = await env.DB.prepare('SELECT * FROM documents WHERE uuid = ?').bind(params.uuid).first();
    if (!doc) return json({ detail: 'Not found' }, 404);
    if (doc.status === 'CLOSED') return json({ detail: 'Document is closed' }, 400);
    const exists = await env.DB.prepare('SELECT id FROM document_signatures WHERE document_id=? AND client_id=?').bind(doc.id, user.id).first();
    if (exists) return json({ detail: 'You already signed this document' }, 400);
    const { signature } = await request.json();
    if (!signature) return json({ detail: 'Signature is required' }, 400);
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
    await env.DB.prepare('INSERT INTO document_signatures (document_id,client_id,client_email,client_name,signature) VALUES (?,?,?,?,?)')
      .bind(doc.id, user.id, user.email, name, signature).run();
    const updated = await env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(doc.id).first();
    return json({ detail: 'Signed successfully', document: await docWithSigs(env.DB, updated) });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function serveFile(request, env, params) {
  try {
    await requireUser(request, env);
    const key = params.key;
    const obj = await env.BUCKET.get(key);
    if (!obj) return json({ detail: 'File not found' }, 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'private, max-age=3600');
    return new Response(obj.body, { headers });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function orgSign(request, env, params) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN');
    const doc = await env.DB.prepare('SELECT * FROM documents WHERE id=? AND user_id=?').bind(params.id, user.id).first();
    if (!doc) return json({ detail: 'Not found' }, 404);
    if (doc.org_signed_at) return json({ detail: 'Already signed by org' }, 400);
    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE documents SET org_signature=?,org_signed_at=? WHERE id=?')
      .bind(`ORG_APPROVED_${user.id}`, now, doc.id).run();
    const updated = await env.DB.prepare('SELECT * FROM documents WHERE id=?').bind(doc.id).first();
    return json(await docWithSigs(env.DB, updated));
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function closeDoc(request, env, params) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN');
    const doc = await env.DB.prepare('SELECT * FROM documents WHERE id=? AND user_id=?').bind(params.id, user.id).first();
    if (!doc) return json({ detail: 'Not found' }, 404);
    await env.DB.prepare("UPDATE documents SET status='CLOSED' WHERE id=?").bind(doc.id).run();
    const updated = await env.DB.prepare('SELECT * FROM documents WHERE id=?').bind(doc.id).first();
    return json(await docWithSigs(env.DB, updated));
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function verifyDoc(request, env, params) {
  try {
    await requireUser(request, env);
    const doc = await env.DB.prepare('SELECT * FROM documents WHERE id=?').bind(params.id).first();
    if (!doc) return json({ detail: 'Not found' }, 404);
    const sigs = (await env.DB.prepare('SELECT * FROM document_signatures WHERE document_id=? ORDER BY signed_at ASC').bind(doc.id).all()).results;
    return json({ org_signed_at: doc.org_signed_at, client_signatures: sigs });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

// ── Template handlers ─────────────────────────────────────────────────────────

async function listTemplates(request, env) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN');
    const rows = user.role === 'SUPERADMIN'
      ? (await env.DB.prepare('SELECT * FROM templates ORDER BY created_at DESC').all()).results
      : (await env.DB.prepare('SELECT * FROM templates WHERE organization_id=? ORDER BY created_at DESC').bind(user.id).all()).results;
    return json(rows.map(t => ({ ...t, template_fields: JSON.parse(t.template_fields || '[]') })));
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function createTemplate(request, env) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN');
    const form = await request.formData();
    const file = form.get('file');
    const title = form.get('title') || file?.name || 'Untitled';
    const description = form.get('description') || '';
    if (!file) return json({ detail: 'file is required' }, 400);
    const key = `templates/${crypto.randomUUID()}/${file.name}`;
    const buf = await file.arrayBuffer();
    let placeholders = [];
    // Basic placeholder detection for plain text files
    if (!file.name.toLowerCase().endsWith('.docx')) {
      const text = new TextDecoder().decode(buf);
      placeholders = [...new Set([...text.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))].sort();
    }
    await env.BUCKET.put(key, buf, { httpMetadata: { contentType: file.type || 'application/octet-stream' } });
    const res = await env.DB.prepare('INSERT INTO templates (organization_id,title,description,file_key,file_name,template_fields) VALUES (?,?,?,?,?,?)')
      .bind(user.id, title, description, key, file.name, JSON.stringify(placeholders)).run();
    const tmpl = await env.DB.prepare('SELECT * FROM templates WHERE id=?').bind(res.meta.last_row_id).first();
    return json({ ...tmpl, template_fields: JSON.parse(tmpl.template_fields || '[]') }, 201);
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function deleteTemplate(request, env, params) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN');
    const tmpl = await env.DB.prepare('SELECT * FROM templates WHERE id=?').bind(params.id).first();
    if (!tmpl) return json({ detail: 'Not found' }, 404);
    if (tmpl.organization_id !== user.id && user.role !== 'SUPERADMIN') return json({ detail: 'Permission denied' }, 403);
    await env.BUCKET.delete(tmpl.file_key).catch(() => {});
    await env.DB.prepare('DELETE FROM templates WHERE id=?').bind(tmpl.id).run();
    return new Response(null, { status: 204 });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function useTemplate(request, env, params) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN');
    const tmpl = await env.DB.prepare('SELECT * FROM templates WHERE id=?').bind(params.id).first();
    if (!tmpl) return json({ detail: 'Not found' }, 404);
    const { title = tmpl.title, fields = {} } = await request.json();
    const obj = await env.BUCKET.get(tmpl.file_key);
    if (!obj) return json({ detail: 'Template file missing from storage' }, 404);
    let buf = await obj.arrayBuffer();
    // Placeholder fill for plain text / XML files
    if (!tmpl.file_name.toLowerCase().endsWith('.docx')) {
      let text = new TextDecoder().decode(buf);
      text = text.replace(/\{\{(\w+)\}\}/g, (_, k) => fields[k] ?? `{{${k}}}`);
      buf = new TextEncoder().encode(text).buffer;
    }
    const docUuid = crypto.randomUUID();
    const key = `documents/${docUuid}/${tmpl.file_name}`;
    await env.BUCKET.put(key, buf, { httpMetadata: { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } });
    const res = await env.DB.prepare('INSERT INTO documents (user_id,template_id,uuid,title,file_key,file_name) VALUES (?,?,?,?,?,?)')
      .bind(user.id, tmpl.id, docUuid, title, key, tmpl.file_name).run();
    const doc = await env.DB.prepare('SELECT * FROM documents WHERE id=?').bind(res.meta.last_row_id).first();
    return json(await docWithSigs(env.DB, doc), 201);
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function serveTemplateFile(request, env, params) {
  try {
    await requireUser(request, env);
    const tmpl = await env.DB.prepare('SELECT * FROM templates WHERE id=?').bind(params.id).first();
    if (!tmpl) return json({ detail: 'Not found' }, 404);
    const obj = await env.BUCKET.get(tmpl.file_key);
    if (!obj) return json({ detail: 'File not found' }, 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('Content-Disposition', `attachment; filename="${tmpl.file_name}"`);
    return new Response(obj.body, { headers });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

// ── Chat handlers ─────────────────────────────────────────────────────────────

const chatSessions = new Map();

async function chatMessage(request, env) {
  try {
    const user = await requireUser(request, env);
    const { message, session_id, document_text } = await request.json();
    if (!message?.trim()) return json({ error: 'message required' }, 400);
    const sid = session_id || crypto.randomUUID();
    if (!chatSessions.has(sid)) chatSessions.set(sid, []);
    const history = chatSessions.get(sid);
    const content = document_text && !history.length
      ? `[Document]\n${String(document_text).slice(0, 3000)}\n\n[Question]\n${message}`
      : message;
    history.push({ role: 'user', content });
    if (!env.GROQ_API_KEY) {
      history.push({ role: 'assistant', content: 'GROQ_API_KEY is not configured.' });
      return json({ reply: 'GROQ_API_KEY is not configured.', session_id: sid });
    }
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', temperature: 0.7, max_tokens: 1024,
        messages: [
          { role: 'system', content: 'You are OneContract AI — a helpful legal assistant. Respond in the same language as the user.' },
          ...history.slice(-18),
        ],
      }),
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'No response';
    history.push({ role: 'assistant', content: reply });
    if (history.length > 20) history.splice(0, history.length - 20);
    return json({ reply, session_id: sid });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function chatHistory(request, env, url) {
  try {
    await requireUser(request, env);
    const sid = url.searchParams.get('session_id') || '';
    return json({ messages: chatSessions.get(sid) || [], session_id: sid });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function chatClear(request, env, url) {
  try {
    await requireUser(request, env);
    const sid = url.searchParams.get('session_id') || '';
    chatSessions.delete(sid);
    return json({ status: 'cleared' });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}
