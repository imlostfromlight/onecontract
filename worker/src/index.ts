import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, Variables } from './types';
import authRoutes from './routes/auth';
import docRoutes from './routes/documents';
import templateRoutes from './routes/templates';
import chatRoutes from './routes/chat';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS
app.use('*', cors({
  origin: (origin) => {
    const allowed = [
      'https://onecontract.pages.dev',
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    return allowed.includes(origin) ? origin : allowed[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
}));

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/documents/templates', templateRoutes);
app.route('/api/documents', docRoutes);
app.route('/api/chat', chatRoutes);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', runtime: 'Cloudflare Workers' }));

// 404
app.notFound((c) => c.json({ detail: 'Not found' }, 404));

export default app;
