const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { mongoStore } = require("../newsroom/store");
const { validateArticle } = require("../newsroom/domain");
const { createApp } = require("../newsroom/app");
const uri = process.env.TEST_MONGODB_URI;
test(
  "Mongo replica set: atomic keyed writes, shared sessions/rates, indexes, legacy data and pagination",
  { skip: !uri, timeout: 60000 },
  async () => {
    const parsed = new URL(uri);
    assert.match(
      parsed.pathname,
      /^\/dj_test_[a-zA-Z0-9_]+$/,
      "TEST_MONGODB_URI must explicitly name a disposable dj_test_ database",
    );
    const setup = await mongoose
      .createConnection(uri, {
        autoIndex: false,
        autoCreate: false,
        serverSelectionTimeoutMS: 5000,
      })
      .asPromise();
    let a, b, first, second;
    const story = (slug = "mongo-" + crypto.randomUUID()) =>
      validateArticle({
        slug,
        category: "india",
        status: "published",
        author: "Reporter",
        translations: {
          en: {
            title: "Mongo report",
            summary: "Summary",
            body: "Verified body",
          },
        },
      });
    try {
      assert.ok((await setup.db.admin().command({ hello: 1 })).setName);
      const migrate = (args) =>
        spawnSync(
          process.execPath,
          [path.resolve(__dirname, "../newsroom/indexes.js"), ...args],
          {
            env: { ...process.env, MONGODB_URI: uri },
            encoding: "utf8",
            windowsHide: true,
          },
        );
      const dry = migrate([]);
      assert.equal(dry.status, 0, dry.stderr);
      assert.match(dry.stdout, /index_migration_dry_run/);
      assert.equal(
        (await setup.db.listCollections().toArray()).length,
        0,
        "Dry-run must not create collections or indexes",
      );
      await assert.rejects(mongoStore(uri), /ns does not exist|Missing/i);
      const applied = migrate(["--apply"]);
      assert.equal(applied.status, 0, applied.stderr);
      assert.match(applied.stdout, /index_migration_complete/);
      a = await mongoStore(uri);
      b = await mongoStore(uri);
      const input = story(),
        key = crypto.randomUUID();
      const write = (store) =>
        store.idempotent(key, "same-hash", async () => ({
          status: 201,
          body: { article: await store.save(input) },
        }));
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, i) => write(i % 2 ? a : b)),
      );
      assert.ok(results.every((x) => x.status === 201));
      assert.equal(new Set(results.map((x) => x.body.article.id)).size, 1);
      assert.equal(results.filter((x) => x.replayed).length, 11);
      assert.equal((await a.query({ public: true })).pagination.total, 1);
      await assert.rejects(
        b.idempotent(key, "different-hash", async () => {
          throw new Error("must not execute");
        }),
        (e) => e.status === 409,
      );
      const rollbackKey = crypto.randomUUID();
      await assert.rejects(
        a.idempotent(rollbackKey, "rollback", async () => {
          await a.save(story("rollback-story"));
          throw new Error("abort");
        }),
      );
      assert.equal(await b.get("rollback-story"), undefined);
      assert.equal(
        await setup.db
          .collection("newsroom_idempotency")
          .countDocuments({ _id: rollbackKey }),
        0,
      );
      await a.close();
      a = await mongoStore(uri);
      const persisted = await write(a);
      assert.equal(persisted.replayed, true);
      assert.equal(persisted.body.article.id, results[0].body.article.id);
      const revisions = await Promise.allSettled([
        a.save(
          {
            ...results[0].body.article,
            updatedAt: new Date(Date.now() + 10).toISOString(),
            author: "A",
          },
          results[0].body.article.updatedAt,
        ),
        b.save(
          {
            ...results[0].body.article,
            updatedAt: new Date(Date.now() + 20).toISOString(),
            author: "B",
          },
          results[0].body.article.updatedAt,
        ),
      ]);
      assert.equal(revisions.filter((x) => x.status === "fulfilled").length, 1);
      const rateKey = "test-rate:" + crypto.randomUUID();
      const rates = await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          (i % 2 ? a : b).rateLimit(rateKey, 8, 60000),
        ),
      );
      assert.equal(rates.filter((x) => x.allowed).length, 8);
      first = createApp({
        store: a,
        adminEmail: "editor@mongo.test",
        adminPassword: "mongo-test-password",
        logger: () => {},
      }).listen(0, "127.0.0.1");
      second = createApp({
        store: b,
        adminEmail: "editor@mongo.test",
        adminPassword: "mongo-test-password",
        logger: () => {},
      }).listen(0, "127.0.0.1");
      await Promise.all(
        [first, second].map(
          (s) =>
            new Promise((r) => (s.listening ? r() : s.once("listening", r))),
        ),
      );
      const base1 = `http://127.0.0.1:${first.address().port}`,
        base2 = `http://127.0.0.1:${second.address().port}`;
      const login = await fetch(base1 + "/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "editor@mongo.test",
          password: "mongo-test-password",
        }),
      });
      assert.equal(login.status, 200);
      const cookie = login.headers.get("set-cookie").split(";")[0];
      assert.equal(
        (await fetch(base2 + "/api/v1/auth/me", { headers: { cookie } }))
          .status,
        200,
      );
      const raw = await setup.db.collection("newsroom_sessions").findOne({});
      assert.ok(raw._id !== cookie.split("=")[1]);
      await fetch(base2 + "/api/v1/auth/logout", {
        method: "POST",
        headers: { cookie, "Content-Type": "application/json" },
        body: "{}",
      });
      assert.equal(
        (await fetch(base1 + "/api/v1/auth/me", { headers: { cookie } }))
          .status,
        401,
      );
      const legacy = {
        slug: "legacy-mongo",
        article_header_en: "Legacy headline",
        body_en: "<p>Legacy HTML</p>",
        summary_en: "Legacy summary",
        photos: [
          "https://example.test/one.jpg",
          "https://example.test/two.jpg",
        ],
        elementContent: { layout: "preserve" },
        is_Published: true,
        published_language: "en",
        createdAt: new Date(),
        updatedAt: new Date(),
        tags_en: ["india"],
      };
      await setup.db.collection("articles").insertOne(legacy);
      const adapted = await a.get("legacy-mongo", true);
      assert.equal(adapted.translations.en.body, "Legacy HTML");
      const saved = await a.save(
        validateArticle(
          {
            ...adapted,
            translations: {
              en: { ...adapted.translations.en, title: "Modern headline" },
            },
          },
          adapted,
        ),
        adapted.updatedAt,
      );
      const original = await setup.db
        .collection("articles")
        .findOne({ slug: "legacy-mongo" });
      assert.deepEqual(original.photos, [
        "https://example.test/one.jpg",
        "https://example.test/two.jpg",
      ]);
      assert.equal(original.body_en, "<p>Legacy HTML</p>");
      assert.deepEqual(original.elementContent, { layout: "preserve" });
      assert.equal(original.schemaVersion, 2);
      await assert.rejects(
        b.save(story("legacy-mongo")),
        (e) => e.status === 409,
      );
      const paged = await b.query({
        public: true,
        locale: "en",
        section: "india",
        q: "headline",
        pageSize: 1,
      });
      assert.equal(paged.pagination.total, 1);
      assert.equal(paged.articles[0].id, saved.id);
      const mapRows = await b.query({
        public: true,
        internal: true,
        sitemap: true,
        pageSize: 500,
      });
      assert.ok(
        mapRows.articles.every((a) => a.translations.en.body === "available"),
      );
      const counts = await b.counts();
      assert.equal(counts.published, 2);
      const newsletterKey = crypto.randomUUID();
      await Promise.all(
        [a, b].map((store) =>
          store.idempotent(newsletterKey, "newsletter", async () => {
            await store.subscribe("reader@mongo.test");
            return { status: 201, body: { ok: true } };
          }),
        ),
      );
      assert.equal(
        (await a.subscriberQuery({ q: "reader", pageSize: 1 })).pagination
          .total,
        1,
      );
      await Promise.all(
        Array.from({ length: 8 }, (_, i) => {
          const store = i % 2 ? a : b;
          return store.idempotent(
            crypto.randomUUID(),
            "same-email",
            async () => {
              await store.subscribe("concurrent@mongo.test");
              return { status: 201, body: { ok: true } };
            },
          );
        }),
      );
      assert.equal(
        (await a.subscriberQuery({ q: "concurrent", pageSize: 1 })).pagination
          .total,
        1,
      );
      assert.equal(await a.ready(), true);
    } finally {
      for (const server of [first, second])
        if (server) await new Promise((r) => server.close(r));
      for (const store of [a, b]) if (store) await store.close();
      await setup.dropDatabase();
      await setup.close();
    }
  },
);
