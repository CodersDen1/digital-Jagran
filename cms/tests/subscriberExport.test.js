import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectSubscribers, subscriberCsv } from '../src/newsroom/subscriberExport.js';

test('export traverses authenticated pages and retains search and cancellation signal', async () => {
  const controller = new AbortController(); let calls = 0;
  const data = await collectSubscribers(async (path, options) => {
    calls++;
    const params = new URL(path, 'http://test').searchParams;
    assert.equal(params.get('page'), String(calls));
    assert.equal(params.get('q'), 'reader+test');
    assert.equal(params.get('pageSize'), '50');
    assert.equal(options.signal, controller.signal);
    return { subscribers: [{ email: `${calls}@example.test`, createdAt: 'date' }], pagination: { hasMore: calls < 3 } };
  }, { query: 'reader+test', signal: controller.signal });
  assert.equal(calls, 3); assert.equal(data.subscribers.length, 3); assert.equal(data.partial, false);
});

test('export deduplicates changing pages and reports truncation after 100 pages/5000 records', async () => {
  let calls = 0;
  const result = await collectSubscribers(async () => {
    const page = calls++;
    return { subscribers: Array.from({ length: 50 }, (_, n) => ({ email: `${page * 50 + n}@example.test` })), pagination: { hasMore: true } };
  });
  assert.equal(calls, 100); assert.equal(result.subscribers.length, 5000); assert.equal(result.partial, true);
  const deduped = await collectSubscribers(async () => ({ subscribers: [{ email: 'same@example.test' }], pagination: { hasMore: true } }));
  assert.equal(deduped.subscribers.length, 1); assert.equal(deduped.partial, true);
});

test('cancelled or failed export returns no partial success', async () => {
  const controller = new AbortController(); let calls = 0;
  await assert.rejects(collectSubscribers(async () => {
    calls++; controller.abort();
    return { subscribers: [{ email: 'one@example.test' }], pagination: { hasMore: true } };
  }, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 1);
  await assert.rejects(collectSubscribers(async () => ({ subscribers: [] })), /pagination/);
});

test('CSV escapes quotes, delimiters and formula-like cells including leading whitespace', () => {
  const csv = subscriberCsv([{ email: '  =bad,"cell"', createdAt: '+formula' }]);
  assert.equal(csv, 'Email,Consent date\r\n"\'  =bad,""cell""","\'+formula"');
});
