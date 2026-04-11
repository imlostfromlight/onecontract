import { createMiddleware } from 'hono/factory';
import { verifyJWT } from '../utils/jwt';
import type { Env, Variables } from '../types';

export const requireAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const auth = c.req.header('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    if (!token) {
      return c.json({ detail: 'Authentication required' }, 401);
    }

    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!payload || !payload.sub) {
      return c.json({ detail: 'Invalid or expired token' }, 401);
    }

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(payload.sub)
      .first<any>();

    if (!user) {
      return c.json({ detail: 'User not found' }, 401);
    }

    c.set('user', user);
    await next();
  }
);

export const requireRole = (...roles: string[]) =>
  createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const user = c.get('user');
    if (!roles.includes(user.role)) {
      return c.json({ detail: 'Permission denied' }, 403);
    }
    await next();
  });
