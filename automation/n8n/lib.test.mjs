import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeSourceUrl, extractPublicEvidence, normalizeCandidates, clusterCandidates, rankClusters, validateDraft, validateDraftStructure, validateVerifier, selectCommonsImage } from './lib.mjs';

const now = Date.parse('2026-10-20T12:00:00Z');
const ago = (hours) => new Date(now - hours * 3600000).toISOString();
const rss = (title, link = 'https://www.bbc.com/news/article', hours = 1) => ({ title, link, isoDate: ago(hours), contentSnippet: 'NASA announces lunar research mission with scientists and spacecraft.' });
const approval = { pass: true, unsupportedClaims: [], warnings: [] };
const en = `NASA has announced a lunar research mission involving scientists and spacecraft. The agency outlined the purpose of its work and described the questions researchers hope to examine. Teams will study available observations before preparing further reports. The announcement explains the importance of careful testing, transparent communication and independent scientific review. Researchers described how instruments collect measurements and how teams compare their results with earlier observations. They emphasized that conclusions depend on evidence rather than assumptions. Readers can consult the original announcement for the agency's description of the programme and its scientific context. This report summarizes that material without claiming a discovery that the source does not establish. Further details will require additional published information from the agency. The newsroom will review subsequent announcements and correct any substantive errors openly when reliable evidence becomes available.`;
const hi = `नासा ने वैज्ञानिकों और अंतरिक्ष यान से जुड़े चंद्र अनुसंधान अभियान की घोषणा की है। एजेंसी ने अपने काम का उद्देश्य बताया और उन सवालों की जानकारी दी जिनका अध्ययन शोधकर्ता करना चाहते हैं। दल आगे की रिपोर्ट तैयार करने से पहले उपलब्ध अवलोकनों की समीक्षा करेंगे। घोषणा में सावधानीपूर्वक परीक्षण पारदर्शी संचार और स्वतंत्र वैज्ञानिक समीक्षा का महत्व बताया गया है। वैज्ञानिकों ने समझाया कि उपकरण कैसे माप एकत्र करते हैं और परिणामों की तुलना पुराने अवलोकनों से कैसे होती है। निष्कर्ष अनुमान के बजाय साक्ष्य पर निर्भर करेंगे। पाठक कार्यक्रम और उसके वैज्ञानिक संदर्भ की जानकारी के लिए मूल घोषणा देख सकते हैं। विश्वसनीय नई जानकारी आने पर खबर की समीक्षा होगी और महत्वपूर्ण त्रुटियों का सुधार स्पष्ट रूप से प्रकाशित किया जाएगा।`;
const draft = () => ({ translations: {
  en: { title: 'NASA announces lunar research mission', summary: 'NASA outlines a scientific research mission.', body: en, metaTitle: 'NASA lunar research mission', description: 'A summary of the NASA research announcement.' },
  hi: { title: 'नासा ने चंद्र अनुसंधान अभियान की घोषणा की', summary: 'नासा ने वैज्ञानिक अनुसंधान अभियान की जानकारी दी।', body: hi, metaTitle: 'नासा का चंद्र अनुसंधान अभियान', description: 'नासा की अनुसंधान घोषणा का सारांश।' },
} });
const sources = [{ url: 'https://www.nasa.gov/news/mission/', title: 'NASA announces lunar research mission', summary: en }];

test('public evidence extractor requires a free Guardian article and excludes unrelated page content', () => {
 const body=(en+' '+en).replaceAll('&','&amp;');
 const html='<script type="application/ld+json">{"isAccessibleForFree":true}</script><p>Unrelated page copy</p><div class="article-body-viewer-selector other"><div><p>'+body+'</p></div><aside><p>Advert instruction</p></aside></div><p>Outside story</p>';
 const result=extractPublicEvidence(html,'https://www.theguardian.com/science/fixture');assert.ok(result.includes('NASA'));assert.ok(!result.includes('Advert')&&!result.includes('Outside')&&!result.includes('Unrelated'));
 assert.equal(extractPublicEvidence(html.replace(':true',':false'),'https://www.theguardian.com/science/fixture'),null);
 assert.equal(extractPublicEvidence(html,'https://example.com/story'),null);
 assert.equal(extractPublicEvidence(html.replace('article-body-viewer-selector','unrelated'),'https://www.theguardian.com/science/fixture'),null);
 assert.equal(extractPublicEvidence(html.replace(body,'Too little evidence.'),'https://www.theguardian.com/science/fixture'),null);
});
const validate = (value, options = {}) => validateDraft(value, { verifier: approval, sources, ...options });

test('source URLs require HTTPS publisher hosts and retain meaningful query parameters', () => {
  assert.equal(canonicalizeSourceUrl('https://www.bbc.com/news/story?utm_source=rss&at_medium=RSS&id=42#main'), 'https://bbc.com/news/story?id=42');
  assert.equal(canonicalizeSourceUrl('https://pib.gov.in/PressReleasePage.aspx?PRID=123&CMP=rss'), 'https://pib.gov.in/PressReleasePage.aspx?PRID=123');
  for (const host of ['bbc.com', 'feeds.bbci.co.uk', 'aljazeera.com', 'theguardian.com', 'thehindu.com', 'hindustantimes.com', 'nasa.gov', 'news.un.org', 'pib.gov.in']) assert.ok(canonicalizeSourceUrl(`https://${host}/news`));
  for (const url of ['http://bbc.com/a', 'https://bbc.com.evil.test/a', 'https://evilbbc.com/a', 'https://bbc.com@evil.test/a', 'https://user:password@bbc.com/a', 'https://bbc.com:444/a', 'javascript:alert(1)', 'file:///etc/passwd']) assert.equal(canonicalizeSourceUrl(url), null);
});

test('freshness boundaries, feed aliases and canonical duplicates fail closed', () => {
  const rows = [rss('Exact freshness boundary', undefined, 36), rss('Too old', 'https://bbc.com/old', 36.001), rss('Future boundary', 'https://bbc.com/future', -5 / 60), rss('Too far future', 'https://bbc.com/far', -6 / 60), { ...rss('Missing date'), isoDate: undefined }, { ...rss('Invalid date'), isoDate: 'bad' }, rss('Tracking duplicate', 'https://bbc.com/news/article?utm_campaign=x', 35), { json: { title: '<b>NASA research announcement</b>', link: 'https://nasa.gov/new', pubDate: ago(2), content: '<p>Research context</p>', feedCategory: 'science' } }];
  const copy = JSON.stringify(rows);
  const result = normalizeCandidates(rows, { now });
  assert.equal(result.length, 3);
  assert.equal(result.find((item) => item.source === 'nasa').category, 'explained');
  assert.equal(result.find((item) => item.source === 'nasa').summary, 'Research context');
  assert.equal(JSON.stringify(rows), copy);
  assert.equal(normalizeCandidates([rss('Headline')], { now: 'bad' }).length, 0);
});

test('equivalent coverage clusters but publisher aliases never inflate independence', () => {
  const title = 'NASA announces major lunar research mission launch';
  const items = normalizeCandidates([rss(title), rss(title, 'https://bbc.co.uk/space'), rss(title, 'https://nasa.gov/launch')], { now });
  const groups = clusterCandidates(items);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].sources.length, 2);
  assert.equal(groups[0].items.length, 3);
});

test('different event numbers, named locations, negation, and dates stay separate', () => {
  for (const [left, right, hours] of [
    ['Major earthquake strikes region leaving 10 people injured', 'Major earthquake strikes region leaving 20 people injured', 1],
    ['Researchers announce major space mission destination Venus', 'Researchers announce major space mission destination Mars', 1],
    ['NASA approves major lunar research mission launch', 'NASA rejects major lunar research mission launch', 1],
    ['NASA announces major lunar research mission launch', 'NASA announces major lunar research mission launch', 25],
  ]) {
    const items = normalizeCandidates([rss(left), rss(right, 'https://nasa.gov/other', hours)], { now });
    assert.equal(clusterCandidates(items).length, 2, `${left} / ${right}`);
  }
});

test('complete-link prevents lexical bridging between distinct stories', () => {
  const titles = ['alpha bravo charlie delta echo foxtrot', 'alpha bravo charlie delta echo golf', 'alpha bravo charlie delta golf hotel'];
  const items = normalizeCandidates(titles.map((title, i) => rss(title, `https://bbc.com/${i}`)), { now });
  const groups = clusterCandidates(items, { threshold: 0.65 });
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((group) => group.items.length), [2, 1]);
});

test('ranking rewards independent corroboration, recency and source diversity', () => {
  const items = normalizeCandidates([rss('NASA announces major lunar research mission launch'), rss('NASA announces major lunar research mission launch', 'https://nasa.gov/launch'), rss('Fresh unrelated local museum announces exhibition opening', 'https://bbc.com/fresh', 0), rss('Different independent football tournament concludes today', 'https://theguardian.com/sport/one', 1)], { now });
  const groups = clusterCandidates(items), before = JSON.stringify(groups);
  const ranked = rankClusters(groups, { now });
  assert.equal(ranked[0].sources.length, 2);
  assert.equal(ranked[0].sourcePacket.independentSources, 2);
  assert.equal(ranked[0].sourcePacket.sources.length, 2);
  assert.equal(ranked[0].sourcePacket.category, 'explained');
  assert.ok(ranked.every((item) => Number.isFinite(item.score) && Number.isFinite(item.rankScore)));
  assert.equal(JSON.stringify(groups), before);
});

test('valid bilingual plain-text draft and strict JSON round-trip pass', () => {
  assert.equal(validate(draft()).valid, true);
  assert.equal(validate(JSON.stringify(draft())).valid, true);
  assert.equal(validate('```json\n{}\n```').valid, false);
});

test('strict structure, length limits, HTML, language and substance are enforced', () => {
  const cases = [
    (value) => { value.status = 'published'; },
    (value) => { delete value.translations.hi; },
    (value) => { value.translations.en.extra = 'hidden'; },
    (value) => { value.translations.en.body = 'Short body'; },
    (value) => { value.translations.en.body = 'word '.repeat(140); },
    (value) => { value.translations.hi.body = en; },
    (value) => { value.translations.hi.title = 'English headline'; },
    (value) => { value.translations.en.summary = '<script>alert(1)</script>'; },
    (value) => { value.translations.en.description = '&lt;img src=x&gt;'; },
  ];
  for (const [field, limit] of Object.entries({ title: 240, summary: 700, body: 100000, metaTitle: 70, description: 180 })) cases.push((value) => { value.translations.en[field] = 'x'.repeat(limit + 1); });
  for (const change of cases) { const value = draft(); change(value); assert.equal(validate(value).valid, false); }
  for (const invalid of [null, [], {}, { translations: null }, 42]) assert.equal(validate(invalid).valid, false);
});

test('independent verifier must explicitly approve without unsupported claims or warnings', () => {
  for (const verifier of [undefined, {}, { pass: 'true', unsupportedClaims: [], warnings: [] }, { pass: false, unsupportedClaims: [], warnings: [] }, { ...approval, unsupportedClaims: ['An invented figure'] }, { ...approval, warnings: ['Translation uncertain'] }, { ...approval, warnings: [null] }, { ...approval, extra: true }]) {
    assert.equal(validateVerifier(verifier).valid, false);
    assert.equal(validate(draft(), { verifier }).valid, false);
  }
});

test('preverification structure check accepts optional prompt fields but final gate requires verifier', () => {
  const value = { ...draft(), imageSearchQuery: 'Moon surface research', warnings: ['Illustration needs licensing checks'], insufficientEvidence: false };
  assert.equal(validateDraftStructure(value, { sources }).valid, true);
  assert.equal(validateDraft(value, { sources, requireVerifier: false }).valid, true);
  assert.equal(validateDraft(value, { sources }).valid, false);
  assert.equal(validate(value).valid, true);
  for (const patch of [{ insufficientEvidence: true }, { insufficientEvidence: 'false' }, { imageSearchQuery: 'x'.repeat(121) }, { imageSearchQuery: '<script>bad</script>' }, { warnings: Array(21).fill('warning') }, { warnings: [42] }, { warnings: {} }, { other: true }]) assert.equal(validateDraftStructure({ ...value, ...patch }, { sources }).valid, false);
  assert.match(validateDraftStructure({ ...value, insufficientEvidence: true }, { sources }).errors.join(' '), /insufficient evidence/);
});

test('unsupported headline metadata and new numbers cannot pass a positive verifier alone', () => {
  assert.equal(validate(draft(), { sources: [] }).valid, false);
  assert.equal(validate(draft(), { sources: [{ url: 'https://evil.test/', title: 'NASA research' }] }).valid, false);
  assert.equal(validate(draft(), { sources: null }).valid, false);
  const unrelated = draft(); unrelated.translations.en.metaTitle = 'Secret election scandal uncovered';
  assert.equal(validate(unrelated).valid, false);
  const numbered = draft(); numbered.translations.en.title += ' 42';
  assert.equal(validate(numbered).valid, false);
  const hindiNumber = draft(); hindiNumber.translations.hi.metaTitle += ' ४२';
  assert.equal(validate(hindiNumber).valid, false);
});

const commons = (overrides = {}) => ({ title: 'File:Moon.jpg', imageinfo: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Moon.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Moon.jpg', mime: 'image/jpeg', size: 500000, extmetadata: { Artist: { value: '<a href="/wiki/User:Photographer">Photographer</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' } }, ...overrides }] });

test('raw Commons API images preserve attribution, source and conservative context', () => {
  const selected = selectCommonsImage([commons()]);
  assert.equal(selected.artist, 'Photographer');
  assert.equal(selected.creator, selected.artist);
  assert.equal(selected.sourceUrl, selected.source);
  assert.equal(selected.reference.title, 'File:Moon.jpg');
  assert.equal(selected.illustrative, true);
  assert.match(selected.caption, /not an event photograph/);
  assert.equal(selected.reference.url, 'https://commons.wikimedia.org/wiki/File:Moon.jpg');
  assert.match(selected.credit, /CC BY-SA 4.0/);
  assert.match(selectCommonsImage([commons()], { label: 'Moon surface' }).caption, /Moon surface.*not an event photograph/);
  for (const [license, path] of [['CC BY 4.0', '/licenses/by/4.0/'], ['CC0 1.0', '/publicdomain/zero/1.0/'], ['Public domain', '/publicdomain/mark/1.0/']]) {
    const item = commons(); item.imageinfo[0].extmetadata.LicenseShortName.value = license; item.imageinfo[0].extmetadata.LicenseUrl.value = `https://creativecommons.org${path}`;
    assert.ok(selectCommonsImage([item]));
  }
});

test('Commons selection rejects unsafe hosts, formats, sizes and ambiguous licenses', () => {
  const cases = [
    { url: 'https://evil.test/Moon.jpg' }, { url: 'http://upload.wikimedia.org/wikipedia/commons/a/a1/Moon.jpg' },
    { url: 'https://upload.wikimedia.org/wikipedia/en/a/a1/Moon.jpg' }, { url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Moon.svg' },
    { mime: 'image/svg+xml' }, { size: 5 * 1024 * 1024 + 1 }, { size: 0 }, { size: '500000' },
    { descriptionurl: 'https://en.wikipedia.org/wiki/File:Moon.jpg' }, { descriptionurl: 'https://commons.wikimedia.org/wiki/Main_Page' },
  ];
  for (const change of cases) assert.equal(selectCommonsImage([commons(change)]), null);
  for (const license of ['CC BY-NC 4.0', 'CC BY-ND 4.0', 'CC BY-SA 4.0 or proprietary', 'GFDL', 'Unknown', '']) {
    const item = commons(); item.imageinfo[0].extmetadata.LicenseShortName.value = license;
    assert.equal(selectCommonsImage([item]), null);
  }
  for (const missing of ['Artist', 'LicenseUrl']) { const item = commons(); delete item.imageinfo[0].extmetadata[missing]; assert.equal(selectCommonsImage([item]), null); }
  const mismatch = commons(); mismatch.imageinfo[0].extmetadata.LicenseUrl.value = 'https://creativecommons.org/licenses/by/4.0/';
  assert.equal(selectCommonsImage([mismatch]), null);
});
