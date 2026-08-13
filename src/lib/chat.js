/**
 * Client for the B.L.A.Y.N.E API (server/index.js).
 *
 * The server streams Server-Sent Events; this reads them off the response body
 * and hands each chunk to the caller so the UI can render as the answer lands.
 * No API key is involved on this side — the key lives only on the server.
 */

const DECODER = new TextDecoder();

/**
 * Streams one answer.
 *
 * @param {object}   opts
 * @param {string}   opts.category  Product Map layer id (`features`, …).
 * @param {?string}  opts.topic     Selected item, if any.
 * @param {Array}    opts.messages  Conversation so far: {role, content}.
 * @param {AbortSignal} [opts.signal]
 * @param {(chunk: string) => void} opts.onText  Called per streamed fragment.
 * @returns {Promise<{stopReason?: string, refused?: string}>}
 */
export async function streamReply({ category, topic, messages, signal, onText }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ category, topic, messages }),
    signal,
  });

  if (!res.ok || !res.body) {
    // Errors before the stream opens come back as JSON, not SSE.
    let message = `Request failed (${res.status}).`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep the status-code message */
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  let buffer = '';
  let result = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += DECODER.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    let split;
    while ((split = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);

      const line = frame.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;

      let event;
      try {
        event = JSON.parse(line.slice(6));
      } catch {
        continue;
      }

      if (event.type === 'text') onText(event.text);
      else if (event.type === 'error') throw new Error(event.message);
      else if (event.type === 'refused') result = { refused: event.message };
      else if (event.type === 'done') result = { stopReason: event.stop_reason };
    }
  }

  return result;
}
