import { Hono } from 'hono';
import { hashPassword, verifyPassword } from '../utils/password';
import { signJWT } from '../utils/jwt';
import type { Env, Variables } from '../types';
import { requireAuth } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

function uuid() {
  return crypto.randomUUID();
}

function userResponse(user: any) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    organization_id: user.organization_id || null,
    is_ecp_verified: !!user.is_ecp_verified,
  };
}

// POST /api/auth/register/
auth.post('/register/', async (c) => {
  const body = await c.req.json<any>();
  const { email, password, password2, first_name = '', last_name = '', role = 'CLIENT' } = body;
  const username = body.username || email.split('@')[0];

  if (!email || !password) return c.json({ detail: 'email and password required' }, 400);
  if (password !== password2) return c.json({ detail: 'Passwords do not match' }, 400);

  const allowed = ['CLIENT', 'ORGANIZATION', 'MANAGER'];
  const finalRole = allowed.includes(role) ? role : 'CLIENT';

  const organizationId = body.organization_id || null;
  if (finalRole === 'MANAGER' && !organizationId)
    return c.json({ detail: 'organization_id is required for MANAGER role' }, 400);
  if (organizationId) {
    const org = await c.env.DB.prepare('SELECT id FROM users WHERE id = ? AND role = ?')
      .bind(organizationId, 'ORGANIZATION').first();
    if (!org) return c.json({ detail: 'Organization not found' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? OR username = ?')
    .bind(email, username).first();
  if (existing) return c.json({ detail: 'Email or username already taken' }, 400);

  const id = uuid();
  const password_hash = await hashPassword(password);

  await c.env.DB.prepare(
    'INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, organization_id) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(id, username, email, first_name, last_name, password_hash, finalRole, organizationId).run();

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<any>();
  const token = await signJWT({ sub: id, role: finalRole }, c.env.JWT_SECRET);
  return c.json({ token, user: userResponse(user) }, 201);
});

// POST /api/auth/login/
auth.post('/login/', async (c) => {
  const { email, password } = await c.req.json<any>();
  if (!email || !password) return c.json({ detail: 'email and password required' }, 400);

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<any>();
  if (!user || !user.password_hash) return c.json({ detail: 'Invalid credentials' }, 400);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return c.json({ detail: 'Invalid credentials' }, 400);

  const token = await signJWT({ sub: user.id, role: user.role }, c.env.JWT_SECRET);
  return c.json({ token, user: userResponse(user) });
});

// GET /api/auth/user/
auth.get('/user/', requireAuth, (c) => {
  return c.json(userResponse(c.get('user')));
});

// GET /api/auth/google/
auth.get('/google/', (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID;
  if (!clientId) return c.json({ error: 'GOOGLE_CLIENT_ID not configured' }, 500);

  const redirectUri = `${new URL(c.req.url).origin}/api/auth/google/callback/`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('access_type', 'online');
  return c.redirect(url.toString());
});

// GET /api/auth/google/callback/
auth.get('/google/callback/', async (c) => {
  const code = c.req.query('code');
  const frontendUrl = c.env.FRONTEND_URL;
  if (!code) return c.redirect(`${frontendUrl}/login?error=no_code`);

  try {
    const redirectUri = `${new URL(c.req.url).origin}/api/auth/google/callback/`;

    // Exchange code for token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json<any>();
    if (tokens.error) return c.redirect(`${frontendUrl}/login?error=${tokens.error}`);

    // Get user info
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info = await infoRes.json<any>();
    const email: string = info.email;
    if (!email) return c.redirect(`${frontendUrl}/login?error=no_email`);

    // Find or create user
    let user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<any>();
    if (!user) {
      const id = uuid();
      const username = email.split('@')[0];
      await c.env.DB.prepare(
        'INSERT INTO users (id, username, email, first_name, last_name, role) VALUES (?,?,?,?,?,?)'
      ).bind(id, username, email, info.given_name || '', info.family_name || '', 'CLIENT').run();
      user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<any>();
    }

    const token = await signJWT({ sub: user.id, role: user.role }, c.env.JWT_SECRET);
    return c.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (e: any) {
    return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent(e.message)}`);
  }
});

export default auth;
