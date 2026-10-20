import test from "node:test";
import assert from "node:assert/strict";
import { request, retryDelay } from "../src/newsroom/api.js";

const response = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers });

test("bounded Retry-After and exponential jitter", () => {
  assert.equal(retryDelay(response(429, {}, { "Retry-After": "999" }), 0), 10000);
  assert.equal(retryDelay(response(429, {}, { "Retry-After": "0" }), 0), 0);
  assert.equal(retryDelay(null, 0, () => 0.5), 625);
  assert.equal(retryDelay(null, 1, () => 0.5), 1125);
});

test("keyed writes retry twice using the same key and body", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (path, options) => {
    calls.push({ path, key: options.headers.get("Idempotency-Key"), body: options.body });
    return calls.length < 3 ? response(503, { error: "Busy" }, { "Retry-After": "0" }) : response(200, { ok: true });
  });
  assert.deepEqual(await request("/api/v1/newsletter", { method: "POST", headers: { "Idempotency-Key": "stable-test-key" }, body: '{"consent":true}' }), { ok: true });
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.key === "stable-test-key" && call.body === '{"consent":true}'));
});

test("auth, conflict, validation and unkeyed writes never retry", async (t) => {
  for (const status of [401, 403, 409, 422, 503]) {
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => { calls++; return response(status, { error: "Rejected" }); });
    await assert.rejects(request("/api/v1/newsletter", { method: "POST", ...(status !== 503 ? { headers: { "Idempotency-Key": "stable-test-key" } } : {}) }), (error) => error.status === status);
    assert.equal(calls, 1);
    t.mock.restoreAll();
  }
});

test("fallback only follows definitive route 404, never public notfound or 401", async (t) => {
  const paths = [];
  t.mock.method(globalThis, "fetch", async (path) => { paths.push(path); return path.includes("/v1/") ? response(404, { error: "Unknown API route" }) : response(200, { path: "/hi" }); });
  assert.deepEqual(await request("/api/v1/page?path=%2Fhi"), { path: "/hi" });
  assert.deepEqual(paths, ["/api/v1/page?path=%2Fhi", "/api/page?path=%2Fhi"]);
  t.mock.restoreAll();
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return response(404, { kind: "notfound" }); });
  assert.equal((await request("/api/v1/page?path=%2Fmissing")).kind, "notfound");
  assert.equal(calls, 1);
});

test("route cancellation aborts active requests without retry", async (t) => {
  const controller = new AbortController();
  let calls = 0;
  t.mock.method(globalThis, "fetch", (_path, options) => new Promise((_resolve, reject) => {
    calls++;
    options.signal.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")));
  }));
  const pending = request("/api/v1/page", { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(calls, 1);
});

test("each request has a ten-second deadline including response bodies", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(globalThis, "fetch", (_path, options) => Promise.resolve({ ok: true, status: 200, json: () => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Timeout", "AbortError")))) }));
  const pending = request("/api/v1/newsletter", { method: "POST" });
  await Promise.resolve();
  t.mock.timers.tick(10000);
  await assert.rejects(pending, /timed out/);
});

test("route cancellation stops Retry-After backoff", async (t) => {
  const controller = new AbortController();
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return response(429, { error: "Busy" }, { "Retry-After": "10" }); });
  const pending = request("/api/v1/page", { signal: controller.signal });
  await new Promise((resolve) => setTimeout(resolve, 10));
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(calls, 1);
});

test("exhausted safe retries stop at three attempts and expose correlation metadata", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return response(429, { error: "Busy", code: "RATE_LIMIT", requestId: "test-request" }, { "Retry-After": "0" });
  });
  await assert.rejects(request("/api/v1/page"), (error) => error.status === 429 && error.code === "RATE_LIMIT" && error.requestId === "test-request");
  assert.equal(calls, 3);
});
