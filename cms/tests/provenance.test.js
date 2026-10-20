import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { provenanceDate, safeReferenceUrl } from '../src/newsroom/provenanceUtils.js';

test('provenance URL links accept only HTTP(S) without embedded credentials', () => {
  assert.equal(safeReferenceUrl('https://source.example/doc?q=1'), 'https://source.example/doc?q=1');
  for (const url of ['javascript:alert(1)', 'data:text/html,bad', '//source.example', 'https://user:secret@source.example', 'invalid', undefined]) {
    assert.equal(safeReferenceUrl(url), null);
  }
});

test('snapshot dates use IST and missing/invalid metadata cannot crash rendering', () => {
  assert.match(provenanceDate('2026-10-20T00:00:00Z'), /5:30/);
  assert.equal(provenanceDate(null), 'Not recorded');
  assert.equal(provenanceDate('bad-date'), 'Invalid recorded date');
});

test('provenance UI preserves human review, literal photo metadata and safe read-only rendering', async t => {
  const vite = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)), configFile: false,
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom', esbuild: { jsx: 'automatic' }, optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const { ProvenancePanel, AutomationBadge } = await vite.ssrLoadModule('/src/newsroom/Provenance.jsx');
    const render = provenance => renderToStaticMarkup(createElement(ProvenancePanel, { provenance }));
    const provenance = {
      origin: 'n8n', workflowId: 'workflow-1', runId: 'run-1', sourceId: 'source-1',
      eventId: 'event-1', contentFingerprint: 'fingerprint-1',
      receivedAt: '2026-10-20T00:00:00Z', generatedAt: '2026-10-19T23:00:00Z',
      textModel: 'provider/model-id', imageGenerated: false,
      imageDisclosure: 'AI-generated illustration',
      sources: [{ url: 'https://source.example/doc', title: 'Original report', publishedAt: '2026-10-18T00:00:00Z', retrievedAt: '2026-10-19T00:00:00Z' }],
      warnings: ['Confirm source recency', '<img src=x onerror=alert(1)>'],
      imageRights: { license: 'CC BY 4.0', licenseUrl: 'https://license.example/terms', creator: 'Photo creator', credit: 'Photo credit', sourceUrl: 'https://source.example/photo' },
      referenceImages: [{ url: 'https://images.example/photo.jpg', sourceUrl: 'https://source.example/photo', credit: 'Reference credit', license: 'License supplied' }],
    };
    await t.test('ordinary photos receive no generated-illustration label or invented approval', () => {
      const markup = render(provenance);
      for (const text of ['Automation provenance', 'Submitted for human review', 'Publication still requires an editor',
        'Image marked as not AI-generated', 'Rights not independently verified', 'CC BY 4.0', 'Photo creator', 'Photo credit',
        'Original report', 'Source published (IST)', 'Retrieved (IST)', 'provider/model-id', 'fingerprint-1']) assert.ok(markup.includes(text), text);
      assert.ok(!markup.includes('AI-generated illustration'));
      assert.ok(!markup.includes('<input') && !markup.includes('<button') && !markup.includes('<img'));
      assert.ok(markup.includes('&lt;img src=x onerror=alert(1)&gt;'));
      assert.ok(markup.includes('href="https://license.example/terms"'));
    });
    await t.test('missing rights stay unverified and unknown dates remain readable', () => {
      const markup = render({ origin: 'n8n', generatedAt: 'invalid' });
      assert.ok(markup.includes('No reuse license recorded'));
      assert.ok(markup.includes('Rights not independently verified'));
      assert.ok(markup.includes('Invalid recorded date'));
      assert.ok(markup.includes('No source snapshots recorded'));
      assert.ok(markup.includes('Image origin not recorded'));
      assert.ok(!markup.includes('AI-generated illustration'));
    });
    await t.test('generated-image wording appears only on a record explicitly marked generated', () => {
      const markup = render({ ...provenance, imageGenerated: true });
      assert.ok(markup.includes('This record identifies the lead image as AI-generated'));
      assert.ok(markup.includes('AI-generated illustration'));
    });
    await t.test('unsafe reference links cannot become active and existing manual stories stay unchanged', () => {
      const markup = render({ origin: 'n8n', sources: [{ url: 'javascript:alert(1)', title: '<script>bad</script>' }],
        imageRights: { sourceUrl: 'https://user:secret@source.example' } });
      assert.ok(!markup.includes('href="javascript:') && !markup.includes('href="https://user:secret'));
      assert.ok(markup.includes('&lt;script&gt;bad&lt;/script&gt;'));
      assert.equal(render(undefined), '');
      assert.equal(renderToStaticMarkup(createElement(AutomationBadge, { provenance: undefined })), '');
      assert.match(renderToStaticMarkup(createElement(AutomationBadge, { provenance: { origin: 'n8n', imageGenerated: false } })), /Automation submission/);
    });
  } finally {
    await vite.close();
  }
});
