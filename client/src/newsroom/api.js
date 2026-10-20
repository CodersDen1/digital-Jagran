const retryable = new Set([408, 429, 500, 502, 503, 504]);
const abortError = () => new DOMException("Request cancelled", "AbortError");

export function retryDelay(response, attempt, random = Math.random) {
  const header = response?.headers.get("Retry-After");
  if (header) {
    const seconds = Number(header);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
    if (Number.isFinite(delay)) return Math.max(0, Math.min(delay, 10000));
  }
  return Math.min(4000, 500 * 2 ** attempt) + random() * 250;
}

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const abort = () => { clearTimeout(timer); reject(abortError()); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export function mutationKey() {
  return crypto.randomUUID();
}

export async function request(path, options = {}) {
  const { signal, ...settings } = options;
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const safe = ["GET", "HEAD"].includes((options.method || "GET").toUpperCase()) || headers.has("Idempotency-Key");
  let endpoint = path;
  let legacy = false;
  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) throw abortError();
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => controller.abort(), 10000);
    let response;
    let failure;
    try {
      response = await fetch(`${import.meta.env?.VITE_NEWS_API_ORIGIN || ""}${endpoint}`, {
        credentials: "include", ...settings, headers, signal: controller.signal,
      });
      const data = await response.json().catch(() => {
        if (response.ok) throw new Error("The newsroom returned an unreadable response. Please try again.");
        return {};
      });
      if (signal?.aborted) throw abortError();
      if (controller.signal.aborted) throw abortError();
      if (response.ok || (response.status === 404 && data.kind === "notfound")) return data;
      failure = new Error(data.error || (response.status === 429
        ? "Too many requests. Please wait and try again."
        : response.status === 503 ? "The newsroom is temporarily unavailable. Please try again shortly."
          : "Unable to load the news. Please try again."));
      failure.status = response.status;
      failure.code = data.code;
      failure.requestId = data.requestId || response.headers.get("X-Request-Id");
      // A definitive missing route is safe to fall back; never fall back on an uncertain write.
      if (response.status === 404 && typeof data.error === "string" && endpoint.startsWith("/api/v1/") && !legacy) {
        legacy = true;
        endpoint = endpoint.replace("/api/v1/", "/api/");
        attempt--;
        continue;
      }
    } catch (error) {
      if (signal?.aborted) throw abortError();
      if (controller.signal.aborted) response = undefined;
      failure = controller.signal.aborted || error.name === "AbortError"
        ? new Error("The request timed out. Please try again.") : error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
    if (!safe || attempt >= 2 || (response && !retryable.has(response.status))) throw failure;
    await pause(retryDelay(response, attempt), signal);
  }
}
