import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { Env, Variables } from '../types';

const chat = new Hono<{ Bindings: Env; Variables: Variables }>();

const SYSTEM_PROMPT = `You are OneContract AI — a helpful legal assistant for reviewing and understanding contracts.
Help users understand documents, explain legal terms in plain language, and flag potential risks.
Be concise, friendly, and always respond in the same language the user writes in.`;

// In-memory store per worker instance (use KV or D1 for persistence if needed)
const sessions = new Map<string, Array<{ role: string; content: string }>>();

async function askGroq(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });
  const data = await res.json<any>();
  return data.choices?.[0]?.message?.content ?? 'No response from AI';
}

// POST /api/chat/message/
chat.post('/message/', requireAuth, async (c) => {
  const { message, session_id, document_text } = await c.req.json<any>();
  if (!message?.trim()) return c.json({ error: 'message is required' }, 400);

  const sid = session_id || crypto.randomUUID();
  if (!sessions.has(sid)) sessions.set(sid, []);
  const history = sessions.get(sid)!;

  // Inject document context on first message
  const userContent = document_text && history.length === 0
    ? `[Document context]\n${String(document_text).slice(0, 4000)}\n\n[Question]\n${message}`
    : message;

  history.push({ role: 'user', content: userContent });

  const apiKey = c.env.GROQ_API_KEY;
  if (!apiKey) return c.json({ reply: 'GROQ_API_KEY is not configured.', session_id: sid });

  const reply = await askGroq(history, apiKey);
  history.push({ role: 'assistant', content: reply });

  // Keep last 20 messages to avoid token overflow
  if (history.length > 20) history.splice(0, history.length - 20);

  return c.json({ reply, session_id: sid });
});

// GET /api/chat/history/?session_id=xxx
chat.get('/history/', requireAuth, (c) => {
  const sid = c.req.query('session_id') || '';
  const messages = sessions.get(sid) || [];
  return c.json({ messages, session_id: sid });
});

// DELETE /api/chat/clear/?session_id=xxx
chat.delete('/clear/', requireAuth, (c) => {
  const sid = c.req.query('session_id') || '';
  sessions.delete(sid);
  return c.json({ status: 'cleared' });
});

export default chat;
