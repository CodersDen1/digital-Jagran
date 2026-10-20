const { AsyncLocalStorage } = require("node:async_hooks");
const { createHash } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { demoArticles } = require("./content");
const { sourceKeys } = require("./automation");
const { createAutomationQueue } = require("./automation-queue");
const {
  HttpError,
  normalizeLegacy,
  effectiveStatus,
  isPublic,
  hasLocale,
  statuses,
} = require("./domain");
const DAY = 86400000;
const digest = (value) => createHash("sha256").update(value).digest("hex");
const pagination = (page, pageSize, total) => ({
  page,
  pageSize,
  total,
  hasMore: page * pageSize < total,
});
const bounded = (value, fallback, max) =>
  Math.min(max, Math.max(1, Math.floor(Number(value) || fallback)));
function options(input = {}) {
  return {
    ...input,
    page: bounded(input.page, 1, 1000000),
    pageSize: bounded(
      input.pageSize,
      20,
      input.internal === true ? 50000 : 100,
    ),
    q: String(input.q || "")
      .trim()
      .slice(0, 150),
  };
}
function matches(a, o) {
  return (
    (!o.public || isPublic(a)) &&
    (!o.locale || hasLocale(a, o.locale)) &&
    (!o.status || effectiveStatus(a) === o.status) &&
    (!o.section || a.category === o.section) &&
    (!o.breaking || a.breaking) &&
    (!o.since || Date.parse(a.publishedAt) >= o.since) &&
    (!o.q ||
      JSON.stringify(a.translations).toLowerCase().includes(o.q.toLowerCase()))
  );
}
function runtimeMemory() {
  const records = new Map();
  const clean = () => {
    for (const [k, v] of records)
      if (v.expires <= Date.now()) records.delete(k);
  };
  return {
    sessionGet: async (key) => {
      const v = records.get("session:" + key);
      return v?.expires > Date.now() ? v : null;
    },
    sessionSet: async (key, expires) => {
      clean();
      if (records.size >= 10000)
        throw new HttpError(503, "Session capacity reached.");
      records.set("session:" + key, { expires });
    },
    sessionDelete: async (key) => {
      records.delete("session:" + key);
    },
    rateLimit: async (key, limit, windowMs) => {
      clean();
      let v = records.get("rate:" + key);
      if (!v) {
        if (records.size >= 10000)
          throw new HttpError(503, "Rate limit capacity reached.");
        v = { count: 0, expires: Date.now() + windowMs };
        records.set("rate:" + key, v);
      }
      return {
        allowed: ++v.count <= limit,
        retryAfter: Math.max(1, Math.ceil((v.expires - Date.now()) / 1000)),
      };
    },
  };
}
async function fileStore(filename, seed = true, automationConfig = {}) {
  let state;
  try {
    state = JSON.parse(await fs.readFile(filename, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    state = {
      articles: seed
        ? demoArticles().map((a) => ({ ...a, schemaVersion: 2 }))
        : [],
      subscribers: [],
      demo: seed,
      schemaVersion: 2,
      ledger: {},
    };
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, JSON.stringify(state, null, 2), {
      flag: "wx",
    });
  }
  const context = new AsyncLocalStorage();
  let queue = Promise.resolve();
  const current = () => context.getStore() || state;
  const mutate = (fn) => {
    if (context.getStore()) return Promise.resolve().then(() => fn(current()));
    const operation = queue.then(async () => {
      const next = structuredClone(state);
      const result = await context.run(next, () => fn(next));
      await fs.writeFile(filename + ".tmp", JSON.stringify(next, null, 2));
      await fs.rename(filename + ".tmp", filename);
      state = next;
      return structuredClone(result);
    });
    queue = operation.catch(() => {});
    return operation;
  };
  const store = {
    kind: "file",
    demo: Boolean(state.demo),
    ...runtimeMemory(),
    ready: async () => {
      await fs.access(filename);
      return true;
    },
    list: async () => structuredClone(current().articles),
    query: async (input) => {
      const o = options(input);
      const rows = current()
        .articles.filter((a) => matches(a, o))
        .sort(
          (a, b) =>
            Date.parse(b[o.sort || "publishedAt"]) -
              Date.parse(a[o.sort || "publishedAt"]) ||
            a.id.localeCompare(b.id),
        );
      return {
        articles: structuredClone(
          rows.slice((o.page - 1) * o.pageSize, o.page * o.pageSize),
        ),
        pagination: pagination(o.page, o.pageSize, rows.length),
      };
    },
    get: async (id, publicOnly = false) =>
      structuredClone(
        current().articles.find(
          (a) => (a.id === id || a.slug === id) && (!publicOnly || isPublic(a)),
        ),
      ),
    counts: async () => {
      const rows = current().articles;
      return {
        all: rows.length,
        ...Object.fromEntries(
          statuses.map((s) => [
            s,
            rows.filter((a) => effectiveStatus(a) === s).length,
          ]),
        ),
      };
    },
    sectionCounts: async () =>
      Object.fromEntries(
        [...new Set(current().articles.map((a) => a.category))].map((c) => [
          c,
          current().articles.filter((a) => a.category === c).length,
        ]),
      ),
    save: (a, expected) =>
      mutate((next) => {
        const old = next.articles.find((x) => x.id === a.id);
        if (
          expected &&
          (!old || Date.parse(old.updatedAt) !== Date.parse(expected))
        )
          throw new HttpError(
            409,
            "This story changed in another session. Reload before saving.",
          );
        if (next.articles.some((x) => x.slug === a.slug && x.id !== a.id))
          throw new HttpError(409, "This URL slug is already used.");
        const index = next.articles.findIndex((x) => x.id === a.id);
        a = { ...a, schemaVersion: 2 };
        if (index < 0) next.articles.push(a);
        else next.articles[index] = a;
        return structuredClone(a);
      }),
    archive: (id, expected) =>
      mutate((next) => {
        const a = next.articles.find((x) => x.id === id);
        if (!a) throw new HttpError(404, "Story not found.");
        if (expected && Date.parse(a.updatedAt) !== Date.parse(expected))
          throw new HttpError(
            409,
            "This story changed in another session. Reload before archiving.",
          );
        a.status = "archived";
        a.schemaVersion = 2;
        a.updatedAt = new Date(
          Math.max(Date.now(), Date.parse(a.updatedAt) + 1),
        ).toISOString();
        return structuredClone(a);
      }),
    subscriberQuery: async (input) => {
      const o = options(input);
      const rows = current()
        .subscribers.filter((a) => !o.q || a.email.includes(o.q.toLowerCase()))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      return {
        subscribers: structuredClone(
          rows.slice((o.page - 1) * o.pageSize, o.page * o.pageSize),
        ),
        pagination: pagination(o.page, o.pageSize, rows.length),
      };
    },
    subscribers: async () => structuredClone(current().subscribers),
    subscribe: (email) =>
      mutate((next) => {
        if (!next.subscribers.some((x) => x.email === email))
          next.subscribers.push({
            email,
            createdAt: new Date().toISOString(),
            consent: true,
            schemaVersion: 2,
          });
      }),
    putMedia: (media) =>
      mutate(async (next) => {
        next.media ||= {};
        if (next.media[media.hash])
          return structuredClone(next.media[media.hash]);
        await fs.mkdir(filename + ".media", { recursive: true });
        try {
          await fs.writeFile(
            path.join(filename + ".media", media.hash + ".webp"),
            media.buffer,
            { flag: "wx" },
          );
        } catch (e) {
          if (e.code !== "EEXIST") throw e;
        }
        const metadata = {
          hash: media.hash,
          contentType: media.contentType,
          bytes: media.buffer.length,
          width: media.width,
          height: media.height,
          rights: media.rights,
          createdAt: new Date().toISOString(),
          schemaVersion: 2,
        };
        next.media[media.hash] = metadata;
        return structuredClone(metadata);
      }),
    getMedia: async (hash) => {
      const media = state.media?.[hash];
      if (!media) return undefined;
      return {
        ...structuredClone(media),
        open: () =>
          require("node:fs").createReadStream(
            path.join(filename + ".media", hash + ".webp"),
          ),
      };
    },
    ingestAutomation: (article) =>
      mutate(async (next) => {
        next.automationKeys ||= {};
        const keys = sourceKeys(article.provenance);
        const ids = [
          ...new Set(
            keys
              .map((key) => next.automationKeys[key]?.articleId)
              .filter(Boolean),
          ),
        ];
        if (ids.length > 1)
          throw new HttpError(
            409,
            "Source event and fingerprint refer to different existing articles.",
          );
        const duplicate = ids.length === 1;
        const saved = duplicate
          ? await store.get(ids[0])
          : await store.save(article);
        const articleId = ids[0] || saved.id;
        for (const key of keys)
          next.automationKeys[key] ||= {
            articleId,
            createdAt: new Date().toISOString(),
            schemaVersion: 2,
          };
        if (!duplicate) await store.automation.recordIngest();
        return { article: saved || null, articleId, duplicate };
      }),
    idempotent: (key, hash, fn) =>
      mutate(async (next) => {
        next.ledger ||= {};
        for (const [k, v] of Object.entries(next.ledger))
          if (v.expires <= Date.now()) delete next.ledger[k];
        const previous = next.ledger[key];
        if (previous) {
          if (previous.hash !== hash)
            throw new HttpError(
              409,
              "Idempotency key was already used with different content.",
            );
          return { ...previous.result, replayed: true };
        }
        if (Object.keys(next.ledger).length >= 20000)
          throw new HttpError(
            503,
            "Mutation capacity reached. Try later with the same key.",
          );
        const result = await fn();
        next.ledger[key] = { hash, result, expires: Date.now() + 2 * DAY };
        return result;
      }),
    close: async () => {
      await queue;
    },
  };
  const automationState = () => {
    const s = current();
    s.automationState ||= { jobs: {}, keys: {}, days: {} };
    return s.automationState;
  };
  const writeAutomation = (fn) => mutate(() => fn(automationState()));
  store.automation = createAutomationQueue(
    {
      assertAtomic: () => {
        if (!context.getStore())
          throw new Error("Automation writes require an atomic operation.");
      },
      getJob: async (id) => structuredClone(automationState().jobs[id]),
      putJob: (job) =>
        writeAutomation((s) => {
          s.jobs[job.id] = structuredClone(job);
        }),
      getDay: async (day) => structuredClone(automationState().days[day]),
      putDay: (day) =>
        writeAutomation((s) => {
          s.days[day.day] = structuredClone(day);
        }),
      getKeys: async (keys) =>
        keys
          .map((k) => automationState().keys[k])
          .filter(Boolean)
          .map((x) => structuredClone(x)),
      putKey: (key, jobId) =>
        writeAutomation((s) => {
          const old = s.keys[key];
          if (old && old.jobId !== jobId)
            throw new HttpError(409, "Source job identity conflict.");
          s.keys[key] ||= { jobId, schemaVersion: 2 };
        }),
      findCandidate: async (now, maxAttempts) =>
        structuredClone(
          Object.values(automationState().jobs)
            .filter(
              (j) =>
                j.attempts < maxAttempts &&
                ((j.state === "queued" && j.availableAt <= now) ||
                  (j.state === "leased" && j.leaseUntil <= now)),
            )
            .sort(
              (a, b) =>
                (a.recoveryPriority ?? 1) - (b.recoveryPriority ?? 1) ||
                a.availableAt - b.availableAt ||
                a.id.localeCompare(b.id),
            )[0],
        ),
      articleForKeys: async (keys) =>
        keys.map((k) => current().automationKeys?.[k]?.articleId).find(Boolean),
    },
    automationConfig,
  );
  return store;
}
function mongoChanges(a, updating) {
  const data = {
    ...a,
    schemaVersion: 2,
    article_header_en: a.translations.en?.title,
    summary_en: a.translations.en?.summary,
    body_en: a.translations.en?.body,
    metadata_en: a.translations.en?.description,
    article_header: a.translations.hi?.title,
    summary: a.translations.hi?.summary,
    body: a.translations.hi?.body,
    metadata: a.translations.hi?.description,
    photos: a.image ? [a.image] : [],
    published_language:
      a.translations.en && a.translations.hi
        ? "both"
        : a.translations.hi
          ? "hi"
          : "en",
    is_Published: ["published", "scheduled"].includes(a.status),
    is_Drafted: !["published", "scheduled"].includes(a.status),
  };
  delete data.id;
  delete data._id;
  for (const field of ["createdAt", "updatedAt", "publishedAt"])
    if (data[field]) data[field] = new Date(data[field]);
  if (updating)
    for (const key of [
      "article_header_en",
      "summary_en",
      "body_en",
      "metadata_en",
      "article_header",
      "summary",
      "body",
      "metadata",
      "photos",
    ])
      delete data[key];
  return data;
}
// Computed query fields safely read pre-v2 documents without rewriting legacy HTML/layout/gallery fields.
const basePipeline = () => [
  {
    $set: {
      _status: {
        $ifNull: [
          "$status",
          { $cond: ["$is_Published", "published", "draft"] },
        ],
      },
      _publishedAt: { $ifNull: ["$publishedAt", "$createdAt"] },
      _category: {
        $ifNull: [
          "$category",
          {
            $let: {
              vars: {
                tag: {
                  $toLower: {
                    $ifNull: [
                      { $arrayElemAt: [{ $ifNull: ["$tags_en", "$tags"] }, 0] },
                      "india",
                    ],
                  },
                },
              },
              in: {
                $cond: [
                  {
                    $in: [
                      "$$tag",
                      require("./content").categories.map((c) => c.slug),
                    ],
                  },
                  "$$tag",
                  "india",
                ],
              },
            },
          },
        ],
      },
    },
  },
  {
    $set: {
      _status: {
        $cond: [
          {
            $and: [
              { $eq: ["$_status", "scheduled"] },
              { $lte: ["$_publishedAt", new Date()] },
            ],
          },
          "published",
          "$_status",
        ],
      },
    },
  },
];
const projection = {
  elementContent: 0,
  elementContent_en: 0,
  layoutTemplate: 0,
  video: 0,
  keywords: 0,
  keywords_en: 0,
  _status: 0,
  _publishedAt: 0,
  _category: 0,
};
async function mongoStore(uri, automationConfig = {}) {
  const mongoose = require("mongoose");
  const connection = await mongoose
    .createConnection(uri, {
      autoIndex: false,
      autoCreate: false,
      maxPoolSize: bounded(process.env.MONGO_MAX_POOL_SIZE, 20, 200),
      minPoolSize: Math.max(0, Number(process.env.MONGO_MIN_POOL_SIZE) || 0),
      maxConnecting: 2,
      waitQueueTimeoutMS: bounded(
        process.env.MONGO_WAIT_QUEUE_TIMEOUT_MS,
        2000,
        30000,
      ),
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      timeoutMS: 8000,
    })
    .asPromise();
  const db = connection.db;
  const hello = await db.admin().command({ hello: 1 });
  if (!hello.setName) {
    await connection.close();
    throw new Error(
      "Mongo storage requires a replica set; non-atomic standalone writes are refused.",
    );
  }
  const articles = db.collection("articles"),
    subscribers = db.collection("newslettersubscribers"),
    ledger = db.collection("newsroom_idempotency"),
    sessions = db.collection("newsroom_sessions"),
    rates = db.collection("newsroom_rates");
  const required = require("./indexes").indexes;
  try {
    for (const [name, specs] of Object.entries(required)) {
      const existing = await db.collection(name).indexes();
      for (const spec of specs)
        if (
          !existing.some(
            (i) =>
              i.name === spec.options.name &&
              JSON.stringify(i.key) === JSON.stringify(spec.key) &&
              (!spec.options.unique || i.unique === true) &&
              (spec.options.expireAfterSeconds === undefined ||
                i.expireAfterSeconds === spec.options.expireAfterSeconds),
          )
        )
          throw new Error(
            `Missing ${name}.${spec.options.name}; run npm run migrate:indexes before startup.`,
          );
    }
  } catch (e) {
    await connection.close();
    throw e;
  }
  const context = new AsyncLocalStorage();
  const opt = () => ({
    session: context.getStore(),
    maxTimeMS: bounded(process.env.MONGO_OPERATION_TIMEOUT_MS, 5000, 15000),
  });
  const oid = (id) =>
    mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null;
  const findId = (id) => ({
    $or: [{ slug: id }, ...(oid(id) ? [{ _id: oid(id) }] : [])],
  });
  const queryPipeline = (input) => {
    const o = options(input);
    const filter = {};
    if (o.public) {
      filter._status = "published";
      filter._publishedAt = { $lte: new Date() };
    }
    if (o.status) filter._status = o.status;
    if (o.section) filter._category = o.section;
    if (o.breaking) filter.breaking = true;
    if (o.since)
      filter._publishedAt = {
        ...(filter._publishedAt || {}),
        $gte: new Date(o.since),
      };
    const and = [];
    if (o.locale) {
      const legacy = o.locale === "en" ? "_en" : "";
      and.push({
        $or: [
          {
            [`translations.${o.locale}.title`]: {
              $nin: [null, ""],
              $exists: true,
            },
            [`translations.${o.locale}.body`]: {
              $nin: [null, ""],
              $exists: true,
            },
          },
          {
            translations: { $exists: false },
            published_language: {
              $in:
                o.locale === "en" ? ["en", "both", null] : ["hi", "HN", "both"],
            },
            [`article_header${legacy}`]: { $nin: [null, ""], $exists: true },
            [`body${legacy}`]: { $nin: [null, ""], $exists: true },
          },
        ],
      });
    }
    if (o.q) {
      const regex = o.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      and.push({
        $or: [
          "translations.en.title",
          "translations.hi.title",
          "translations.en.summary",
          "translations.hi.summary",
          "translations.en.body",
          "translations.hi.body",
          "article_header_en",
          "article_header",
          "summary_en",
          "summary",
          "body_en",
          "body",
        ].map((k) => ({ [k]: { $regex: regex, $options: "i" } })),
      });
    }
    if (and.length) filter.$and = and;
    return { o, pipeline: [...basePipeline(), { $match: filter }] };
  };
  const store = {
    kind: "mongo",
    demo: false,
    ready: async () => {
      await db.command({ ping: 1 }, { timeoutMS: 2000 });
      return true;
    },
    query: async (input) => {
      const { o, pipeline } = queryPipeline(input);
      const present = (field) => ({
        $cond: [{ $ne: [{ $ifNull: [field, ""] }, ""] }, "available", ""],
      });
      const shape =
        o.sitemap === true
          ? {
              $project: {
                slug: 1,
                status: 1,
                is_Published: 1,
                published_language: 1,
                publishedAt: 1,
                createdAt: 1,
                updatedAt: 1,
                article_header_en: 1,
                article_header: 1,
                body_en: present("$body_en"),
                body: present("$body"),
                "translations.en.title": 1,
                "translations.hi.title": 1,
                "translations.en.body": present("$translations.en.body"),
                "translations.hi.body": present("$translations.hi.body"),
              },
            }
          : { $project: projection };
      // Return a bounded cursor rather than one $facet document that can exceed
      // Mongo's 16MiB BSON document limit on large story bodies or sitemaps.
      const readRows = () =>
        articles
          .aggregate(
            [
              ...pipeline,
              {
                $sort: {
                  [o.sort === "updatedAt" ? "updatedAt" : "_publishedAt"]: -1,
                  _id: 1,
                },
              },
              { $skip: (o.page - 1) * o.pageSize },
              { $limit: o.pageSize },
              shape,
            ],
            opt(),
          )
          .toArray();
      const readCount = () =>
        articles.aggregate([...pipeline, { $count: "n" }], opt()).toArray();
      const [rows, total] = context.getStore()
        ? [await readRows(), await readCount()]
        : await Promise.all([readRows(), readCount()]);
      return {
        articles: rows.map(normalizeLegacy),
        pagination: pagination(o.page, o.pageSize, total[0]?.n || 0),
      };
    },
    get: async (id, publicOnly = false) => {
      const [a] = await articles
        .aggregate(
          [
            ...basePipeline(),
            {
              $match: {
                ...findId(id),
                ...(publicOnly
                  ? { _status: "published", _publishedAt: { $lte: new Date() } }
                  : {}),
              },
            },
            { $limit: 1 },
            { $project: projection },
          ],
          opt(),
        )
        .toArray();
      return a ? normalizeLegacy(a) : undefined;
    },
    counts: async () => {
      const groups = await articles
        .aggregate(
          [...basePipeline(), { $group: { _id: "$_status", n: { $sum: 1 } } }],
          opt(),
        )
        .toArray();
      return {
        all: groups.reduce((n, x) => n + x.n, 0),
        ...Object.fromEntries(
          statuses.map((s) => [s, groups.find((x) => x._id === s)?.n || 0]),
        ),
      };
    },
    sectionCounts: async () =>
      Object.fromEntries(
        (
          await articles
            .aggregate(
              [
                ...basePipeline(),
                { $group: { _id: "$_category", n: { $sum: 1 } } },
              ],
              opt(),
            )
            .toArray()
        ).map((x) => [x._id, x.n]),
      ),
    save: async (a, expected) => {
      try {
        const data = mongoChanges(a, Boolean(oid(a.id)));
        if (oid(a.id)) {
          const result = await articles.findOneAndUpdate(
            {
              _id: oid(a.id),
              ...(expected ? { updatedAt: new Date(expected) } : {}),
            },
            { $set: data },
            { ...opt(), returnDocument: "after" },
          );
          if (!result)
            throw new HttpError(
              409,
              "This story changed in another session. Reload before saving.",
            );
          return normalizeLegacy(result);
        }
        const result = await articles.insertOne(data, opt());
        return normalizeLegacy({ ...data, _id: result.insertedId });
      } catch (e) {
        if (e.code === 11000)
          throw new HttpError(409, "This URL slug is already used.");
        throw e;
      }
    },
    archive: async (id, expected) => {
      if (!oid(id)) throw new HttpError(404, "Story not found.");
      const result = await articles.findOneAndUpdate(
        {
          _id: oid(id),
          ...(expected ? { updatedAt: new Date(expected) } : {}),
        },
        {
          $set: {
            status: "archived",
            is_Published: false,
            is_Drafted: true,
            schemaVersion: 2,
            updatedAt: new Date(),
          },
        },
        { ...opt(), returnDocument: "after" },
      );
      if (!result)
        throw new HttpError(
          expected ? 409 : 404,
          expected
            ? "This story changed in another session. Reload before archiving."
            : "Story not found.",
        );
      return normalizeLegacy(result);
    },
    subscriberQuery: async (input) => {
      const o = options(input);
      const filter = o.q
        ? {
            email: {
              $regex: o.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              $options: "i",
            },
          }
        : {};
      const [result] = await subscribers
        .aggregate(
          [
            { $match: filter },
            {
              $facet: {
                data: [
                  { $sort: { createdAt: -1, _id: 1 } },
                  { $skip: (o.page - 1) * o.pageSize },
                  { $limit: o.pageSize },
                  { $project: { _id: 0, email: 1, consent: 1, createdAt: 1 } },
                ],
                total: [{ $count: "n" }],
              },
            },
          ],
          opt(),
        )
        .toArray();
      return {
        subscribers: result.data,
        pagination: pagination(o.page, o.pageSize, result.total[0]?.n || 0),
      };
    },
    subscribe: (email) =>
      subscribers.updateOne(
        { email },
        {
          $setOnInsert: {
            email,
            consent: true,
            createdAt: new Date(),
            schemaVersion: 2,
          },
        },
        { ...opt(), upsert: true },
      ),
    sessionGet: (key) =>
      sessions.findOne(
        { _id: digest(key || ""), expiresAt: { $gt: new Date() } },
        { maxTimeMS: 2000 },
      ),
    sessionSet: (key, expires) =>
      sessions.insertOne(
        { _id: digest(key), expiresAt: new Date(expires), schemaVersion: 2 },
        { maxTimeMS: 2000 },
      ),
    sessionDelete: (key) =>
      sessions.deleteOne({ _id: digest(key || "") }, { maxTimeMS: 2000 }),
    rateLimit: async (key, limit, windowMs) => {
      const now = Date.now(),
        bucket = Math.floor(now / windowMs),
        expiresAt = new Date((bucket + 1) * windowMs);
      const result = await rates.findOneAndUpdate(
        { _id: digest(key + ":" + bucket) },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt, schemaVersion: 2 } },
        { upsert: true, returnDocument: "after", maxTimeMS: 2000 },
      );
      return {
        allowed: result.count <= limit,
        retryAfter: Math.max(1, Math.ceil((expiresAt - now) / 1000)),
      };
    },
    putMedia: async (media) => {
      if (!context.getStore())
        throw new Error("Media finalization requires a transaction.");
      const collection = db.collection("newsroom_media");
      const existing = await collection.findOne({ _id: media.hash }, opt());
      if (existing) {
        const { _id, gridFsId, ...metadata } = existing;
        return metadata;
      }
      // GridFS cannot participate in multi-document transactions. Upload complete
      // immutable bytes first, then atomically finalize their reference with replay.
      const bucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: "newsroom_media_bytes",
      });
      const upload = bucket.openUploadStream(media.hash + ".webp", {
        metadata: { hash: media.hash, stagedAt: new Date() },
      });
      await new Promise((resolve, reject) => {
        upload.on("finish", resolve);
        upload.on("error", reject);
        upload.end(media.buffer);
      });
      const metadata = {
        hash: media.hash,
        contentType: media.contentType,
        bytes: media.buffer.length,
        width: media.width,
        height: media.height,
        rights: media.rights,
        createdAt: new Date().toISOString(),
        schemaVersion: 2,
      };
      await collection.insertOne(
        { _id: media.hash, gridFsId: upload.id, ...metadata },
        opt(),
      );
      return metadata;
    },
    getMedia: async (hash) => {
      const media = await db
        .collection("newsroom_media")
        .findOne({ _id: hash }, { maxTimeMS: 5000 });
      if (!media) return undefined;
      const { _id, gridFsId, ...metadata } = media;
      return {
        ...metadata,
        open: () =>
          new mongoose.mongo.GridFSBucket(db, {
            bucketName: "newsroom_media_bytes",
          }).openDownloadStream(gridFsId),
      };
    },
    ingestAutomation: async (article) => {
      if (!context.getStore())
        throw new Error("Automation ingest requires a transaction.");
      const sources = db.collection("newsroom_automation_sources");
      const keys = sourceKeys(article.provenance);
      const previous = await sources
        .find({ _id: { $in: keys } }, opt())
        .limit(keys.length)
        .toArray();
      const ids = [...new Set(previous.map((x) => x.articleId))];
      if (ids.length > 1)
        throw new HttpError(
          409,
          "Source event and fingerprint refer to different existing articles.",
        );
      const duplicate = ids.length === 1;
      const saved = duplicate
        ? await store.get(ids[0])
        : await store.save(article);
      const articleId = ids[0] || saved.id;
      for (const key of keys)
        await sources.updateOne(
          { _id: key },
          {
            $setOnInsert: {
              articleId,
              createdAt: new Date(),
              schemaVersion: 2,
            },
          },
          { ...opt(), upsert: true },
        );
      if (!duplicate) await store.automation.recordIngest();
      return { article: saved || null, articleId, duplicate };
    },
    idempotent: async (key, hash, fn) => {
      const replay = (v) => {
        if (v.hash !== hash)
          throw new HttpError(
            409,
            "Idempotency key was already used with different content.",
          );
        return { ...v.result, replayed: true };
      };
      const previous = await ledger.findOne({ _id: key }, { maxTimeMS: 2000 });
      if (previous) return replay(previous);
      const deadline = Date.now() + 10000;
      const session = await connection.startSession();
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await session.withTransaction(
              async () =>
                context.run(session, async () => {
                  const v = await ledger.findOne({ _id: key }, opt());
                  if (v) return replay(v);
                  // Claim and result are committed with the write; no pending state escapes rollback.
                  await ledger.insertOne(
                    {
                      _id: key,
                      hash,
                      expiresAt: new Date(Date.now() + 2 * DAY),
                      schemaVersion: 2,
                    },
                    opt(),
                  );
                  const result = await fn();
                  await ledger.updateOne(
                    { _id: key },
                    { $set: { result } },
                    opt(),
                  );
                  return result;
                }),
              {
                readConcern: { level: "snapshot" },
                writeConcern: { w: "majority", wtimeoutMS: 5000 },
                maxCommitTimeMS: 5000,
                timeoutMS: Math.max(1, deadline - Date.now()),
              },
            );
          } catch (e) {
            if (e.code === 11000) {
              const v = await ledger.findOne({ _id: key }, { maxTimeMS: 2000 });
              if (v?.result) return replay(v);
              // Mongo does not retry transactional upsert uniqueness races. The aborted
              // transaction has no effects; retry the same key within the original budget.
              if (attempt < 2 && Date.now() < deadline) continue;
            }
            throw e;
          }
        }
      } finally {
        await session.endSession();
      }
    },
    close: () => connection.close(),
  };
  const jobs = db.collection("newsroom_automation_jobs"),
    jobKeys = db.collection("newsroom_automation_job_keys"),
    days = db.collection("newsroom_automation_days");
  const clean = (value) => {
    if (!value) return undefined;
    const { _id, ...rest } = value;
    return rest;
  };
  store.automation = createAutomationQueue(
    {
      assertAtomic: () => {
        if (!context.getStore())
          throw new Error("Automation writes require a transaction.");
      },
      getJob: async (id) => clean(await jobs.findOne({ _id: id }, opt())),
      putJob: (job) =>
        jobs.replaceOne(
          { _id: job.id },
          { ...job, _id: job.id },
          { ...opt(), upsert: true },
        ),
      getDay: async (day) => clean(await days.findOne({ _id: day }, opt())),
      putDay: (day) =>
        days.replaceOne(
          { _id: day.day },
          { ...day, _id: day.day },
          { ...opt(), upsert: true },
        ),
      getKeys: (keys) =>
        jobKeys
          .find({ _id: { $in: keys } }, opt())
          .limit(keys.length)
          .toArray(),
      putKey: (key, jobId) =>
        jobKeys.updateOne(
          { _id: key },
          { $setOnInsert: { jobId, schemaVersion: 2 } },
          { ...opt(), upsert: true },
        ),
      findCandidate: async (now, maxAttempts) =>
        clean(
          await jobs.findOne(
            {
              attempts: { $lt: maxAttempts },
              $or: [
                { state: "queued", availableAt: { $lte: now } },
                { state: "leased", leaseUntil: { $lte: now } },
              ],
            },
            { ...opt(), sort: { recoveryPriority: 1, availableAt: 1, _id: 1 } },
          ),
        ),
      articleForKeys: async (keys) =>
        (
          await db
            .collection("newsroom_automation_sources")
            .findOne({ _id: { $in: keys } }, opt())
        )?.articleId,
    },
    automationConfig,
  );
  return store;
}
module.exports = {
  fileStore,
  mongoStore,
  mongoChanges,
  options,
  digest,
  runtimeMemory,
};
