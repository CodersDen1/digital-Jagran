// Pure helpers: safe to embed in an n8n Code node after removing export keywords.
const SOURCE_HOSTS = {
  'bbc.com': 'bbc', 'bbc.co.uk': 'bbc', 'bbci.co.uk': 'bbc',
  'aljazeera.com': 'aljazeera', 'theguardian.com': 'guardian',
  'thehindu.com': 'hindu', 'hindustantimes.com': 'hindustantimes',
  'nasa.gov': 'nasa', 'un.org': 'un', 'pib.gov.in': 'pib',
};
const HOUR = 3600000;
const sourceFor = (host) => Object.entries(SOURCE_HOSTS).find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1];
const plain = (value) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (value) => plain(value).normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
const STOP = new Set('a an the and or of to in on at for from with as is are was were has have had this that after before live news latest updates update says said new over into amid'.split(' '));
const significant = (value) => new Set(tokens(value).filter((word) => word.length > 2 && !STOP.has(word)));
const exactKeys = (object, keys) => object && typeof object === 'object' && !Array.isArray(object) && Object.keys(object).length === keys.length && keys.every((key) => Object.hasOwn(object, key));

export function canonicalizeSourceUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !sourceFor(url.hostname)) return null;
    url.hostname = url.hostname.replace(/^www\./, '');
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.+|at_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|cmp|cmpid|srsltid|ref_src|ref_url|ocid|ito|intcmp|guccounter|guce_referrer|guce_referrer_sig)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.href;
  } catch { return null; }
}

// Narrow extractors for public BBC/Guardian layouts verified on
// 20 Oct 2026. No generic page text, navigation, paywall or script instructions.
export function extractPublicEvidence(html, sourceUrl) {
  const url = canonicalizeSourceUrl(sourceUrl);
  if (!url || typeof html !== 'string' || html.length > 2000000) return null;
  const host=new URL(url).hostname;
  if (/"isAccessibleForFree"\s*:\s*false|data-component=["']paywall["']|data-testid=["']paywall["']/i.test(html)) return null;
  const innerDiv = (source, start) => {
    const tail=source.slice(start.index+start[0].length);let depth=1;
    for(const tag of tail.matchAll(/<\/?div\b[^>]*>/gi)){
      depth+=/^<\//.test(tag[0])?-1:1;if(!depth)return tail.slice(0,tag.index);
    }
    return null;
  };
  let region;
  if(host==='theguardian.com'){
    if(!/"isAccessibleForFree"\s*:\s*true/.test(html))return null;
    const start=/<div\b[^>]*class=["'][^"']*\barticle-body-viewer-selector\b[^"']*["'][^>]*>/i.exec(html);
    region=start&&innerDiv(html,start);
  }else if(['bbc.com','bbc.co.uk'].includes(host)&&/^\/(news|sport)\//.test(new URL(url).pathname)){
    const article=/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i.exec(html)?.[1];
    if(!article||!/data-component=["']headline-block["']/.test(article))return null;
    region=[...article.matchAll(/<div\b[^>]*data-component=["']text-block["'][^>]*>/gi)].map(start=>innerDiv(article,start)).filter(Boolean).join('\n');
  }else return null;
  if(!region)return null;
  const body=region.replace(/<(aside|script|style|nav|footer|figure|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ');
  const entities = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',ndash:'–',mdash:'—',hellip:'…'};
  const decode = text => text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, value) => {
    if (value[0] !== '#') return entities[value.toLowerCase()] ?? all;
    const n = parseInt(value.slice(value[1]?.toLowerCase() === 'x' ? 2 : 1), value[1]?.toLowerCase() === 'x' ? 16 : 10);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
  });
  const text = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)].map(m => decode(m[1].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n\n').slice(0, 8000);
  return tokens(text).length >= 150 ? text : null;
}

export function normalizeCandidates(items, { now = Date.now() } = {}) {
  const clock = Number(new Date(now));
  if (!Array.isArray(items) || !Number.isFinite(clock)) return [];
  const seen = new Map();
  for (const wrapped of items.slice(0, 2000)) {
    const item = wrapped?.json || wrapped;
    if (!item || typeof item !== 'object') continue;
    const url = canonicalizeSourceUrl(item.url || item.link || item.guid);
    const published = Date.parse(item.publishedAt || item.isoDate || item.pubDate || item.published || '');
    const title = plain(item.title).slice(0, 500);
    if (!url || !title || !Number.isFinite(published) || clock - published > 36 * HOUR || published - clock > 300000) continue;
    const candidate = {
      url, title, source: sourceFor(new URL(url).hostname), publishedAt: new Date(published).toISOString(),
      summary: plain(item.summary || item.contentSnippet || item.description || item.content).slice(0, 12000),
      category: inferCategory(item.category || item.feedCategory, `${title} ${plain(item.contentSnippet || item.summary)}`),
    };
    // One publisher URL never counts as independent corroboration, even across feeds.
    if (!seen.has(url) || published > Date.parse(seen.get(url).publishedAt)) seen.set(url, candidate);
  }
  return [...seen.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.url.localeCompare(b.url));
}

function inferCategory(category, text) {
  // These are the existing publication's actual section slugs.
  const known = ['india', 'world', 'politics', 'business', 'technology', 'sports', 'culture', 'explained'];
  if (typeof category === 'string' && ['science', 'health', 'environment'].includes(category.toLowerCase())) return 'explained';
  if (typeof category === 'string' && known.includes(category.toLowerCase())) return category.toLowerCase();
  const value = text.toLowerCase();
  for (const [section, pattern] of [
    ['explained', /\b(nasa|space|artemis|astronaut|telescope|scientist|lunar|climate|warming|biodiversity|carbon|wildlife|health|vaccine|hospital|disease|medicine)\b/],
    ['technology', /\b(technology|software|artificial intelligence|cybersecurity)\b/],
    ['business', /\b(economy|economic|market|inflation|trade|bank)\b/],
    ['sports', /\b(cricket|football|tennis|olympic|tournament)\b/],
    ['culture', /\b(cinema|film|museum|literature|festival)\b/],
    ['politics', /\b(election|parliament|political|minister|government)\b/],
    ['india', /\b(india|indian|delhi|mumbai|parliament|pib)\b/],
  ]) if (pattern.test(value)) return section;
  return 'world';
}

function sameEvent(a, b, threshold) {
  if (a.url === b.url) return true;
  if (Math.abs(Date.parse(a.publishedAt) - Date.parse(b.publishedAt)) > 18 * HOUR) return false;
  const left = significant(a.title), right = significant(b.title);
  if (left.size < 4 || right.size < 4) return false;
  const shared = [...left].filter((token) => right.has(token)).length;
  // Conflicting numbers in otherwise similar headlines often identify different incidents.
  const numbers = (title) => (title.match(/\b\d+(?:[.,]\d+)*\b/g) || []).sort().join('|');
  if (numbers(a.title) !== numbers(b.title)) return false;
  const entities = (title) => [...new Set([...title.matchAll(/\b(?:[A-Z]{2,}|[A-Z][a-z]{2,})\b/g)].filter((match) => match.index > 0 || /^[A-Z]+$/.test(match[0])).map((match) => match[0]))].sort().join('|');
  if (entities(a.title) !== entities(b.title)) return false;
  const polarity = (title) => tokens(title).filter((word) => ['not', 'no', 'denies', 'denied', 'cancels', 'cancelled', 'canceled', 'rejects', 'rejected', 'approves', 'approved'].includes(word)).sort().join('|');
  if (polarity(a.title) !== polarity(b.title)) return false;
  return shared >= 4 && shared / new Set([...left, ...right]).size >= threshold;
}

export function clusterCandidates(candidates, { threshold = 0.72 } = {}) {
  const cutoff = Math.max(0.65, Math.min(1, Number(threshold) || 0.72));
  const clusters = [];
  for (const item of [...candidates].sort((a, b) => a.url.localeCompare(b.url))) {
    // Complete-link clustering prevents chains from joining distinct events.
    let cluster = clusters.find((group) => group.items.every((other) => sameEvent(item, other, cutoff)));
    if (!cluster) { cluster = { id: item.url, items: [] }; clusters.push(cluster); }
    if (!cluster.items.some((other) => other.url === item.url)) cluster.items.push(item);
  }
  return clusters.map((cluster) => ({ ...cluster, sources: [...new Set(cluster.items.map((item) => item.source))], latestAt: cluster.items.map((item) => item.publishedAt).sort().at(-1) }));
}

export function rankClusters(clusters, { now = Date.now() } = {}) {
  const clock = Number(new Date(now));
  const pending = clusters.map((cluster) => {
    const sources = [...new Set(cluster.items.map((item) => item.source))];
    const ageHours = Math.max(0, (clock - Date.parse(cluster.latestAt)) / HOUR);
    return { ...cluster, sources, score: Math.round((36 - Math.min(36, ageHours) + Math.min(4, sources.length - 1) * 8) * 100) / 100 };
  });
  const ranked = [], exposure = new Map();
  while (pending.length) {
    pending.sort((a, b) => (b.score - b.sources.reduce((sum, source) => sum + (exposure.get(source) || 0) * 3, 0)) - (a.score - a.sources.reduce((sum, source) => sum + (exposure.get(source) || 0) * 3, 0)) || a.id.localeCompare(b.id));
    const chosen = pending.shift();
    chosen.rankScore = chosen.score - chosen.sources.reduce((sum, source) => sum + (exposure.get(source) || 0) * 3, 0);
    chosen.sourcePacket = {
      title: chosen.items[0].title,
      category: chosen.items[0].category || 'world',
      latestAt: chosen.latestAt,
      independentSources: chosen.sources.length,
      sources: chosen.items.map(({ url, title, summary, source, publishedAt }) => ({ url, title, summary, source, publishedAt })),
    };
    ranked.push(chosen);
    chosen.sources.forEach((source) => exposure.set(source, (exposure.get(source) || 0) + 1));
  }
  return ranked;
}

export function validateVerifier(verifier) {
  const errors = [];
  if (!exactKeys(verifier, ['pass', 'unsupportedClaims', 'warnings']) || typeof verifier.pass !== 'boolean' || !Array.isArray(verifier.unsupportedClaims) || !Array.isArray(verifier.warnings) || ![...verifier.unsupportedClaims, ...verifier.warnings].every((value) => typeof value === 'string')) errors.push('Invalid verifier JSON shape.');
  else if (!verifier.pass || verifier.unsupportedClaims.length || verifier.warnings.length) errors.push('Verifier did not unconditionally approve the draft.');
  return { valid: !errors.length, errors };
}

export function validateDraft(input, { verifier, sources = [], requireVerifier = true } = {}) {
  const errors = [];
  let draft = input;
  if (typeof input === 'string') { try { draft = JSON.parse(input); } catch { return { valid: false, errors: ['Draft must be strict JSON without Markdown.'], value: null }; } }
  const fields = { title: 240, summary: 700, body: 100000, metaTitle: 70, description: 180 };
  const allowed = ['translations', 'imageSearchQuery', 'warnings', 'insufficientEvidence'];
  if (!draft || typeof draft !== 'object' || Array.isArray(draft) || Object.keys(draft).some((key) => !allowed.includes(key)) || !exactKeys(draft?.translations, ['en', 'hi'])) errors.push('Draft must contain translations.en/hi and only documented optional fields.');
  if (draft && Object.hasOwn(draft, 'imageSearchQuery') && (typeof draft.imageSearchQuery !== 'string' || !draft.imageSearchQuery.trim() || draft.imageSearchQuery.length > 120 || /<[^>]*>/.test(draft.imageSearchQuery))) errors.push('Invalid imageSearchQuery: plain text, 1–120 characters required.');
  if (draft && Object.hasOwn(draft, 'warnings') && (!Array.isArray(draft.warnings) || draft.warnings.length > 20 || !draft.warnings.every((warning) => typeof warning === 'string' && warning.length <= 1000))) errors.push('Invalid warnings: at most 20 text entries required.');
  if (draft && Object.hasOwn(draft, 'insufficientEvidence') && typeof draft.insufficientEvidence !== 'boolean') errors.push('insufficientEvidence must be boolean.');
  if (draft?.insufficientEvidence === true) errors.push('Draft reports insufficient evidence; do not publish or pay for verification.');
  for (const locale of ['en', 'hi']) {
    const translation = draft?.translations?.[locale];
    if (!exactKeys(translation, Object.keys(fields))) { errors.push(`Invalid ${locale} translation fields.`); continue; }
    for (const [field, limit] of Object.entries(fields)) {
      const value = translation[field];
      if (typeof value !== 'string' || !value.trim() || value.length > limit || /<[^>]*>|&(?:lt|gt|#0*60|#x0*3c);/i.test(value) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value) || (locale === 'hi' && !/[\u0900-\u097f]/u.test(value))) errors.push(`Invalid ${locale}.${field}.`);
    }
    if (typeof translation.body !== 'string') continue;
    const words = tokens(translation.body);
    if (locale === 'en' && (words.filter((word) => /[a-z]/i.test(word)).length < 120 || new Set(words).size < 30)) errors.push('English body needs at least 120 substantive words.');
    if (locale === 'hi' && (words.length < 60 || (translation.body.match(/[\u0900-\u097f]/g) || []).length < 200 || new Set(words).size < 20)) errors.push('Hindi body must contain meaningful Hindi reporting.');
  }
  const validSources = (Array.isArray(sources) ? sources : []).filter((source) => canonicalizeSourceUrl(source?.url || source?.link) && typeof source.title === 'string');
  if (!validSources.length) errors.push('At least one allowed source is required.');
  const evidence = significant(validSources.map((source) => `${source.title} ${source.summary || source.description || ''}`).join(' '));
  for (const field of ['title', 'metaTitle']) {
    const words = significant(draft?.translations?.en?.[field]);
    if (words.size < 2 || [...words].filter((word) => evidence.has(word)).length / words.size < 0.5) errors.push(`English ${field} must be grounded in source text.`);
  }
  const numerals = (text) => (String(text ?? '').replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966)).match(/\d+(?:[.,]\d+)*/g) || []);
  const evidenceNumbers = new Set(numerals(validSources.map((source) => `${source.title} ${source.summary || source.description || ''}`).join(' ')));
  for (const locale of ['en', 'hi']) for (const field of ['title', 'metaTitle']) {
    if (numerals(draft?.translations?.[locale]?.[field]).some((number) => !evidenceNumbers.has(number))) errors.push(`Unsupported numeric claim in ${locale}.${field}.`);
  }
  if (requireVerifier !== false) errors.push(...validateVerifier(verifier).errors);
  return { valid: !errors.length, errors, value: !errors.length ? draft : null };
}

export function validateDraftStructure(draft, { sources = [] } = {}) {
  return validateDraft(draft, { sources, requireVerifier: false });
}

export function selectCommonsImage(candidates, { label = 'Illustrative image; not an event photograph' } = {}) {
  for (const candidate of candidates || []) {
    const info = candidate?.imageinfo?.[0] || candidate;
    if (!info) continue;
    const meta = info.extmetadata || {};
    const license = plain(info.license || meta.LicenseShortName?.value);
    const artist = plain(info.artist || meta.Artist?.value);
    const licenseValue = info.licenseUrl || info.licenseURL || meta.LicenseUrl?.value;
    try {
      const url = new URL(info.url), page = new URL(info.source || info.descriptionurl), licenseUrl = new URL(licenseValue);
      if ([url, page, licenseUrl].some((value) => value.protocol !== 'https:' || value.username || value.password || value.port)) continue;
      if (url.hostname !== 'upload.wikimedia.org' || !url.pathname.startsWith('/wikipedia/commons/') || !/\.(png|jpe?g|webp)$/i.test(url.pathname)) continue;
      if (page.hostname !== 'commons.wikimedia.org' || !/^\/wiki\/File:.+/i.test(page.pathname)) continue;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(info.mime) || !Number.isSafeInteger(info.size) || info.size <= 0 || info.size > 5 * 1024 * 1024 || !artist || artist.length > 1000) continue;
      if (licenseUrl.hostname !== 'creativecommons.org' || /(?:^|[-\s])(NC|ND)(?:$|[-\s])/i.test(license)) continue;
      const match = license.match(/^CC[ -]BY([ -]SA)?[ -](\d\.\d)$/i);
      const cc0 = /^CC0(?: 1\.0)?$/i.test(license), pd = /^(?:PD|Public domain|Public domain mark)$/i.test(license);
      const expected = match ? `/licenses/by${match[1] ? '-sa' : ''}/${match[2]}/` : cc0 ? '/publicdomain/zero/1.0/' : pd ? '/publicdomain/mark/1.0/' : null;
      if (!expected || licenseUrl.pathname !== expected) continue;
      const note = 'Illustrative image; not an event photograph';
      const title = plain(candidate.title || 'Illustrative image');
      return { url: url.href, title, source: page.href, sourceUrl: page.href, license, licenseUrl: licenseUrl.href, artist, creator: artist, credit: `${artist} / Wikimedia Commons / ${license}`, mime: info.mime, size: info.size, illustrative: true, caption: label === note ? note : `${plain(label)} — ${note}`, reference: { title, label: `${title} — ${license}; ${artist}`, url: page.href, sourceUrl: page.href, creator: artist, license, licenseUrl: licenseUrl.href } };
    } catch { /* Reject incomplete or ambiguous licensing metadata. */ }
  }
  return null;
}
