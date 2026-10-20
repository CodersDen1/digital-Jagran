export async function collectSubscribers(api, { query = '', signal, onProgress = () => {} } = {}) {
  const rows = new Map();
  let partial = false;
  for (let page = 1; page <= 100; page++) {
    if (signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError');
    const params = new URLSearchParams({ page, pageSize: 50, q: query });
    const result = await api(`/admin/subscribers?${params}`, { signal });
    if (signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError');
    if (!Array.isArray(result.subscribers) || !result.pagination || typeof result.pagination.hasMore !== 'boolean') {
      throw new Error('Subscriber pagination is unavailable. No export was downloaded.');
    }
    for (const subscriber of result.subscribers) {
      if (rows.size >= 5000) { partial = true; break; }
      rows.set(subscriber.email, subscriber);
    }
    onProgress(rows.size);
    if (!result.pagination.hasMore) break;
    if (page === 100) partial = true;
  }
  return { subscribers: [...rows.values()], partial };
}

export function subscriberCsv(subscribers) {
  const cell = value => `"${String(value).replace(/^\s*[-=+@]/, "'$&").replaceAll('"', '""')}"`;
  return 'Email,Consent date\r\n' + subscribers.map(s => `${cell(s.email)},${cell(s.createdAt)}`).join('\r\n');
}
