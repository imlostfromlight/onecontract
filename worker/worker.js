// ============================================================
// OneContract API — Cloudflare Worker (single-file, no deps)
// File storage: D1 base64 blobs (no R2 required)
// ============================================================

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    try {
      return await router(request, env);
    } catch (e) {
      return cors(json({ detail: String(e) }, 500), origin);
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
  if (path === '/api/auth/ecp' && method === 'POST')          return R(await ecpAuth(request, env));
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
    if ((p = matchPath('/api/documents/public/:uuid/file', path)) && method === 'GET')
      return R(await publicDocFile(request, env, p));
    if ((p = matchPath('/api/documents/public/:uuid/debug', path)) && method === 'GET')
      return R(await debugDocFile(request, env, p));
    if ((p = matchPath('/api/documents/public/:uuid/b64', path)) && method === 'GET')
      return R(await docFileB64(request, env, p));
    if ((p = matchPath('/api/documents/public/:uuid/fill', path)) && method === 'POST')
      return R(await publicFill(request, env, p));
    if ((p = matchPath('/api/documents/public/:uuid/sign', path)) && method === 'POST')
      return R(await publicSign(request, env, p));

    if ((p = matchPath('/api/documents/:id/file', path)) && method === 'GET')
      return R(await serveDocFile(request, env, p));

    if ((p = matchPath('/api/documents/:id', path)) && method === 'DELETE')
      return R(await deleteDoc(request, env, p));
    if ((p = matchPath('/api/documents/:id/org_sign', path)) && method === 'POST')
      return R(await orgSign(request, env, p));
    if ((p = matchPath('/api/documents/:id/close', path)) && method === 'POST')
      return R(await closeDoc(request, env, p));
    if ((p = matchPath('/api/documents/:id/verify', path)) && method === 'GET')
      return R(await verifyDoc(request, env, p));
  }

  if (path === '/health') return R(json({ status: 'ok', db: 'D1', storage: 'D1' }));

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

// ── DOCX helpers (ZIP + XML placeholder extraction/fill) ─────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();
function crc32(data) {
  let c = 0xFFFFFFFF;
  for (const b of data) c = (CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8)) >>> 0;
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// Reads ZIP central directory; returns entries with raw compressed bytes preserved
function readZipEntries(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 0x10000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const cdOff = dv.getUint32(eocd + 16, true);
  const cdCount = dv.getUint16(eocd + 8, true);
  const entries = []; let pos = cdOff;
  for (let i = 0; i < cdCount; i++) {
    if (pos + 46 > u8.length || dv.getUint32(pos, true) !== 0x02014b50) break;
    const method = dv.getUint16(pos + 10, true);
    const crc   = dv.getUint32(pos + 16, true);
    const csize = dv.getUint32(pos + 20, true);
    const usize = dv.getUint32(pos + 24, true);
    const fnLen = dv.getUint16(pos + 28, true);
    const exLen = dv.getUint16(pos + 30, true);
    const cmLen = dv.getUint16(pos + 32, true);
    const lOff  = dv.getUint32(pos + 42, true);
    const name  = new TextDecoder().decode(u8.slice(pos + 46, pos + 46 + fnLen));
    const lFnLen = dv.getUint16(lOff + 26, true);
    const lExLen = dv.getUint16(lOff + 28, true);
    const dataStart = lOff + 30 + lFnLen + lExLen;
    // Keep original compressed bytes — don't decompress unless needed
    const compressedData = u8.slice(dataStart, dataStart + csize);
    entries.push({ name, method, crc, csize, usize, compressedData });
    pos += 46 + fnLen + exLen + cmLen;
  }
  return entries;
}

async function inflate(data) {
  if (data.length === 0) return new Uint8Array(0);
  const ds = new DecompressionStream('deflate-raw');
  const w = ds.writable.getWriter(), r = ds.readable.getReader();
  w.write(data.slice()); w.close();
  const chunks = [];
  for (;;) { const res = await r.read(); if (res.done) break; chunks.push(res.value); }
  const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
  let p = 0; for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}

async function deflate(data) {
  const cs = new CompressionStream('deflate-raw');
  const w = cs.writable.getWriter(), r = cs.readable.getReader();
  w.write(data); w.close();
  const chunks = [];
  for (;;) { const res = await r.read(); if (res.done) break; chunks.push(res.value); }
  const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
  let p = 0; for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}

function buildZip(entries) {
  // entries: { name, method, crc, compressedData (bytes), usize }
  const enc = new TextEncoder();
  const locals = [], cdirs = []; let off = 0;
  for (const { name, method, crc, compressedData, usize } of entries) {
    const nb = enc.encode(name);
    const csize = compressedData.length;
    // Local file header
    const lh = new Uint8Array(30 + nb.length), lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);          // version needed
    lv.setUint16(6, 0, true);           // flags
    lv.setUint16(8, method, true);      // compression method (preserved)
    lv.setUint16(10, 0, true);          // mod time
    lv.setUint16(12, 0, true);          // mod date
    lv.setUint32(14, crc, true);        // crc32
    lv.setUint32(18, csize, true);      // compressed size
    lv.setUint32(22, usize, true);      // uncompressed size
    lv.setUint16(26, nb.length, true);  // filename len
    lv.setUint16(28, 0, true);          // extra len
    lh.set(nb, 30);
    locals.push(lh, compressedData);
    // Central directory entry
    const cd = new Uint8Array(46 + nb.length), cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true); cv.setUint16(10, method, true);
    cv.setUint16(12, 0, true); cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, csize, true); cv.setUint32(24, usize, true);
    cv.setUint16(28, nb.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
    cv.setUint32(42, off, true); cd.set(nb, 46);
    cdirs.push(cd);
    off += 30 + nb.length + csize;
  }
  const cdSz = cdirs.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22), ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, cdirs.length, true); ev.setUint16(10, cdirs.length, true);
  ev.setUint32(12, cdSz, true); ev.setUint32(16, off, true);
  const all = [...locals, ...cdirs, eocd];
  const total = all.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total); let p = 0;
  for (const a of all) { out.set(a, p); p += a.length; }
  return out.buffer;
}

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

async function processDocx(buf, fields) {
  if (!fields || !Object.keys(fields).length) return buf;
  try {
    const entries = readZipEntries(buf);
    if (!entries) return buf;
    const xmlNames = new Set(['word/document.xml','word/header1.xml','word/footer1.xml','word/header2.xml','word/footer2.xml']);
    const processed = [];
    for (const e of entries) {
      if (xmlNames.has(e.name) && e.csize > 0) {
        // Decompress XML
        let rawBytes = e.compressedData;
        if (e.method === 8) rawBytes = await inflate(e.compressedData);
        // Modify XML
        const xml = new TextDecoder().decode(rawBytes);
        const filledXml = fillXml(xml, fields);
        const filledBytes = new TextEncoder().encode(filledXml);
        const filledCrc = crc32(filledBytes);
        // Recompress
        let compressedData = filledBytes;
        let method = 0;
        try {
          const recomp = await deflate(filledBytes);
          if (recomp.length < filledBytes.length) { compressedData = recomp; method = 8; }
        } catch {}
        processed.push({ name: e.name, method, crc: filledCrc, compressedData, usize: filledBytes.length });
      } else {
        // Keep original compressed bytes — CRC and sizes from central directory
        processed.push({ name: e.name, method: e.method, crc: e.crc, compressedData: e.compressedData, usize: e.usize });
      }
    }
    const result = buildZip(processed);
    // Quick sanity check
    if (result.byteLength > 22 && new DataView(result).getUint32(0, true) === 0x04034b50) return result;
    return buf;
  } catch { return buf; }
}

async function extractDocxFields(buf) {
  const entries = readZipEntries(buf);
  if (!entries) return [];
  const doc = entries.find(e => e.name === 'word/document.xml');
  if (!doc) return [];
  let rawBytes = doc.compressedData;
  if (doc.method === 8) rawBytes = await inflate(doc.compressedData);
  const xml = new TextDecoder().decode(rawBytes);
  const found = new Set();
  const stripped = xml.replace(/<[^>]+>/g, '');
  for (const [, n] of stripped.matchAll(/\{\{([^}]+)\}\}/g)) found.add(n.trim());
  for (const [para] of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const text = [...para.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => m[1]).join('');
    for (const [, n] of text.matchAll(/\{\{([^}]+)\}\}/g)) found.add(n.trim());
  }
  return [...found].sort();
}

// ── File helpers ──────────────────────────────────────────────────────────────

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function base64ToResponse(b64, fileName, mimeType) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const encodedName = encodeURIComponent(fileName);
  return new Response(bytes, {
    headers: {
      'Content-Type': mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
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
  const { file_data, ...rest } = doc;
  return {
    ...rest,
    signatures: sigs,
    signature_count: sigs.length,
    client_fields: JSON.parse(doc.client_fields || '[]'),
  };
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

async function ecpAuth(request, env) {
  try {
    const { signed_data, signature_key } = await request.json();
    if (!signed_data || !signature_key) return json({ detail: 'signed_data and signature_key required' }, 400);

    // Extract IIN from the CAdES/PKCS#7 signature blob — it's stored as "IIN<12digits>" in the cert Subject
    const bin = atob(signature_key);
    const iinMatch = bin.match(/IIN(\d{12})/);
    if (!iinMatch) return json({ detail: 'Не удалось извлечь ИИН из подписи. Убедитесь, что выбрана подпись с ИИН.' }, 400);
    const iin = iinMatch[1];

    // Try to extract email from SubjectAltName
    const emailMatch = bin.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
    const certEmail = emailMatch ? emailMatch[0] : `${iin}@ecp.kz`;

    // Find or auto-create user keyed by IIN
    let user = await env.DB.prepare("SELECT * FROM users WHERE username = ? OR (email = ? AND role != 'CLIENT')").bind(`ecp_${iin}`, certEmail).first()
      ?? await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(`ecp_${iin}`).first();

    if (!user) {
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO users (id,username,email,role,is_ecp_verified) VALUES (?,?,?,?,1)')
        .bind(id, `ecp_${iin}`, certEmail, 'CLIENT').run();
      user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
    } else if (!user.is_ecp_verified) {
      await env.DB.prepare('UPDATE users SET is_ecp_verified=1 WHERE id=?').bind(user.id).run();
      user = { ...user, is_ecp_verified: 1 };
    }

    const token = await signJWT({ sub: user.id }, env.JWT_SECRET);
    return json({ token, user: safeUser(user) });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
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
      rows = (await env.DB.prepare('SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,created_at FROM documents ORDER BY created_at DESC').all()).results;
    } else if (user.role === 'ORGANIZATION') {
      rows = (await env.DB.prepare('SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all()).results;
    } else {
      rows = (await env.DB.prepare('SELECT d.id,d.user_id,d.template_id,d.uuid,d.title,d.file_name,d.status,d.org_signature,d.org_signed_at,d.created_at FROM documents d INNER JOIN document_signatures s ON s.document_id=d.id WHERE s.client_id=? ORDER BY d.created_at DESC').bind(user.id).all()).results;
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
    const buf = await file.arrayBuffer();
    const fileData = bufToBase64(buf);
    const docUuid = crypto.randomUUID();
    const mimeType = file.type || 'application/octet-stream';
    const res = await env.DB.prepare(
      'INSERT INTO documents (user_id,template_id,uuid,title,file_key,file_name,file_data,file_mime) VALUES (?,?,?,?,?,?,?,?)'
    ).bind(user.id, templateId, docUuid, title, docUuid, file.name, fileData, mimeType).run();
    const doc = await env.DB.prepare('SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,created_at FROM documents WHERE id = ?').bind(res.meta.last_row_id).first();
    return json(await docWithSigs(env.DB, doc), 201);
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function deleteDoc(request, env, params) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN');
    const doc = await env.DB.prepare('SELECT id,user_id FROM documents WHERE id = ?').bind(params.id).first();
    if (!doc) return json({ detail: 'Not found' }, 404);
    if (doc.user_id !== user.id && user.role !== 'SUPERADMIN') return json({ detail: 'Permission denied' }, 403);
    await env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(doc.id).run();
    return new Response(null, { status: 204 });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function publicRetrieve(request, env, params) {
  const doc = await env.DB.prepare('SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE uuid = ?').bind(params.uuid).first();
  if (!doc) return json({ detail: 'Not found' }, 404);
  return json(await docWithSigs(env.DB, doc));
}

async function publicDocFile(request, env, params) {
  try {
    const doc = await env.DB.prepare('SELECT file_data,file_name,file_mime FROM documents WHERE uuid = ?').bind(params.uuid).first();
    if (!doc || !doc.file_data) return json({ detail: 'File not found' }, 404);
    const origin = request.headers.get('Origin') || '';
    const allowed = ['https://onecontract.pages.dev','http://localhost:5173','http://localhost:3000'];
    const corsOrigin = allowed.includes(origin) ? origin : allowed[0];
    const mimeType = doc.file_mime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const bytes = Uint8Array.from(atob(doc.file_data), c => c.charCodeAt(0));
    const encodedName = encodeURIComponent(doc.file_name);
    return new Response(bytes, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  } catch (e) { return json({ detail: String(e) }, 500); }
}

async function docFileB64(request, env, params) {
  try {
    const doc = await env.DB.prepare('SELECT file_data,file_name,file_mime FROM documents WHERE uuid = ?').bind(params.uuid).first();
    if (!doc || !doc.file_data) return json({ detail: 'File not found' }, 404);
    return json({ data: doc.file_data, name: doc.file_name, mime: doc.file_mime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  } catch (e) { return json({ detail: String(e) }, 500); }
}

async function debugDocFile(request, env, params) {
  try {
    const doc = await env.DB.prepare('SELECT length(file_data) as b64len, substr(file_data,1,8) as prefix, file_name, file_mime FROM documents WHERE uuid = ?').bind(params.uuid).first();
    if (!doc) return json({ detail: 'Not found' }, 404);
    const firstBytes = doc.prefix ? Array.from(atob(doc.prefix.padEnd(8,'=')), c => c.charCodeAt(0).toString(16).padStart(2,'0')).join(' ') : 'n/a';
    return json({ file_name: doc.file_name, file_mime: doc.file_mime, b64_length: doc.b64len, first_bytes_hex: firstBytes, is_zip: firstBytes.startsWith('50 4b') });
  } catch(e) { return json({ error: String(e) }); }
}

async function publicFill(request, env, params) {
  try {
    const doc = await env.DB.prepare('SELECT * FROM documents WHERE uuid = ?').bind(params.uuid).first();
    if (!doc) return json({ detail: 'Not found' }, 404);
    if (doc.status === 'CLOSED') return json({ detail: 'Document is closed' }, 400);
    const clientFields = JSON.parse(doc.client_fields || '[]');
    if (!clientFields.length) return json({ detail: 'No client fields to fill' }, 400);

    const { fields = {} } = await request.json();
    const managerFields = JSON.parse(doc.manager_fields || '{}');
    const allFields = { ...managerFields, ...fields };

    let fileData = doc.file_data;
    if (doc.file_name.toLowerCase().endsWith('.docx') && Object.keys(allFields).length > 0) {
      try {
        const buf = Uint8Array.from(atob(fileData), c => c.charCodeAt(0)).buffer;
        const filled = await processDocx(buf, allFields);
        fileData = bufToBase64(filled);
      } catch (e) { /* keep original if processing fails */ }
    }

    await env.DB.prepare("UPDATE documents SET file_data=?, client_fields='[]' WHERE id=?")
      .bind(fileData, doc.id).run();
    const updated = await env.DB.prepare('SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE id=?').bind(doc.id).first();
    return json({ detail: 'Fields filled successfully', document: await docWithSigs(env.DB, updated) });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
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
    const updated = await env.DB.prepare('SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,created_at FROM documents WHERE id = ?').bind(doc.id).first();
    return json({ detail: 'Signed successfully', document: await docWithSigs(env.DB, updated) });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function serveDocFile(request, env, params) {
  try {
    await requireUser(request, env);
    const doc = await env.DB.prepare('SELECT file_data,file_name,file_mime FROM documents WHERE id = ?').bind(params.id).first();
    if (!doc || !doc.file_data) return json({ detail: 'File not found' }, 404);
    const origin = request.headers.get('Origin') || '';
    return cors(base64ToResponse(doc.file_data, doc.file_name, doc.file_mime), origin);
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function orgSign(request, env, params) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN');
    const doc = await env.DB.prepare('SELECT id,user_id,org_signed_at FROM documents WHERE id=? AND user_id=?').bind(params.id, user.id).first();
    if (!doc) return json({ detail: 'Not found' }, 404);
    if (doc.org_signed_at) return json({ detail: 'Already signed by org' }, 400);
    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE documents SET org_signature=?,org_signed_at=? WHERE id=?')
      .bind(`ORG_APPROVED_${user.id}`, now, doc.id).run();
    const updated = await env.DB.prepare('SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,created_at FROM documents WHERE id=?').bind(doc.id).first();
    return json(await docWithSigs(env.DB, updated));
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function closeDoc(request, env, params) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN');
    const doc = await env.DB.prepare('SELECT id,user_id FROM documents WHERE id=? AND user_id=?').bind(params.id, user.id).first();
    if (!doc) return json({ detail: 'Not found' }, 404);
    await env.DB.prepare("UPDATE documents SET status='CLOSED' WHERE id=?").bind(doc.id).run();
    const updated = await env.DB.prepare('SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,created_at FROM documents WHERE id=?').bind(doc.id).first();
    return json(await docWithSigs(env.DB, updated));
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function verifyDoc(request, env, params) {
  try {
    await requireUser(request, env);
    const doc = await env.DB.prepare('SELECT id,org_signed_at FROM documents WHERE id=?').bind(params.id).first();
    if (!doc) return json({ detail: 'Not found' }, 404);
    const sigs = (await env.DB.prepare('SELECT * FROM document_signatures WHERE document_id=? ORDER BY signed_at ASC').bind(doc.id).all()).results;
    return json({ org_signed_at: doc.org_signed_at, client_signatures: sigs });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

// ── Template handlers ─────────────────────────────────────────────────────────

async function listTemplates(request, env) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN', 'MANAGER');
    const orgId = user.role === 'MANAGER' ? (user.organization_id || user.id) : user.id;
    const rows = user.role === 'SUPERADMIN'
      ? (await env.DB.prepare('SELECT id,organization_id,title,description,file_name,template_fields,created_at FROM templates ORDER BY created_at DESC').all()).results
      : (await env.DB.prepare('SELECT id,organization_id,title,description,file_name,template_fields,created_at FROM templates WHERE organization_id=? ORDER BY created_at DESC').bind(orgId).all()).results;
    return json(rows.map(t => ({ ...t, template_fields: JSON.parse(t.template_fields || '[]') })));
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function createTemplate(request, env) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN', 'MANAGER');
    const orgId = user.role === 'MANAGER' ? (user.organization_id || user.id) : user.id;
    const form = await request.formData();
    const file = form.get('file');
    const content = form.get('content');
    const title = form.get('title') || file?.name || 'Шаблон';
    const description = form.get('description') || '';

    let buf, fileName, mimeType, placeholders = [];
    if (file) {
      buf = await file.arrayBuffer();
      fileName = file.name;
      mimeType = file.type || 'application/octet-stream';
      if (fileName.toLowerCase().endsWith('.docx')) {
        placeholders = await extractDocxFields(buf);
      } else {
        const text = new TextDecoder().decode(buf);
        placeholders = [...new Set([...text.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1]))].sort();
      }
    } else if (content) {
      const enc = new TextEncoder().encode(content);
      buf = enc.buffer;
      fileName = `${title}.txt`;
      mimeType = 'text/plain';
      placeholders = [...new Set([...content.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1]))].sort();
    } else {
      return json({ detail: 'file or content is required' }, 400);
    }

    const fileData = bufToBase64(buf);
    const key = crypto.randomUUID();
    const res = await env.DB.prepare(
      'INSERT INTO templates (organization_id,title,description,file_key,file_name,file_data,file_mime,template_fields) VALUES (?,?,?,?,?,?,?,?)'
    ).bind(orgId, title, description, key, fileName, fileData, mimeType, JSON.stringify(placeholders)).run();
    const tmpl = await env.DB.prepare('SELECT id,organization_id,title,description,file_name,template_fields,created_at FROM templates WHERE id=?').bind(res.meta.last_row_id).first();
    return json({ ...tmpl, template_fields: JSON.parse(tmpl.template_fields || '[]') }, 201);
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function deleteTemplate(request, env, params) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN', 'MANAGER');
    const orgId = user.role === 'MANAGER' ? (user.organization_id || user.id) : user.id;
    const tmpl = await env.DB.prepare('SELECT id,organization_id FROM templates WHERE id=?').bind(params.id).first();
    if (!tmpl) return json({ detail: 'Not found' }, 404);
    if (tmpl.organization_id !== orgId && user.role !== 'SUPERADMIN') return json({ detail: 'Permission denied' }, 403);
    await env.DB.prepare('DELETE FROM templates WHERE id=?').bind(tmpl.id).run();
    return new Response(null, { status: 204 });
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function useTemplate(request, env, params) {
  try {
    const user = await requireUser(request, env);
    requireRole(user, 'ORGANIZATION', 'SUPERADMIN', 'MANAGER');
    const orgId = user.role === 'MANAGER' ? (user.organization_id || user.id) : user.id;
    const tmpl = await env.DB.prepare('SELECT * FROM templates WHERE id=?').bind(params.id).first();
    if (!tmpl || !tmpl.file_data) return json({ detail: 'Template file missing' }, 404);

    const { title = tmpl.title, fields = {}, client_fields = [] } = await request.json();
    const managerFields = fields;

    let fileData = tmpl.file_data; // default: copy template as-is
    if (Object.keys(managerFields).length > 0) {
      // Only process DOCX when there are actual manager fields to fill
      if (tmpl.file_name.toLowerCase().endsWith('.docx')) {
        const buf = Uint8Array.from(atob(fileData), c => c.charCodeAt(0)).buffer;
        const filled = await processDocx(buf, managerFields);
        fileData = bufToBase64(filled);
      } else {
        let text = atob(fileData);
        text = text.replace(/\{\{([^}]+)\}\}/g, (_, k) => managerFields[k] ?? `{{${k}}}`);
        fileData = btoa(text);
      }
    }

    const docUuid = crypto.randomUUID();
    const res = await env.DB.prepare(
      'INSERT INTO documents (user_id,organization_id,template_id,uuid,title,file_key,file_name,file_data,file_mime,client_fields,manager_fields) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).bind(
      user.id, orgId, tmpl.id, docUuid, title, docUuid, tmpl.file_name,
      fileData, tmpl.file_mime || 'application/octet-stream',
      JSON.stringify(client_fields), JSON.stringify(managerFields)
    ).run();
    const doc = await env.DB.prepare('SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE id=?').bind(res.meta.last_row_id).first();
    return json(await docWithSigs(env.DB, doc), 201);
  } catch (e) { return json({ detail: e.detail || String(e) }, e.status || 500); }
}

async function serveTemplateFile(request, env, params) {
  try {
    await requireUser(request, env);
    const tmpl = await env.DB.prepare('SELECT file_data,file_name,file_mime FROM templates WHERE id=?').bind(params.id).first();
    if (!tmpl || !tmpl.file_data) return json({ detail: 'File not found' }, 404);
    return cors(base64ToResponse(tmpl.file_data, tmpl.file_name, tmpl.file_mime), request.headers.get('Origin') || '');
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
