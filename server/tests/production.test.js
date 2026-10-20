const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { fileStore } = require("../newsroom/store");
const { createApp } = require("../newsroom/app");
const { validateArticle } = require("../newsroom/domain");
let store, server, base, dir, cookie, app;
const story = (overrides = {}) => ({
  slug: "v1-" + crypto.randomUUID(),
  category: "india",
  status: "published",
  author: "Reporter",
  translations: {
    en: {
      title: "Production report",
      summary: "Summary",
      body: "Verified body content",
    },
  },
  ...overrides,
});
async function call(
  route,
  { method = "GET", body, key, headers = {}, auth = false } = {},
) {
  const response = await fetch(base + route, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(key ? { "Idempotency-Key": key } : {}),
      ...(auth ? { cookie } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { response, data };
}
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "dj-v1-"));
  store = await fileStore(path.join(dir, "store.json"), false);
  app = createApp({
    store,
    adminEmail: "editor@test.local",
    adminPassword: "password-for-testing",
    logger: () => {},
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
  const result = await call("/api/v1/auth/login", {
    method: "POST",
    body: { email: "editor@test.local", password: "password-for-testing" },
  });
  assert.equal(result.response.status, 200);
  cookie = result.response.headers.get("set-cookie").split(";")[0];
});
after(async () => {
  await new Promise((r) => server.close(r));
  await store.close();
  await fs.rm(dir, { recursive: true });
});
test("v1 keyed concurrent writes replay one durable response and reject payload mismatch", async () => {
  const body = story(),
    key = crypto.randomUUID();
  assert.equal(
    (await call("/api/v1/admin/articles", { method: "POST", body, auth: true }))
      .response.status,
    422,
  );
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      call("/api/v1/admin/articles", { method: "POST", body, key, auth: true }),
    ),
  );
  assert.ok(results.every((r) => r.response.status === 201));
  assert.equal(new Set(results.map((r) => r.data.article.id)).size, 1);
  assert.equal(
    results.filter(
      (r) => r.response.headers.get("idempotency-replayed") === "true",
    ).length,
    7,
  );
  const mismatch = await call("/api/v1/admin/articles", {
    method: "POST",
    body: { ...body, author: "Other" },
    key,
    auth: true,
  });
  assert.equal(mismatch.response.status, 409);
  const reopened = await fileStore(path.join(dir, "store.json"), false);
  const ledger = JSON.parse(
    await fs.readFile(path.join(dir, "store.json"), "utf8"),
  ).ledger;
  assert.equal(Object.values(ledger).length, 1);
  assert.equal(Object.values(ledger)[0].result.status, 201);
  assert.equal((await reopened.query({ public: true })).pagination.total, 1);
  await reopened.close();
});
test("failed transaction rolls back write and ledger, allowing same-key retry", async () => {
  const a = validateArticle(story());
  await assert.rejects(
    store.idempotent("rollback-key", "hash", async () => {
      await store.save(a);
      throw new Error("rollback");
    }),
  );
  assert.equal(await store.get(a.id), undefined);
  const success = await store.idempotent("rollback-key", "hash", async () => ({
    status: 201,
    body: { article: await store.save(a) },
  }));
  assert.equal(success.body.article.id, a.id);
});
test("public/admin pagination filters persistence and removes bodies from public list cards", async () => {
  for (let i = 0; i < 25; i++)
    await store.save(
      validateArticle(
        story({
          slug: `pagination-${i}`,
          status: i < 24 ? "published" : "draft",
        }),
      ),
    );
  const result = await call(
    "/api/v1/page?path=" +
      encodeURIComponent("/en/section/india?page=2&utm_source=test"),
  );
  assert.equal(result.response.status, 200);
  assert.equal(result.data.path, "/en/section/india?page=2&utm_source=test");
  assert.equal(result.data.pagination.page, 2);
  assert.equal(result.data.articles.length, 12);
  assert.ok(result.data.articles.every((a) => !("body" in a)));
  assert.ok(result.data.latest.length <= 5 && result.data.breaking.length <= 3);
  const admin = await call(
    "/api/v1/admin/articles?page=1&pageSize=2&status=draft&q=Production",
    { auth: true },
  );
  assert.equal(admin.data.articles.length, 1);
  assert.equal(admin.data.pagination.total, 1);
  assert.ok(admin.data.counts.published >= 24);
  const unsafe = await call(
    "/api/v1/admin/articles?pageSize=99999&internal=true",
    { auth: true },
  );
  assert.equal(unsafe.data.pagination.pageSize, 100);
  const home = await call("/api/v1/page?path=/en");
  assert.ok(home.data.articles.length <= 30);
});
test("section metadata preserves pagination and search/saved omit hreflang", async () => {
  const section = await call("/en/section/india?page=2&utm_source=test");
  assert.equal(section.response.status, 200);
  assert.match(
    section.data,
    /rel="canonical" href="http:\/\/localhost:5001\/en\/section\/india\?page=2"/,
  );
  assert.match(
    section.data,
    /hreflang="hi" href="http:\/\/localhost:5001\/hi\/section\/india\?page=2"/,
  );
  for (const route of ["/en/search?q=report", "/en/saved", "/en/missing"]) {
    const result = await call(route);
    assert.ok(!result.data.includes("hreflang="));
    assert.equal(result.response.headers.get("cache-control"), "no-store");
  }
});
test("archive requires matching revision and key and replays safely", async () => {
  const a = await store.save(validateArticle(story()));
  const key = crypto.randomUUID();
  assert.equal(
    (
      await call("/api/v1/admin/articles/" + a.id, {
        method: "DELETE",
        body: {},
        key,
        auth: true,
      })
    ).response.status,
    422,
  );
  assert.equal(
    (
      await call("/api/v1/admin/articles/" + a.id, {
        method: "DELETE",
        body: { updatedAt: "2020-01-01" },
        key,
        auth: true,
      })
    ).response.status,
    409,
  );
  const body = { updatedAt: a.updatedAt };
  assert.equal(
    (
      await call("/api/v1/admin/articles/" + a.id, {
        method: "DELETE",
        body,
        key,
        auth: true,
      })
    ).response.status,
    200,
  );
  const replay = await call("/api/v1/admin/articles/" + a.id, {
    method: "DELETE",
    body,
    key,
    auth: true,
  });
  assert.equal(replay.response.headers.get("idempotency-replayed"), "true");
});
test("private/search/saved/errors are no-store, public JSON revalidates with ETag", async () => {
  for (const route of [
    "/api/v1/admin/articles",
    "/api/v1/auth/me",
    "/api/v1/page?path=/en/search?q=report",
    "/api/v1/page?path=/en/saved",
    "/api/v1/missing",
  ]) {
    const r = await call(route, {
      auth: route.includes("admin") || route.includes("auth"),
    });
    assert.equal(r.response.headers.get("cache-control"), "no-store", route);
  }
  const publicResponse = await call("/api/v1/page?path=/en");
  assert.equal(
    publicResponse.response.headers.get("cache-control"),
    "no-cache",
  );
  assert.ok(publicResponse.response.headers.get("etag"));
  const conditional = await call("/api/v1/page?path=/en", {
    headers: {
      "Cache-Control": "max-age=0",
      "If-None-Match": publicResponse.response.headers.get("etag"),
    },
  });
  assert.equal(conditional.response.status, 304);
  const privateResponse = await call("/api/v1/page?path=/en", { auth: true });
  assert.equal(
    privateResponse.response.headers.get("cache-control"),
    "no-store",
  );
});
test("request correlation and metrics use bounded route labels without private content", async () => {
  const trace = "00-12345678901234567890123456789012-1234567890123456-01";
  const result = await call("/health/live", {
    headers: { "X-Request-Id": "test-request", traceparent: trace },
  });
  assert.equal(result.response.headers.get("x-request-id"), "test-request");
  assert.equal(result.response.headers.get("traceparent"), trace);
  const metrics = app.locals.metrics();
  assert.match(metrics, /dj_http_request_duration_seconds_bucket/);
  assert.ok(
    !metrics.includes("pagination-") && !metrics.includes("editor@test.local"),
  );
});
test("readiness fails on storage outage and draining; liveness remains live", async () => {
  assert.equal((await call("/health/ready")).response.status, 200);
  const ready = store.ready;
  store.ready = async () => {
    throw new Error("storage down");
  };
  assert.equal((await call("/health/ready")).response.status, 503);
  assert.equal((await call("/health/live")).response.status, 200);
  store.ready = ready;
  app.locals.lifecycle.draining = true;
  assert.equal((await call("/health/ready")).response.status, 503);
  assert.equal((await call("/api/v1/page?path=/en")).response.status, 503);
  app.locals.lifecycle.draining = false;
});
test("newsletter rate limit is bounded, ignores untrusted forwarded IPs, and returns Retry-After", async () => {
  let result;
  for (let i = 0; i < 21; i++)
    result = await call("/api/v1/newsletter", {
      method: "POST",
      body: { email: "reader@test.local", consent: true },
      key: crypto.randomUUID(),
      headers: { "X-Forwarded-For": `192.0.2.${i}` },
    });
  assert.equal(result.response.status, 429);
  assert.ok(Number(result.response.headers.get("retry-after")) > 0);
  const subs = await call("/api/v1/admin/subscribers?pageSize=1", {
    auth: true,
  });
  assert.equal(subs.data.pagination.total, 1);
  assert.equal(subs.data.subscribers.length, 1);
});
