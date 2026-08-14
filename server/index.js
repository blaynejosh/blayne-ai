/**
 * B.L.A.Y.N.E API — the server side of the chat surface.
 *
 *   npm run server        (or `npm run dev:all` to run it beside Vite)
 *
 * This exists because the Anthropic API key must never reach the browser. The
 * client posts a conversation here; this process holds the key, adds the base
 * identity prompt and the Blayne skill set, calls Claude, and streams the
 * answer back as SSE.
 *
 * Requires ANTHROPIC_API_KEY in the environment (see .env.example).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystem } from './blaynePrompt.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.BLAYNE_MODEL ?? 'claude-opus-5';

/* Streaming, so a long answer can't hit an HTTP timeout. 16K is generous for a
   consulting answer while bounding spend; raise it for report-length output. */
const MAX_TOKENS = 16000;

/** Keeps one runaway conversation from blowing the context window. */
const MAX_TURNS = 40;
const MAX_CHARS = 24000;

/** Server tools pause at 10 internal iterations; resume a bounded number of times. */
const MAX_RESUMES = 4;

/**
 * The Blayne skill set, uploaded by `npm run skills:upload`.
 *
 * Skills are how B.L.A.Y.N.E. reaches its own methodology, brand rules, writing
 * standards and specialist playbooks: each skill's description stays in context
 * and the model pulls in the full text only when a request calls for it. They
 * execute in a code-execution container, so enabling them also enables that
 * tool and the two betas below.
 *
 * Missing registry (skills never uploaded) is not fatal — the service falls
 * back to the base identity prompt alone and says so at boot.
 */
const REGISTRY = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(here, 'skills.json'), 'utf8'));
  } catch {
    return {};
  }
})();

/**
 * The Messages API allows at most 8 skills per request, so the set is chosen
 * per request rather than attaching everything.
 *
 * CORE is always on — it is what makes an answer Blayne's rather than generic:
 * the Repository router, the six-phase method, the brand system, and the
 * writing bar. The remaining four follow the Product Map layer the client is
 * working in, which is the best signal available about what they need.
 */
const CORE_SKILLS = [
  'bbip',
  'blayne-methodology',
  'blayne-brand-guidelines',
  'blayne-executive-writing-standard',
];

const SKILLS_BY_CATEGORY = {
  features: ['business-consultant', 'proposal-writer', 'market-research', 'report-writer'],
  'job-roles': [
    'business-consultant',
    'product-manager',
    'sales-consultant',
    'executive-communication',
  ],
  departments: [
    'business-consultant',
    'solutions-architect',
    'technical-writer',
    'regulatory-research',
  ],
  startups: [
    'business-consultant',
    'market-research',
    'investor-relations',
    'product-marketing',
  ],
};

const MAX_SKILLS = 8;

/** Resolves skill names to API references, dropping any that were never uploaded. */
function selectSkills(category) {
  const names = [...CORE_SKILLS, ...(SKILLS_BY_CATEGORY[category] ?? SKILLS_BY_CATEGORY.features)];
  return names
    .filter((n) => REGISTRY[n])
    .slice(0, MAX_SKILLS)
    .map((n) => ({ type: 'custom', skill_id: REGISTRY[n].skill_id, version: 'latest' }));
}

const SKILL_BETAS = ['code-execution-2025-08-25', 'skills-2025-10-02'];

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
  if (!messages.length)
    return json(res, 400, { error: 'Conversation must start with a user message.' });

  const system = buildSystem(body.category, body.topic);

  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  const skills = selectSkills(body.category);

  const request = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
    ...(skills.length
      ? {
          container: { skills },
          tools: [{ type: 'code_execution_20260521', name: 'code_execution' }],
        }
      : {}),
  };

  /* The turn can end in `pause_turn` when a server tool hits its internal
     iteration cap. Resuming means re-sending with the assistant turn appended —
     no extra user message, the server picks up where it left off. */
  const turns = [...messages];
  let containerId;
  let resumes = 0;

  try {
    while (true) {
      const stream = client.beta.messages.stream({
        ...request,
        ...(containerId ? { container: containerId } : {}),
        messages: turns,
        betas: skills.length ? SKILL_BETAS : undefined,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          send({ type: 'text', text: event.delta.text });
        }
      }

      const final = await stream.finalMessage();
      containerId = final.container?.id ?? containerId;

      if (final.stop_reason === 'pause_turn' && resumes < MAX_RESUMES) {
        turns.push({ role: 'assistant', content: final.content });
        resumes += 1;
        continue;
      }

      if (final.stop_reason === 'refusal') {
        send({
          type: 'refused',
          message:
            "I can't help with that one. If you think that's wrong, rephrase it or route it to a human at Blayne's Consulting.",
        });
      } else {
        send({ type: 'done', stop_reason: final.stop_reason, usage: final.usage });
      }
      break;
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
      skills: Object.keys(REGISTRY).length,
    });
  }
  if (req.method === 'POST' && req.url === '/api/chat') return handleChat(req, res);
  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[blayne] API on http://localhost:${PORT} (model: ${MODEL})`);
  console.log(
    Object.keys(REGISTRY).length
      ? `[blayne] ${Object.keys(REGISTRY).length} Blayne skills registered (max ${MAX_SKILLS} attached per request)`
      : '[blayne] no skills registry — running on the base identity prompt only (npm run skills:upload)',
  );
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[blayne] ANTHROPIC_API_KEY is not set — /api/chat will return 401.');
  }
});
