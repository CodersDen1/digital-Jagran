export const mutationFor = (body, previous) => previous?.body === body
  ? previous : { body, key: crypto.randomUUID() };

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Request cancelled.', 'AbortError'));
    const done = () => { signal?.removeEventListener('abort', abort); resolve(); };
    const timer = setTimeout(done, ms);
    const abort = () => { clearTimeout(timer); reject(new DOMException('Request cancelled.', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
  });
}
export function createApi({ origin = '', fetcher = (...args) => fetch(...args), wait = pause,
  random = Math.random, deadline = 10000, onUnauthorized = () => {} } = {}) {
  return async function request(path, options = {}) {
    const { signal, ...init } = options;
    const method = (init.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    if (init.body) headers.set('Content-Type', 'application/json');
    const canRetry = method === 'GET' || (headers.has('Idempotency-Key') && !path.startsWith('/auth/'));
    for (let attempt = 0; ; attempt++) {
      if (signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
      const controller = new AbortController();
      let timeout = false;
      const abort = () => controller.abort();
      signal?.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(() => { timeout = true; controller.abort(); }, deadline);
      let retryAfter = 0;
      let failure;
      try {
        const response = await fetcher(`${origin.replace(/\/$/, '')}/api/v1${path}`, {
          ...init, method, headers, credentials: 'include', signal: controller.signal, cache: 'no-store',
        });
        const rawRetry = response.headers.get('Retry-After');
        if (rawRetry) retryAfter = Math.min(10000, Math.max(0,
          Number.isFinite(Number(rawRetry)) ? Number(rawRetry) * 1000 : Date.parse(rawRetry) - Date.now()));
        const data = await response.json().catch(() => {
          if (response.ok) throw new Error("Invalid server response.");
          return {};
        });
        if (response.ok) return data;
        const messages = {
          401: 'Your session expired. Sign in again; your recovery draft stays on this device.',
          403: 'This account cannot perform this action.',
          409: 'This story changed or this request key was already used. Review the latest version before saving.',
          422: 'Check the story fields and complete the publishing requirements.',
          429: 'Too many requests. Please wait before trying again.',
          503: 'The newsroom service is temporarily unavailable. Please try again.',
        };
        failure = new Error(`${messages[response.status] || 'The request could not be completed.'}${data.error ? ` ${data.error}` : ''}${data.requestId ? ` (Request ${data.requestId})` : ''}`);
        Object.assign(failure, { status: response.status, code: data.code, requestId: data.requestId });
        if (response.status === 401 && path !== '/auth/login') onUnauthorized();
      } catch (error) {
        if (signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
        failure = new Error(timeout ? 'The request exceeded its 10-second deadline.' : 'Unable to reach the newsroom. Check your connection.');
        failure.cause = error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      }
      const transient = !failure.status || [408, 429, 500, 502, 503, 504].includes(failure.status);
      failure.uncertain = method !== 'GET' && (!failure.status || failure.status >= 500 || failure.status === 408);
      if (!canRetry || !transient || attempt >= 2) throw failure;
      await wait(Math.max(retryAfter || 0, Math.min(2000, 400 * 2 ** attempt) + random() * 250), signal);
    }
  };
}
