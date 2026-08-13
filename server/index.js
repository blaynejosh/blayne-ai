/**
 * B.L.A.Y.N.E API — the server side of the chat surface.
 *
 *   npm run server        (or `npm run dev:all` to run it beside Vite)
 *
 * This exists because the Anthropic API key must never reach the browser. The
 * client posts a conversation here; this process holds the key, adds the base
 * identity prompt, calls Claude, and streams the answer back as SSE.
 *
 * Requires ANTHROPIC_API_KEY in the environment (see .env.example).
 */
import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystem } from './blaynePrompt.js';

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.BLAYNE_MODEL ?? 'claude-opus-5';

/* Streaming, so a long answer can't hit an HTTP timeout. 16K is generous for a
   consulting answer while bounding spend; raise it for report-length output. */
const MAX_TOKENS = 16000;

/** Keeps one runaway conversation from blowing the context window. */
const MAX_TURNS = 40;
const MAX_CHARS = 24000;

const client = new Anthropic(); // reads ANTHROPIC_API_KEY / an `ant auth login` profile

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1e6) reject(new Error('Request body too large'));
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });

/** Only role/content survives; anything else the client sent is discarded. */
function sanitize(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({
      role: m.role,
      content: String(m.content ?? '').slice(0, MAX_CHARS),
    }))
    .filter((m) => m.content.trim())
    .slice(-MAX_TURNS);
}

async function handleChat(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return json(res, 400, { error: err.message });
  }

  const messages = sanitize(body.messages);
  if (!messages.length) return json(res, 400, { error: 'No messages provided.' });
  if (messages[0].role !== 'user') messages.shift();
  if (!messages.length) return json(res, 400, { error: 'Conversation must start with a user message.' });

  const system = buildSystem(body.category, body.topic);

  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  /*
   * Claude Opus 5's safety classifiers can decline a request outright. Opting
   * into server-side fallbacks means a declined request is re-run on Anthropic's
   * recommended fallback model inside the same call rather than dead-ending.
   * If the account can't use that beta, we retry once without it.
   */
  const base = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
  };

  const open = async () => {
    try {
      return client.beta.messages.stream({
        ...base,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
    } catch (err) {
      if (err?.status === 400) return client.messages.stream(base);
      throw err;
    }
  };

  try {
    let stream = await open();
    let text = '';

    try {
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          text += event.delta.text;
          send({ type: 'text', text: event.delta.text });
        }
      }
    } catch (err) {
      // A 400 on the first token usually means the fallback beta was rejected.
      if (err?.status === 400 && !text) {
        stream = client.messages.stream(base);
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            text += event.delta.text;
            send({ type: 'text', text: event.delta.text });
          }
        }
      } else {
        throw err;
      }
    }

    const final = await stream.finalMessage();

    if (final.stop_reason === 'refusal') {
      send({
        type: 'refused',
        message:
          "I can't help with that one. If you think that's wrong, rephrase it or route it to a human at Blayne's Consulting.",
      });
    } else {
      send({ type: 'done', stop_reason: final.stop_reason, usage: final.usage });
    }
  } catch (err) {
    const status = err?.status;
    const raw = err?.message ?? '';
    // No credentials at all throws without a status, so match on the message.
    const noCredentials = status === 401 || /resolve authentication method/i.test(raw);

    const message = noCredentials
      ? 'B.L.A.Y.N.E is not connected yet — the server has no Anthropic API key. Set ANTHROPIC_API_KEY (see .env.example) and restart it.'
      : status === 429
        ? 'Rate limited by the Anthropic API. Try again shortly.'
        : status >= 500
          ? 'The Anthropic API is unavailable right now. Try again shortly.'
          : (raw || 'Unexpected error.');

    console.error('[blayne] chat failed:', status ?? '', raw || err);
    send({ type: 'error', message });
  } finally {
    res.end();
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/health') {
    return json(res, 200, {
      ok: true,
      model: MODEL,
      hasKey: Boolean(process.env.ANTHROPIC_API_KEY),
    });
  }
  if (req.method === 'POST' && req.url === '/api/chat') return handleChat(req, res);
  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[blayne] API on http://localhost:${PORT} (model: ${MODEL})`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[blayne] ANTHROPIC_API_KEY is not set — /api/chat will return 401.');
  }
});
