import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, mutationFor } from '../src/newsroom/transport.js';

const response = (status, data = {}, headers = {}) => new Response(JSON.stringify(data), { status, headers });

test('keyed write retries preserve exact body and key, with bounded backoff', async () => {
  const requests = [], waits = [];
  const mutation = mutationFor(JSON.stringify({ title: 'हिन्दी', updatedAt: 'revision-1' }));
  const api = createApi({ random: () => 0.5, wait: async ms => waits.push(ms),
    fetcher: async (url, init) => {
      requests.push({ url, body: init.body, key: init.headers.get('Idempotency-Key') });
      if (requests.length < 3) return response(503, {}, { 'Retry-After': '9999' });
      return response(200, { article: { id: 'saved' } });
    } });
  assert.equal((await api('/admin/articles', { method: 'POST', body: mutation.body,
    headers: { 'Idempotency-Key': mutation.key } })).article.id, 'saved');
  assert.equal(requests.length, 3);
  assert.ok(requests.every(r => r.url === '/api/v1/admin/articles' && r.body === mutation.body && r.key === mutation.key));
  assert.deepEqual(waits, [10000, 10000]);
  assert.equal(mutationFor(mutation.body, mutation), mutation);
  assert.notEqual(mutationFor('{}', mutation).key, mutation.key);
});

test('login and unkeyed writes never retry', async () => {
  for (const path of ['/auth/login', '/admin/articles']) {
    let calls = 0;
    const api = createApi({ fetcher: async () => { calls++; return response(503); } });
    await assert.rejects(api(path, { method: 'POST', body: '{}' }), e => e.status === 503 && e.uncertain);
    assert.equal(calls, 1);
  }
});

test('401, 403, 409 and 422 never retry and retain request diagnostics', async () => {
  for (const status of [401, 403, 409, 422]) {
    let calls = 0, expired = 0;
    const api = createApi({ onUnauthorized: () => expired++, fetcher: async () => {
      calls++; return response(status, { error: 'Specific detail', code: 'example', requestId: 'req-1' });
    } });
    await assert.rejects(api('/admin/articles', { method: 'PUT', body: '{}',
      headers: { 'Idempotency-Key': 'stable-key' } }), e => e.status === status && e.code === 'example' && e.requestId === 'req-1' && !e.uncertain && /Specific detail/.test(e.message));
    assert.equal(calls, 1);
    assert.equal(expired, status === 401 ? 1 : 0);
  }
});

test('429 respects Retry-After and stops after three attempts', async () => {
  let calls = 0; const waits = [];
  const api = createApi({ wait: async ms => waits.push(ms), random: () => 0,
    fetcher: async () => { calls++; return response(429, {}, { 'Retry-After': '2' }); } });
  await assert.rejects(api('/admin/articles'), e => e.status === 429 && !e.uncertain);
  assert.equal(calls, 3); assert.deepEqual(waits, [2000, 2000]);
});

test('each timed-out attempt aborts and an uncertain keyed write retains its key', async () => {
  let calls = 0, aborted = 0;
  const api = createApi({ deadline: 5, wait: async () => {}, fetcher: async (_, init) => {
    calls++;
    return new Promise((_, reject) => init.signal.addEventListener('abort', () => {
      aborted++; reject(new DOMException('Timed out', 'AbortError'));
    }, { once: true }));
  } });
  await assert.rejects(api('/admin/articles', { method: 'POST', body: '{}',
    headers: { 'Idempotency-Key': 'stable-key' } }), e => e.uncertain && /deadline/.test(e.message));
  assert.equal(calls, 3); assert.equal(aborted, 3);
});

test('cancellation stops an active attempt and does not retry', async () => {
  let calls = 0;
  const controller = new AbortController();
  const api = createApi({ fetcher: async (_, init) => {
    calls++;
    return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  } });
  const pending = api('/admin/articles', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(calls, 1);
});

test('cancellation during backoff prevents the next fetch', async () => {
  let calls = 0;
  const controller = new AbortController();
  const api = createApi({ random: () => 0, fetcher: async () => { calls++; return response(503); } });
  const pending = api('/admin/articles', { signal: controller.signal });
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(calls, 1);
});

test('invalid successful write response remains uncertain rather than releasing key', async () => {
  let calls = 0;
  const api = createApi({ wait: async () => {}, fetcher: async () => { calls++; return new Response('broken', { status: 200 }); } });
  await assert.rejects(api('/admin/articles', { method: 'PUT', body: '{}',
    headers: { 'Idempotency-Key': 'stable-key' } }), e => e.uncertain);
  assert.equal(calls, 3);
});
