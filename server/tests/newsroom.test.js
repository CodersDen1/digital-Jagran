const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { fileStore } = require("../newsroom/store");
const { createApp } = require("../newsroom/app");
const {
  validateArticle,
  normalizeLegacy,
  isPublic,
} = require("../newsroom/domain");
let directory, store, server, base, cookie;
async function call(
  route,
  { method = "GET", body, authenticated = false, headers = {} } = {},
) {
  const response = await fetch(base + route, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(authenticated ? { Cookie: cookie } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const content = await response.text();
  let data;
  try {
    data = JSON.parse(content);
  } catch {
    data = content;
  }
  return { response, data };
}
function story(overrides = {}) {
  return {
    slug: `test-${crypto.randomUUID()}`,
    category: "india",
    status: "draft",
    author: "Test Reporter",
    publishedAt: new Date().toISOString(),
    image: "",
    imageAlt: "",
    translations: {
      en: {
        title: "An original report",
        summary: "The context behind this original report.",
        body: "Verified article body.\n\nA second paragraph.",
        description: "A specific description.",
      },
    },
    ...overrides,
  };
}
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "dj-newsroom-test-"));
  store = await fileStore(path.join(directory, "store.json"), false);
  const app = createApp({
    store,
    adminEmail: "editor@example.test",
    adminPassword: "secure-test-password",
    origin: "https://news.example.test",
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const result = await call("/api/auth/login", {
    method: "POST",
    body: { email: "editor@example.test", password: "secure-test-password" },
  });
  assert.equal(result.response.status, 200);
  cookie = result.response.headers.get("set-cookie").split(";")[0];
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await store.close();
  await fs.rm(directory, { recursive: true });
});

test("server authorization protects stories and audience data", async () => {
  for (const route of [
    "/api/admin/articles",
    "/api/admin/stats",
    "/api/admin/subscribers",
  ])
    assert.equal((await call(route)).response.status, 401);
  const denied = await call("/api/admin/articles", {
    method: "POST",
    body: story(),
  });
  assert.equal(denied.response.status, 401);
});
test("login rejects wrong credentials and issues HttpOnly cookies", async () => {
  assert.equal(
    (
      await call("/api/auth/login", {
        method: "POST",
        body: { email: "editor@example.test", password: "wrong" },
      })
    ).response.status,
    401,
  );
  const result = await call("/api/auth/login", {
    method: "POST",
    body: { email: "editor@example.test", password: "secure-test-password" },
  });
  assert.match(result.response.headers.get("set-cookie"), /HttpOnly/);
  assert.match(result.response.headers.get("set-cookie"), /SameSite=Lax/);
  assert.equal(
    (await call("/api/auth/me", { authenticated: true })).data.user.role,
    "editor",
  );
});
test("cross-origin and form-style mutation attempts are rejected", async () => {
  assert.equal(
    (
      await call("/api/admin/articles", {
        method: "POST",
        authenticated: true,
        headers: { Origin: "https://untrusted.example" },
        body: story(),
      })
    ).response.status,
    403,
  );
  const response = await fetch(base + "/api/admin/articles", {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "text/plain" },
    body: "{}",
  });
  assert.equal(response.status, 415);
});
test("draft to review to published flow keeps drafts out of all public responses", async () => {
  const created = await call("/api/admin/articles", {
    method: "POST",
    authenticated: true,
    body: story(),
  });
  assert.equal(created.response.status, 201);
  let a = created.data.article;
  assert.equal(
    (await call(`/api/page?path=/en/article/${a.slug}`)).response.status,
    404,
  );
  assert.doesNotMatch((await call("/sitemap.xml")).data, new RegExp(a.slug));
  a = (
    await call(`/api/admin/articles/${a.id}`, {
      method: "PUT",
      authenticated: true,
      body: { ...a, status: "review" },
    })
  ).data.article;
  assert.equal(a.status, "review");
  a = (
    await call(`/api/admin/articles/${a.id}`, {
      method: "PUT",
      authenticated: true,
      body: { ...a, status: "published" },
    })
  ).data.article;
  const page = await call(`/api/page?path=/en/article/${a.slug}`);
  assert.equal(page.data.article.title, "An original report");
  assert.match((await call("/sitemap.xml")).data, new RegExp(a.slug));
});
test("source references and corrections survive save and public projection", async () => {
  const payload = story({
    status: "published",
    sources: [
      { label: "Primary document", url: "https://example.org/document" },
    ],
    correction: "Corrected an earlier date.",
  });
  const { data } = await call("/api/admin/articles", {
    method: "POST",
    authenticated: true,
    body: payload,
  });
  const page = (await call(`/api/page?path=/en/article/${data.article.slug}`))
    .data;
  assert.deepEqual(page.article.sources, payload.sources);
  assert.equal(page.article.correction, payload.correction);
  assert.equal(
    (
      await call("/api/admin/articles", {
        method: "POST",
        authenticated: true,
        body: story({
          sources: [{ label: "Bad", url: "javascript:alert(1)" }],
        }),
      })
    ).response.status,
    422,
  );
});
test("locale availability, Unicode slugs and SSR metadata stay consistent", async () => {
  const payload = story({
    slug: "हिंदी-परीक्षण",
    status: "published",
    translations: {
      hi: {
        title: "हिंदी शीर्षक",
        summary: "सत्यापित सारांश",
        body: "हिंदी में पूरी खबर।",
      },
    },
  });
  const { data } = await call("/api/admin/articles", {
    method: "POST",
    authenticated: true,
    body: payload,
  });
  assert.equal(
    (
      await call(
        `/api/page?path=${encodeURIComponent(`/en/article/${data.article.slug}`)}`,
      )
    ).response.status,
    404,
  );
  const encoded = encodeURI(`/hi/article/${data.article.slug}`);
  const html = await call(encoded);
  assert.equal(html.response.status, 200);
  assert.match(html.data, /<html lang="hi">/);
  assert.match(html.data, /हिंदी शीर्षक/);
  assert.equal((html.data.match(/rel="canonical"/g) || []).length, 1);
  assert.match(html.data, /NewsArticle/);
  assert.match(html.data, /"isAccessibleForFree":true/);
  const hreflang = [...html.data.matchAll(/hreflang="([^"]+)"/g)].map(
    (x) => x[1],
  );
  assert.deepEqual(hreflang, ["hi"]);
});
test("concurrent saves are atomic and reject the stale editor", async () => {
  const a = (
    await call("/api/admin/articles", {
      method: "POST",
      authenticated: true,
      body: story(),
    })
  ).data.article;
  const results = await Promise.all(
    [1, 2].map((i) =>
      call(`/api/admin/articles/${a.id}`, {
        method: "PUT",
        authenticated: true,
        body: { ...a, author: `Editor ${i}` },
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.response.status).sort(), [200, 409]);
});
test("validation prevents duplicate or empty slugs and incomplete publication", async () => {
  const a = story();
  assert.equal(
    (
      await call("/api/admin/articles", {
        method: "POST",
        authenticated: true,
        body: a,
      })
    ).response.status,
    201,
  );
  assert.equal(
    (
      await call("/api/admin/articles", {
        method: "POST",
        authenticated: true,
        body: a,
      })
    ).response.status,
    409,
  );
  assert.throws(
    () => validateArticle(story({ slug: "!!!" })),
    /letter or number/,
  );
  assert.equal(
    (
      await call("/api/admin/articles", {
        method: "POST",
        authenticated: true,
        body: story({
          status: "published",
          translations: { en: { title: "Incomplete" } },
        }),
      })
    ).response.status,
    422,
  );
});
test("publication schedules are enforced without exposing future articles", async () => {
  const a = (
    await call("/api/admin/articles", {
      method: "POST",
      authenticated: true,
      body: story({
        status: "scheduled",
        publishedAt: new Date(Date.now() + 3600000).toISOString(),
      }),
    })
  ).data.article;
  assert.equal(
    (await call(`/api/page?path=/en/article/${a.slug}`)).response.status,
    404,
  );
  assert.equal(
    isPublic({ ...a, publishedAt: new Date(Date.now() - 1).toISOString() }),
    true,
  );
  assert.throws(
    () =>
      validateArticle(
        story({
          status: "scheduled",
          publishedAt: new Date(Date.now() - 1000).toISOString(),
        }),
      ),
    /future/,
  );
});
test("archiving removes the article from public pages and remains reversible", async () => {
  let a = (
    await call("/api/admin/articles", {
      method: "POST",
      authenticated: true,
      body: story({ status: "published" }),
    })
  ).data.article;
  assert.equal(
    (
      await call(`/api/admin/articles/${a.id}`, {
        method: "DELETE",
        authenticated: true,
        body: {},
      })
    ).response.status,
    200,
  );
  assert.equal(
    (await call(`/api/page?path=/en/article/${a.slug}`)).response.status,
    404,
  );
  a = (await call(`/api/admin/articles/${a.id}`, { authenticated: true })).data
    .article;
  assert.equal(a.status, "archived");
  assert.equal(
    (
      await call(`/api/admin/articles/${a.id}`, {
        method: "PUT",
        authenticated: true,
        body: { ...a, status: "draft" },
      })
    ).data.article.status,
    "draft",
  );
});
test("newsletter requires consent and deduplicates email addresses durably", async () => {
  assert.equal(
    (
      await call("/api/newsletter", {
        method: "POST",
        body: { email: "reader@example.test" },
      })
    ).response.status,
    422,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await call("/api/newsletter", {
          method: "POST",
          body: { email: "Reader@example.test", consent: true },
        })
      ).response.status,
      201,
    );
  const list = (await call("/api/admin/subscribers", { authenticated: true }))
    .data.subscribers;
  assert.equal(list.length, 1);
  assert.equal(list[0].email, "reader@example.test");
  const reopened = await fileStore(path.join(directory, "store.json"), false);
  assert.equal((await reopened.subscribers()).length, 1);
  await reopened.close();
});
test("rendered article text and serialized JSON cannot break out into script markup", async () => {
  const payload = story({
    status: "published",
    translations: {
      en: {
        title: "Safe title </script><script>alert(1)</script>",
        summary: "Context",
        body: "<script>alert(1)</script>\n\nA useful paragraph.",
      },
    },
  });
  const { data } = await call("/api/admin/articles", {
    method: "POST",
    authenticated: true,
    body: payload,
  });
  const html = (await call(`/en/article/${data.article.slug}`)).data;
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;/);
});
test("news sitemap includes only recent published stories and escapes XML", async () => {
  const old = (
    await call("/api/admin/articles", {
      method: "POST",
      authenticated: true,
      body: story({
        status: "published",
        publishedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      }),
    })
  ).data.article;
  const xml = (await call("/news-sitemap.xml")).data;
  assert.doesNotMatch(xml, new RegExp(old.slug));
  assert.match(xml, /xmlns:news=/);
});
test("legacy article adaptation does not publish private content or invent translations", () => {
  const legacy = normalizeLegacy({
    _id: "legacy",
    article_header_en: "English",
    body_en: "<p>Body</p>",
    article_header: "हिंदी",
    body: "हिंदी",
    published_language: "en",
    is_Published: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  assert.equal(isPublic(legacy), false);
  assert.equal(legacy.translations.hi, undefined);
  assert.equal(legacy.translations.en.body, "Body");
});
test("unknown pages return 404, private HTML is noindex, and robots permits public crawling", async () => {
  assert.equal((await call("/en/does-not-exist")).response.status, 404);
  const cms = await call("/newsroom/");
  assert.match(cms.response.headers.get("x-robots-tag"), /noindex/);
  const robots = (await call("/robots.txt")).data;
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Disallow: \/newsroom\//);
});

test("elapsed schedules are editable as published stories", async () => {
  const scheduled = validateArticle(
    story({
      status: "scheduled",
      publishedAt: new Date(Date.now() + 60000).toISOString(),
    }),
  );
  await store.save({
    ...scheduled,
    publishedAt: new Date(Date.now() - 1000).toISOString(),
  });
  const a = (
    await call(`/api/admin/articles/${scheduled.id}`, { authenticated: true })
  ).data.article;
  assert.equal(a.status, "published");
  assert.equal(
    (
      await call(`/api/admin/articles/${a.id}`, {
        method: "PUT",
        authenticated: true,
        body: a,
      })
    ).response.status,
    200,
  );
});
test("existing Mongo updates preserve legacy gallery and rich HTML fields", () => {
  const { mongoChanges } = require("../newsroom/store");
  const a = validateArticle(story());
  const update = mongoChanges(a, true);
  assert.equal(Object.hasOwn(update, "photos"), false);
  assert.equal(Object.hasOwn(update, "body_en"), false);
  assert.equal(Object.hasOwn(update, "body"), false);
  assert.deepEqual(update.translations, a.translations);
  assert.equal(mongoChanges(a, false).body_en, a.translations.en.body);
});
test("default metadata follows the headline instead of freezing the first draft", () => {
  const a = validateArticle(story());
  assert.equal(a.translations.en.metaTitle, "");
  const b = validateArticle(
    {
      ...a,
      translations: {
        en: { ...a.translations.en, title: "A clearer headline" },
      },
    },
    a,
  );
  assert.equal(b.translations.en.metaTitle, "");
  assert.equal(b.translations.en.title, "A clearer headline");
});
test("RSS is bilingual and private workflow states stay out of feeds", async () => {
  const result = await call("/en/feed.xml");
  assert.equal(result.response.status, 200);
  assert.match(
    result.response.headers.get("content-type"),
    /application\/rss\+xml/,
  );
  assert.match(result.data, /<language>en<\/language>/);
  assert.match((await call("/hi/feed.xml")).data, /<language>hi<\/language>/);
});


test("Mongo Date revisions retain milliseconds through editor saves", async (t) => {
  const revision = "2026-10-20T16:50:00.731Z";
  const initial = { ...validateArticle(story()), updatedAt: revision };
  await store.save(initial);
  const originalGet = store.get;
  store.get = async (...args) => {
    const result = await originalGet(...args);
    return result?.id === initial.id ? { ...result, updatedAt: new Date(result.updatedAt) } : result;
  };
  t.after(() => { store.get = originalGet; });
  const route = "/api/v1/admin/articles/" + initial.id;
  const loaded = await call(route, { authenticated: true });
  assert.equal(loaded.data.article.updatedAt, revision);
  const edited = { ...loaded.data.article, author: "Updated reporter" };
  const saved = await call(route, {
    authenticated: true, method: "PUT", body: edited,
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  assert.equal(saved.response.status, 200, JSON.stringify(saved.data));
  assert.equal(saved.data.article.author, "Updated reporter");
  const stale = await call(route, {
    authenticated: true, method: "PUT", body: edited,
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  assert.equal(stale.response.status, 409, "A real stale edit must still be rejected");
});

test("revisions advance past Mongo Date values even within the same millisecond", () => {
  const previous = { ...validateArticle(story()), updatedAt: new Date(Math.floor(Date.now() / 1000) * 1000 + 60731) };
  const next = validateArticle(previous, previous);
  assert.equal(new Date(next.updatedAt).getTime(), previous.updatedAt.getTime() + 1);
});
