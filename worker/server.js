import express from 'express';
import corsMiddleware from 'cors';
import Database from 'better-sqlite3';
import multer from 'multer';
import PizZip from 'pizzip';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PORT = parseInt(process.env.PORT || '8787');

// ── SQLite ────────────────────────────────────────────────────────────────────
const db = new Database(join(__dirname, 'onecontract.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(readFileSync(join(__dirname, 'schema.sql'), 'utf8'));

// ── Express ───────────────────────────────────────────────────────────────────
const app = express();
app.use(corsMiddleware({
  origin: ['https://onecontract.pages.dev', 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// ── JWT ───────────────────────────────────────────────────────────────────────
function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}
function b64urlDecode(s) {
  return Buffer.from(s, 'base64url');
}
async function jwtKey(secret, use) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, [use],
  );
}
async function signJWT(payload) {
  const h = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const b = b64url(Buffer.from(JSON.stringify({
    ...payload, iat: Math.floor(Date.now() / 1e3), exp: Math.floor(Date.now() / 1e3) + 86400 * 30,
  })));
  const sig = await crypto.subtle.sign('HMAC', await jwtKey(JWT_SECRET, 'sign'), new TextEncoder().encode(`${h}.${b}`));
  return `${h}.${b}.${b64url(sig)}`;
}
async function verifyJWT(token) {
  try {
    const [h, b, s] = token.split('.');
    if (!h || !b || !s) return null;
    const ok = await crypto.subtle.verify('HMAC', await jwtKey(JWT_SECRET, 'verify'),
      b64urlDecode(s), new TextEncoder().encode(`${h}.${b}`));
    if (!ok) return null;
    const p = JSON.parse(b64urlDecode(b).toString());
    if (p.exp && p.exp < Date.now() / 1e3) return null;
    return p;
  } catch { return null; }
}

// ── Password ──────────────────────────────────────────────────────────────────
async function hashPassword(pwd) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `${Buffer.from(salt).toString('base64')}:${Buffer.from(hash).toString('base64')}`;
}
async function verifyPassword(pwd, stored) {
  try {
    const [saltB64, hashB64] = stored.split(':');
    const salt = Buffer.from(saltB64, 'base64');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), 'PBKDF2', false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
    return Buffer.from(hash).toString('base64') === hashB64;
  } catch { return false; }
}

// ── Auth middleware ───────────────────────────────────────────────────────────
async function authenticate(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const payload = await verifyJWT(token);
  if (!payload?.sub) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
}
async function requireUser(req) {
  const user = await authenticate(req);
  if (!user) throw { status: 401, detail: 'Authentication required' };
  return user;
}
function requireRole(user, ...roles) {
  if (!roles.includes(user.role)) throw { status: 403, detail: 'Permission denied' };
}

// ── DOCX XML fill (handles split runs across XML elements) ───────────────────
function xmlEsc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fillXml(xml, fields) {
  xml = xml.replace(/\{\{([^}]+)\}\}/g, (_, k) => k in fields ? xmlEsc(fields[k]) : `{{${k}}}`);
  if (!xml.includes('{{')) return xml;
  xml = xml.replace(/(<w:p[ >][\s\S]*?<\/w:p>)/g, para => {
    if (!para.includes('{{')) return para;
    const texts = [...para.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => m[1]);
    const joined = texts.join('');
    if (!joined.includes('{{')) return para;
    const pPr = (para.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
    const firstR = para.match(/<w:r[ >][\s\S]*?<\/w:r>/);
    const rPr = firstR ? ((firstR[0].match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0]) : '';
    const filled = joined.replace(/\{\{([^}]+)\}\}/g, (_, k) => k in fields ? xmlEsc(fields[k]) : `{{${k}}}`);
    return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${filled}</w:t></w:r></w:p>`;
  });
  return xml;
}
function fillDocx(buf, fields) {
  if (!Object.keys(fields).length) return buf;
  try {
    const zip = new PizZip(buf);
    const xmlFiles = ['word/document.xml','word/header1.xml','word/footer1.xml','word/header2.xml','word/footer2.xml'];
    for (const name of xmlFiles) {
      if (zip.files[name]) zip.file(name, fillXml(zip.files[name].asText(), fields));
    }
    return zip.generate({ type: 'nodebuffer' });
  } catch { return buf; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeUser(u) {
  return { id: u.id, username: u.username, email: u.email, first_name: u.first_name, last_name: u.last_name, role: u.role, organization_id: u.organization_id || null, is_ecp_verified: !!u.is_ecp_verified };
}
function docWithSigs(doc) {
  const sigs = db.prepare('SELECT * FROM document_signatures WHERE document_id = ? ORDER BY signed_at ASC').all(doc.id);
  const { file_data, client_fields, ...rest } = doc;
  const parsedFields = JSON.parse(client_fields || '[]');
  return { ...rest, client_fields: Array.isArray(parsedFields) ? parsedFields : [], signatures: sigs, signature_count: sigs.length };
}

// ── Auth routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/register/', async (req, res) => {
  try {
    const { email, password, password2, first_name = '', last_name = '', role = 'CLIENT', organization_id = null } = req.body;
    const username = req.body.username || email.split('@')[0];
    if (!email || !password) return res.status(400).json({ detail: 'email and password required' });
    if (password !== password2) return res.status(400).json({ detail: 'Passwords do not match' });
    const finalRole = ['CLIENT', 'ORGANIZATION', 'MANAGER'].includes(role) ? role : 'CLIENT';
    if (finalRole === 'MANAGER' && !organization_id) return res.status(400).json({ detail: 'organization_id is required for MANAGER role' });
    if (organization_id) {
      const org = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(organization_id, 'ORGANIZATION');
      if (!org) return res.status(400).json({ detail: 'Organization not found' });
    }
    const exists = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (exists) return res.status(400).json({ detail: 'Email or username already taken' });
    const id = crypto.randomUUID();
    const password_hash = await hashPassword(password);
    db.prepare('INSERT INTO users (id,username,email,first_name,last_name,password_hash,role,organization_id) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, username, email, first_name, last_name, password_hash, finalRole, organization_id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const token = await signJWT({ sub: id, role: finalRole });
    return res.status(201).json({ token, user: safeUser(user) });
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.post('/api/auth/login/', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ detail: 'email and password required' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash)))
      return res.status(400).json({ detail: 'Invalid credentials' });
    const token = await signJWT({ sub: user.id, role: user.role });
    return res.json({ token, user: safeUser(user) });
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.get('/api/auth/user/', async (req, res) => {
  try {
    const user = await requireUser(req);
    return res.json(safeUser(user));
  } catch (e) { return res.status(e.status || 401).json({ detail: e.detail || String(e) }); }
});

// ECP login — extract email+IIN from CAdES certificate bytes
app.post('/api/auth/ecp/', async (req, res) => {
  try {
    const { signature_key } = req.body;
    if (!signature_key) return res.status(400).json({ detail: 'signature_key required' });

    const buf = Buffer.from(signature_key, 'base64');
    const binary = buf.toString('binary');
    const utf8 = buf.toString('utf8');

    const emailMatch = binary.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    const iinMatch = binary.match(/IIN(\d{12})/);
    if (!emailMatch) return res.status(400).json({ detail: 'Could not extract email from certificate' });

    const email = emailMatch[0];
    const iin = iinMatch ? iinMatch[1] : null;

    // Extract name: in Kazakh GOST certs the Subject has CN, SN, GN, IIN in order.
    // The last two uppercase Cyrillic words before "IIN" are GN (given name) and SN (surname).
    const iinPos = utf8.indexOf('IIN');
    const searchArea = iinPos > 0 ? utf8.substring(0, iinPos) : utf8;
    const cyrillicWords = searchArea.match(/[А-ЯЁҚҮҰӘІҢҒӨҺ]{3,}/g) || [];
    const firstName = cyrillicWords[cyrillicWords.length - 1] || '';
    const lastName = cyrillicWords[cyrillicWords.length - 2] || '';

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      const id = crypto.randomUUID();
      const username = iin || email.split('@')[0];
      db.prepare('INSERT INTO users (id,username,email,first_name,last_name,role,is_ecp_verified) VALUES (?,?,?,?,?,?,?)')
        .run(id, username, email, firstName, lastName, 'CLIENT', 1);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } else {
      db.prepare('UPDATE users SET is_ecp_verified=1, first_name=?, last_name=? WHERE id=?')
        .run(firstName || user.first_name, lastName || user.last_name, user.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }

    const token = await signJWT({ sub: user.id, role: user.role });
    return res.json({ token, user: safeUser(user) });
  } catch (e) { return res.status(500).json({ detail: String(e) }); }
});

// ── Document routes ───────────────────────────────────────────────────────────
app.get('/api/documents/', async (req, res) => {
  try {
    const user = await requireUser(req);
    let rows;
    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
      rows = db.prepare('SELECT id,user_id,organization_id,template_id,uuid,title,file_name,file_mime,status,org_signature,org_signed_at,client_fields,created_at FROM documents ORDER BY created_at DESC').all();
    } else if (user.role === 'ORGANIZATION') {
      rows = db.prepare('SELECT id,user_id,organization_id,template_id,uuid,title,file_name,file_mime,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE organization_id = ? ORDER BY created_at DESC').all(user.id);
    } else if (user.role === 'MANAGER') {
      rows = db.prepare('SELECT id,user_id,organization_id,template_id,uuid,title,file_name,file_mime,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE organization_id = ? ORDER BY created_at DESC').all(user.organization_id);
    } else {
      rows = db.prepare('SELECT d.id,d.user_id,d.organization_id,d.template_id,d.uuid,d.title,d.file_name,d.file_mime,d.status,d.org_signature,d.org_signed_at,d.created_at FROM documents d INNER JOIN document_signatures s ON s.document_id=d.id WHERE s.client_id=? ORDER BY d.created_at DESC').all(user.id);
    }
    return res.json(rows.map(docWithSigs));
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.post('/api/documents/', upload.single('file'), async (req, res) => {
  try {
    const user = await requireUser(req);
    requireRole(user, 'ORGANIZATION', 'MANAGER', 'SUPERADMIN');
    const file = req.file;
    if (!file) return res.status(400).json({ detail: 'file is required' });
    const title = req.body.title || file.originalname || 'Untitled';
    const templateId = req.body.template_id || null;
    const fileData = file.buffer.toString('base64');
    const docUuid = crypto.randomUUID();
    const orgId = user.role === 'MANAGER' ? user.organization_id : user.id;
    const info = db.prepare(
      'INSERT INTO documents (user_id,organization_id,template_id,uuid,title,file_key,file_name,file_data,file_mime) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(user.id, orgId, templateId, docUuid, title, docUuid, file.originalname, fileData, file.mimetype || 'application/octet-stream');
    const doc = db.prepare('SELECT id,user_id,organization_id,template_id,uuid,title,file_name,file_mime,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE id=?').get(info.lastInsertRowid);
    return res.status(201).json(docWithSigs(doc));
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.delete('/api/documents/:id/', async (req, res) => {
  try {
    const user = await requireUser(req);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN');
    const doc = db.prepare('SELECT id,user_id FROM documents WHERE id=?').get(req.params.id);
    if (!doc) return res.status(404).json({ detail: 'Not found' });
    if (doc.user_id !== user.id && user.role !== 'SUPERADMIN') return res.status(403).json({ detail: 'Permission denied' });
    db.prepare('DELETE FROM documents WHERE id=?').run(doc.id);
    return res.status(204).send();
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.get('/api/documents/public/:uuid/', async (req, res) => {
  const doc = db.prepare('SELECT id,user_id,organization_id,template_id,uuid,title,file_name,file_mime,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE uuid=?').get(req.params.uuid);
  if (!doc) return res.status(404).json({ detail: 'Not found' });
  return res.json(docWithSigs(doc));
});

app.get('/api/documents/public/:uuid/file/', async (req, res) => {
  try {
    const doc = db.prepare('SELECT file_data,file_name,file_mime FROM documents WHERE uuid=?').get(req.params.uuid);
    if (!doc || !doc.file_data) return res.status(404).json({ detail: 'Not found' });
    const buf = Buffer.from(doc.file_data, 'base64');
    res.setHeader('Content-Type', doc.file_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(doc.file_name)}`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(buf);
  } catch (e) { return res.status(500).json({ detail: String(e) }); }
});

app.post('/api/documents/public/:uuid/fill/', async (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM documents WHERE uuid=?').get(req.params.uuid);
    if (!doc) return res.status(404).json({ detail: 'Not found' });
    if (doc.status === 'CLOSED') return res.status(400).json({ detail: 'Document is closed' });
    const { fields = {} } = req.body;
    const managerFields = JSON.parse(doc.manager_fields || '{}');
    const allFields = { ...managerFields, ...fields };
    let fileBuf = Buffer.from(doc.file_data, 'base64');
    if (doc.file_name.toLowerCase().endsWith('.docx')) {
      fileBuf = fillDocx(fileBuf, allFields);
    } else {
      let text = fileBuf.toString('utf8');
      text = text.replace(/\{\{([^}]+)\}\}/g, (_, k) => allFields[k] ?? `{{${k}}}`);
      fileBuf = Buffer.from(text);
    }
    db.prepare("UPDATE documents SET file_data=?, client_fields='[]' WHERE id=?").run(fileBuf.toString('base64'), doc.id);
    const updated = db.prepare('SELECT id,user_id,organization_id,template_id,uuid,title,file_name,file_mime,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE id=?').get(doc.id);
    return res.json({ detail: 'Fields filled successfully', document: docWithSigs(updated) });
  } catch (e) { return res.status(500).json({ detail: String(e) }); }
});

app.post('/api/documents/public/:uuid/sign/', async (req, res) => {
  try {
    const user = await requireUser(req);
    const doc = db.prepare('SELECT * FROM documents WHERE uuid=?').get(req.params.uuid);
    if (!doc) return res.status(404).json({ detail: 'Not found' });
    if (doc.status === 'CLOSED') return res.status(400).json({ detail: 'Document is closed' });
    const exists = db.prepare('SELECT id FROM document_signatures WHERE document_id=? AND client_id=?').get(doc.id, user.id);
    if (exists) return res.status(400).json({ detail: 'You already signed this document' });
    const { signature } = req.body;
    if (!signature) return res.status(400).json({ detail: 'Signature is required' });
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
    db.prepare('INSERT INTO document_signatures (document_id,client_id,client_email,client_name,signature) VALUES (?,?,?,?,?)')
      .run(doc.id, user.id, user.email, name, signature);
    const updated = db.prepare('SELECT id,user_id,organization_id,template_id,uuid,title,file_name,file_mime,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE id=?').get(doc.id);
    return res.json({ detail: 'Signed successfully', document: docWithSigs(updated) });
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.get('/api/documents/public/:uuid/b64/', async (req, res) => {
  try {
    const doc = db.prepare('SELECT file_data,file_name,file_mime FROM documents WHERE uuid=?').get(req.params.uuid);
    if (!doc || !doc.file_data) return res.status(404).json({ detail: 'Not found' });
    return res.json({ data: doc.file_data, name: doc.file_name, mime: doc.file_mime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  } catch (e) { return res.status(500).json({ detail: String(e) }); }
});

app.get('/api/documents/:id/file/', async (req, res) => {
  try {
    await requireUser(req);
    const doc = db.prepare('SELECT file_data,file_name,file_mime FROM documents WHERE id=?').get(req.params.id);
    if (!doc || !doc.file_data) return res.status(404).json({ detail: 'File not found' });
    const buf = Buffer.from(doc.file_data, 'base64');
    res.setHeader('Content-Type', doc.file_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(doc.file_name)}`);
    return res.send(buf);
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.post('/api/documents/:id/org_sign/', async (req, res) => {
  try {
    const user = await requireUser(req);
    requireRole(user, 'ORGANIZATION', 'MANAGER', 'SUPERADMIN');
    const orgId = user.role === 'MANAGER' ? user.organization_id : user.id;
    const doc = db.prepare('SELECT id,user_id,org_signed_at FROM documents WHERE id=? AND organization_id=?').get(req.params.id, orgId);
    if (!doc) return res.status(404).json({ detail: 'Not found' });
    if (doc.org_signed_at) return res.status(400).json({ detail: 'Already signed by org' });
    const now = new Date().toISOString();
    db.prepare('UPDATE documents SET org_signature=?,org_signed_at=? WHERE id=?').run(`ORG_APPROVED_${user.id}`, now, doc.id);
    const updated = db.prepare('SELECT id,user_id,organization_id,template_id,uuid,title,file_name,file_mime,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE id=?').get(doc.id);
    return res.json(docWithSigs(updated));
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.post('/api/documents/:id/close/', async (req, res) => {
  try {
    const user = await requireUser(req);
    requireRole(user, 'ORGANIZATION', 'MANAGER', 'SUPERADMIN');
    const orgId = user.role === 'MANAGER' ? user.organization_id : user.id;
    const doc = db.prepare('SELECT id,user_id FROM documents WHERE id=? AND organization_id=?').get(req.params.id, orgId);
    if (!doc) return res.status(404).json({ detail: 'Not found' });
    db.prepare("UPDATE documents SET status='CLOSED' WHERE id=?").run(doc.id);
    const updated = db.prepare('SELECT id,user_id,organization_id,template_id,uuid,title,file_name,file_mime,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE id=?').get(doc.id);
    return res.json(docWithSigs(updated));
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.get('/api/documents/:id/verify/', async (req, res) => {
  try {
    await requireUser(req);
    const doc = db.prepare('SELECT id,org_signed_at FROM documents WHERE id=?').get(req.params.id);
    if (!doc) return res.status(404).json({ detail: 'Not found' });
    const sigs = db.prepare('SELECT * FROM document_signatures WHERE document_id=? ORDER BY signed_at ASC').all(doc.id);
    return res.json({ org_signed_at: doc.org_signed_at, client_signatures: sigs });
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

// ── Template routes ───────────────────────────────────────────────────────────
app.get('/api/documents/templates/', async (req, res) => {
  try {
    const user = await requireUser(req);
    requireRole(user, 'ORGANIZATION', 'MANAGER', 'SUPERADMIN');
    const orgId = user.role === 'MANAGER' ? user.organization_id : user.id;
    const rows = user.role === 'SUPERADMIN'
      ? db.prepare('SELECT id,organization_id,title,description,file_name,template_fields,created_at FROM templates ORDER BY created_at DESC').all()
      : db.prepare('SELECT id,organization_id,title,description,file_name,template_fields,created_at FROM templates WHERE organization_id=? ORDER BY created_at DESC').all(orgId);
    return res.json(rows.map(t => ({ ...t, template_fields: JSON.parse(t.template_fields || '[]') })));
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.post('/api/documents/templates/', upload.single('file'), async (req, res) => {
  try {
    const user = await requireUser(req);
    requireRole(user, 'ORGANIZATION', 'MANAGER', 'SUPERADMIN');
    const file = req.file;
    const content = req.body.content || null;
    if (!file && !content) return res.status(400).json({ detail: 'file or content is required' });
    const title = req.body.title || (file ? file.originalname : 'Шаблон') || 'Untitled';
    const description = req.body.description || '';
    const orgId = user.role === 'MANAGER' ? user.organization_id : user.id;
    let fileData, mimeType, fileName, placeholders = [];

    if (file) {
      fileName = file.originalname;
      fileData = file.buffer.toString('base64');
      mimeType = file.mimetype || 'application/octet-stream';
      if (fileName.toLowerCase().endsWith('.docx')) {
        try {
          const zip = new PizZip(file.buffer);
          const xml = zip.files['word/document.xml']?.asText() || '';
          const plainText = xml.replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, '$1').replace(/<[^>]+>/g, '');
          placeholders = [...new Set([...plainText.matchAll(/\{\{([\p{L}\p{N}_]+)\}\}/gu)].map(m => m[1]))].filter(Boolean).sort();
        } catch (e) { console.error('DOCX parse error:', e); }
      } else {
        const text = file.buffer.toString('utf8');
        placeholders = [...new Set([...text.matchAll(/\{\{([\p{L}\p{N}_]+)\}\}/gu)].map(m => m[1]))].sort();
      }
    } else {
      // Text editor — build minimal DOCX
      fileName = `${title}.docx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      placeholders = [...new Set([...content.matchAll(/\{\{([\p{L}\p{N}_]+)\}\}/gu)].map(m => m[1]))].sort();
      const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const bodyXml = content.split('\n').map(line => `<w:p><w:r><w:t xml:space="preserve">${esc(line)}</w:t></w:r></w:p>`).join('');
      const zip = new PizZip();
      zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
      zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
      zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
      zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}<w:sectPr/></w:body></w:document>`);
      fileData = zip.generate({ type: 'base64' });
    }

    const key = crypto.randomUUID();
    const info = db.prepare(
      'INSERT INTO templates (organization_id,title,description,file_key,file_name,file_data,file_mime,template_fields) VALUES (?,?,?,?,?,?,?,?)'
    ).run(orgId, title, description, key, fileName, fileData, mimeType, JSON.stringify(placeholders));
    const tmpl = db.prepare('SELECT id,organization_id,title,description,file_name,template_fields,created_at FROM templates WHERE id=?').get(info.lastInsertRowid);
    return res.status(201).json({ ...tmpl, template_fields: JSON.parse(tmpl.template_fields || '[]') });
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.get('/api/documents/templates/:id/text/', async (req, res) => {
  try {
    const user = await requireUser(req);
    requireRole(user, 'ORGANIZATION', 'MANAGER', 'SUPERADMIN');
    const orgId = user.role === 'MANAGER' ? user.organization_id : user.id;
    const tmpl = db.prepare('SELECT * FROM templates WHERE id=?').get(req.params.id);
    if (!tmpl) return res.status(404).json({ detail: 'Not found' });
    if (tmpl.organization_id !== orgId && user.role !== 'SUPERADMIN') return res.status(403).json({ detail: 'Permission denied' });
    if (tmpl.file_data && !tmpl.file_name.toLowerCase().endsWith('.docx')) {
      return res.json({ content: Buffer.from(tmpl.file_data, 'base64').toString('utf8') });
    }
    // stored text content (set when created via editor)
    if (tmpl.file_data && tmpl.file_name.toLowerCase().endsWith('.docx')) {
      try {
        const buf = Buffer.from(tmpl.file_data, 'base64');
        const zip = new PizZip(buf);
        let xml = zip.files['word/document.xml']?.asText() || '';
        xml = xml.replace(/<\/w:p>/g, '\n');
        xml = xml.replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, '$1');
        xml = xml.replace(/<[^>]+>/g, '');
        const content = xml.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();
        return res.json({ content });
      } catch { return res.json({ content: '' }); }
    }
    return res.json({ content: '' });
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.put('/api/documents/templates/:id/text/', async (req, res) => {
  try {
    const user = await requireUser(req);
    requireRole(user, 'ORGANIZATION', 'MANAGER', 'SUPERADMIN');
    const orgId = user.role === 'MANAGER' ? user.organization_id : user.id;
    const tmpl = db.prepare('SELECT * FROM templates WHERE id=?').get(req.params.id);
    if (!tmpl) return res.status(404).json({ detail: 'Not found' });
    if (tmpl.organization_id !== orgId && user.role !== 'SUPERADMIN') return res.status(403).json({ detail: 'Permission denied' });
    const { content = '', title, description } = req.body;
    const newTitle = title || tmpl.title;
    const newDesc = description ?? tmpl.description;
    const placeholders = [...new Set([...content.matchAll(/\{\{([\p{L}\p{N}_]+)\}\}/gu)].map(m => m[1]))].sort();
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const bodyXml = content.split('\n').map(line => `<w:p><w:r><w:t xml:space="preserve">${esc(line)}</w:t></w:r></w:p>`).join('');
    const zip = new PizZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}<w:sectPr/></w:body></w:document>`);
    const fileData = zip.generate({ type: 'base64' });
    const fileName = tmpl.file_name.toLowerCase().endsWith('.docx') ? tmpl.file_name : `${newTitle}.docx`;
    db.prepare('UPDATE templates SET file_data=?,file_name=?,template_fields=?,title=?,description=? WHERE id=?')
      .run(fileData, fileName, JSON.stringify(placeholders), newTitle, newDesc, tmpl.id);
    const updated = db.prepare('SELECT id,organization_id,title,description,file_name,template_fields,created_at FROM templates WHERE id=?').get(tmpl.id);
    return res.json({ ...updated, template_fields: JSON.parse(updated.template_fields || '[]') });
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.delete('/api/documents/templates/:id/', async (req, res) => {
  try {
    const user = await requireUser(req);
    requireRole(user, 'ORGANIZATION', 'MANAGER', 'SUPERADMIN');
    const orgId = user.role === 'MANAGER' ? user.organization_id : user.id;
    const tmpl = db.prepare('SELECT id,organization_id FROM templates WHERE id=?').get(req.params.id);
    if (!tmpl) return res.status(404).json({ detail: 'Not found' });
    if (tmpl.organization_id !== orgId && user.role !== 'SUPERADMIN') return res.status(403).json({ detail: 'Permission denied' });
    db.prepare('DELETE FROM templates WHERE id=?').run(tmpl.id);
    return res.status(204).send();
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.post('/api/documents/templates/:id/use/', async (req, res) => {
  try {
    const user = await requireUser(req);
    requireRole(user, 'ORGANIZATION', 'MANAGER', 'SUPERADMIN');
    const tmpl = db.prepare('SELECT * FROM templates WHERE id=?').get(req.params.id);
    if (!tmpl || !tmpl.file_data) return res.status(404).json({ detail: 'Template file missing' });
    const { title = tmpl.title, fields = {}, client_fields = [] } = req.body;
    let fileBuf = Buffer.from(tmpl.file_data, 'base64');
    if (tmpl.file_name.toLowerCase().endsWith('.docx') && Object.keys(fields).length > 0) {
      fileBuf = fillDocx(fileBuf, fields);
    } else if (!tmpl.file_name.toLowerCase().endsWith('.docx') && Object.keys(fields).length > 0) {
      let text = fileBuf.toString('utf8');
      text = text.replace(/\{\{([^}]+)\}\}/g, (_, k) => fields[k] ?? `{{${k}}}`);
      fileBuf = Buffer.from(text);
    }
    const fileData = fileBuf.toString('base64');
    const docUuid = crypto.randomUUID();
    const orgId = user.role === 'MANAGER' ? user.organization_id : user.id;
    const info = db.prepare(
      'INSERT INTO documents (user_id,organization_id,template_id,uuid,title,file_key,file_name,file_data,file_mime,client_fields,manager_fields) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).run(user.id, orgId, tmpl.id, docUuid, title, docUuid, tmpl.file_name, fileData, tmpl.file_mime || 'application/octet-stream', JSON.stringify(client_fields), JSON.stringify(fields));
    const doc = db.prepare('SELECT id,user_id,organization_id,template_id,uuid,title,file_name,file_mime,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE id=?').get(info.lastInsertRowid);
    return res.status(201).json(docWithSigs(doc));
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.get('/api/documents/templates/:id/file/', async (req, res) => {
  try {
    await requireUser(req);
    const tmpl = db.prepare('SELECT file_data,file_name,file_mime FROM templates WHERE id=?').get(req.params.id);
    if (!tmpl || !tmpl.file_data) return res.status(404).json({ detail: 'File not found' });
    const buf = Buffer.from(tmpl.file_data, 'base64');
    res.setHeader('Content-Type', tmpl.file_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(tmpl.file_name)}`);
    return res.send(buf);
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

// ── Chat routes ───────────────────────────────────────────────────────────────
const chatSessions = new Map();

app.post('/api/chat/message/', async (req, res) => {
  try {
    const user = await requireUser(req);
    const { message, session_id, document_text } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message required' });
    const sid = session_id || crypto.randomUUID();
    if (!chatSessions.has(sid)) chatSessions.set(sid, []);
    const history = chatSessions.get(sid);
    const content = document_text && !history.length
      ? `[Document]\n${String(document_text).slice(0, 3000)}\n\n[Question]\n${message}`
      : message;
    history.push({ role: 'user', content });
    if (!process.env.GROQ_API_KEY) {
      history.push({ role: 'assistant', content: 'GROQ_API_KEY is not configured.' });
      return res.json({ reply: 'GROQ_API_KEY is not configured.', session_id: sid });
    }
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', temperature: 0.7, max_tokens: 1024,
        messages: [
          { role: 'system', content: 'You are OneContract AI — a helpful legal assistant. Respond in the same language as the user.' },
          ...history.slice(-18),
        ],
      }),
    });
    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || 'No response';
    history.push({ role: 'assistant', content: reply });
    if (history.length > 20) history.splice(0, history.length - 20);
    return res.json({ reply, session_id: sid });
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.get('/api/chat/history/', async (req, res) => {
  try {
    await requireUser(req);
    const sid = req.query.session_id || '';
    return res.json({ messages: chatSessions.get(sid) || [], session_id: sid });
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

app.delete('/api/chat/clear/', async (req, res) => {
  try {
    await requireUser(req);
    const sid = req.query.session_id || '';
    chatSessions.delete(sid);
    return res.json({ status: 'cleared' });
  } catch (e) { return res.status(e.status || 500).json({ detail: e.detail || String(e) }); }
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', db: 'SQLite' }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
