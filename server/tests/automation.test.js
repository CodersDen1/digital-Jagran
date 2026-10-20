const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { fileStore } = require("../newsroom/store");
const { createApp } = require("../newsroom/app");
const { automationArticle, sourceKeys } = require("../newsroom/automation");
const { dayFor } = require("../newsroom/automation-queue");
const { validateMedia } = require("../newsroom/automation-media");
const token = "test-automation-only-secret-".repeat(2);
const packet = (name = "story") => ({
  title: name,
  summary: "A report with verified context.",
  category: "india",
  canonicalUrl: `https://sources.example.test/${name}`,
  newsPublishedAt: "2026-10-20T10:00:00Z",
  sources: [
    {
      url: `https://sources.example.test/${name}`,
      title: name,
      publisher: "Source",
      retrievedAt: "2026-10-20T10:01:00Z",
    },
  ],
});
const jobInput = (name = "story") => ({
  sourcePacket: packet(name),
  provenance: {
    sourceId: "sources.example.test",
    eventId: `https://sources.example.test/${name}`,
    workflowId: "newsroom-ingest",
    runId: "run-test",
  },
});
const draft = (name = "story", fingerprint = "a".repeat(64)) => ({
  slug: "automated-" + name,
  category: "india",
  author: "Digital Jagran desk",
  translations: {
    en: {
      title: "Verified English draft",
      summary: "Summary under review.",
      body: "English text for editorial verification.",
    },
    hi: {
      title: "सत्यापित हिंदी मसौदा",
      summary: "संपादकीय समीक्षा के लिए सारांश।",
      body: "संपादकीय जाँच के लिए हिंदी पाठ।",
    },
  },
  sources: [
    { label: "Primary source", url: `https://sources.example.test/${name}` },
  ],
  provenance: {
    origin: "n8n",
    sourceId: "sources.example.test",
    eventId: `https://sources.example.test/${name}`,
    contentFingerprint: fingerprint,
    textModel: "test-model",
    generatedAt: "2026-10-20T10:00:00Z",
    sources: [{ url: `https://sources.example.test/${name}`, title: name }],
    imageGenerated: false,
    warnings: ["Requires human verification."],
  },
});
async function fixture(t, config = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dj-automation-"));
  const filename = path.join(dir, "state.json");
  const store = await fileStore(filename, false, config);
  const app = createApp({
    store,
    adminEmail: "editor@test.local",
    adminPassword: "editor-only-password",
    automationToken: token,
    logger: () => {},
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    await store.close();
    await fs.rm(dir, { recursive: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (
    route,
    {
      method = "GET",
      body,
      key = crypto.randomUUID(),
      bearer = token,
      cookie,
    } = {},
  ) => {
    const response = await fetch(base + route, {
      method,
      headers: {
        ...(bearer ? { Authorization: "Bearer " + bearer } : {}),
        ...(cookie ? { cookie } : {}),
        ...(body
          ? { "Content-Type": "application/json", "Idempotency-Key": key }
          : {}),
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
  };
  const atomic = (fn) => store.idempotent(crypto.randomUUID(), "test-hash", fn);
  return { dir, filename, store, app, base, call, atomic };
}
test("automation credentials are distinct, versioned, keyed and cannot publish or reach admin", async (t) => {
  const { call } = await fixture(t);
  for (const bearer of [undefined, "wrong-token"]) {
    const r = await call("/api/v1/automation/articles", {
      method: "POST",
      body: draft(),
      bearer: bearer || "",
    });
    assert.equal(r.response.status, 401);
    assert.equal(r.response.headers.get("cache-control"), "no-store");
  }
  assert.equal((await call("/api/v1/admin/articles")).response.status, 401);
  assert.equal(
    (await call("/api/automation/articles", { method: "POST", body: draft() }))
      .response.status,
    404,
  );
  const noKey = await call("/api/v1/automation/articles", {
    method: "POST",
    body: draft(),
    key: "",
  });
  assert.equal(noKey.response.status, 422);
  for (const status of ["draft", "scheduled", "published", "archived"])
    assert.equal(
      (
        await call("/api/v1/automation/articles", {
          method: "POST",
          body: { ...draft(), status },
        })
      ).response.status,
      422,
    );
  assert.equal(
    (
      await call("/api/v1/automation/articles", {
        method: "POST",
        body: { ...draft(), publishedAt: new Date().toISOString() },
      })
    ).response.status,
    422,
  );
  assert.equal(
    (
      await call("/api/v1/automation/articles", {
        method: "POST",
        body: {
          ...draft(),
          provenance: { ...draft().provenance, imageGenerated: true },
        },
      })
    ).response.status,
    422,
  );
  const body = draft();
  delete body.translations.hi;
  assert.equal(
    (await call("/api/v1/automation/articles", { method: "POST", body }))
      .response.status,
    422,
  );
});
test("ingest deduplicates event and fingerprint across new keys, restart and expired replay ledger; editor preserves provenance", async (t) => {
  const { call, store, filename } = await fixture(t);
  const body = draft();
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      call("/api/v1/automation/articles", { method: "POST", body }),
    ),
  );
  assert.equal(results.filter((r) => r.response.status === 201).length, 1);
  assert.equal(results.filter((r) => r.data.duplicate).length, 7);
  assert.equal(new Set(results.map((r) => r.data.articleId)).size, 1);
  const saved = results[0].data.article;
  assert.equal(saved.status, "review");
  assert.equal((await store.query({ public: true })).pagination.total, 0);
  assert.equal(saved.provenance.origin, "n8n");
  const changed = draft("new-url");
  const alias = await call("/api/v1/automation/articles", {
    method: "POST",
    body: changed,
  });
  assert.equal(alias.response.status, 200);
  assert.equal(alias.data.articleId, saved.id);
  const eventRepeat = draft("new-url", "b".repeat(64));
  const event = await call("/api/v1/automation/articles", {
    method: "POST",
    body: eventRepeat,
  });
  assert.equal(event.data.articleId, saved.id);
  const login = await call("/api/v1/auth/login", {
    method: "POST",
    body: { email: "editor@test.local", password: "editor-only-password" },
    bearer: "",
  });
  const cookie = login.response.headers.get("set-cookie").split(";")[0];
  const update = await call("/api/v1/admin/articles/" + saved.id, {
    method: "PUT",
    body: { ...saved, provenance: { origin: "forged" }, status: "published" },
    bearer: "",
    cookie,
  });
  assert.equal(update.response.status, 200);
  assert.deepEqual(update.data.article.provenance, saved.provenance);
  const list = await call("/api/v1/admin/articles", { bearer: "", cookie });
  assert.deepEqual(list.data.articles[0].provenance, {
    origin: "n8n",
    imageGenerated: false,
  });
  const pub = await call(
    "/api/v1/page?path=" + encodeURIComponent("/en/article/" + saved.slug),
    { bearer: "" },
  );
  assert.equal(pub.data.article.provenance, undefined);
  await store.close();
  const state = JSON.parse(await fs.readFile(filename, "utf8"));
  state.ledger = {};
  await fs.writeFile(filename, JSON.stringify(state));
  const reopened = await fileStore(filename, false);
  const duplicate = await reopened.idempotent("new-after-48h", "new-hash", () =>
    reopened.ingestAutomation(automationArticle(body)),
  );
  assert.equal(duplicate.articleId, saved.id);
  assert.equal(duplicate.article.status, "published");
  await reopened.close();
});
test("queue computes fingerprint, persists exact payloads, serializes claims, enforces leases and retains uncertain phases", async (t) => {
  let clock = Date.parse("2026-10-20T18:29:00Z");
  const { store, atomic } = await fixture(t, {
    dailyBudgetMicroUsd: 10000,
    now: () => clock,
    maxAttempts: 3,
  });
  const created = await atomic(() => store.automation.enqueue(jobInput()));
  assert.match(created.job.provenance.contentFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(
    (
      await atomic(() =>
        store.automation.enqueue({
          ...jobInput(),
          sourcePacket: { ...packet(), summary: "Changed source summary" },
        }),
      )
    ).duplicate,
    true,
  );
  const claims = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      atomic(() =>
        store.automation.claim({ workerId: "worker-" + i, leaseSeconds: 30 }),
      ),
    ),
  );
  const claimed = claims.filter(Boolean);
  assert.equal(claimed.length, 1);
  let job = claimed[0].job,
    leaseToken = claimed[0].leaseToken;
  assert.equal(job.leaseTokenHash, undefined);
  const patch = async (input) => {
    const r = await atomic(() =>
      store.automation.patch(job.id, {
        leaseToken,
        revision: job.revision,
        ...input,
      }),
    );
    job = r.job;
    return r;
  };
  await patch({
    action: "checkpoint",
    phase: "draft_prepared",
    checkpoint: {
      submissionKeys: { draft: "stable-draft-key" },
      draftRequest: {
        model: "text-only",
        messages: [{ role: "user", content: "Draft this source packet." }],
      },
    },
  });
  await assert.rejects(
    patch({
      action: "checkpoint",
      checkpoint: { draftRequest: { model: "different" } },
    }),
    (e) => e.status === 409,
  );
  await assert.rejects(
    patch({ action: "checkpoint", phase: "draft_uncertain" }),
    (e) => e.status === 409,
  );
  const reserved = await atomic(() =>
    store.automation.reserve(job.id, {
      leaseToken,
      revision: job.revision,
      reservationKey: "draft-spend-key",
      amountMicroUsd: 6000,
      stage: "draft",
    }),
  );
  job = reserved.job;
  await patch({ action: "checkpoint", phase: "draft_uncertain" });
  clock += 31000;
  await assert.rejects(patch({ action: "renew" }), (e) => e.status === 409);
  const recovered = await atomic(() =>
    store.automation.claim({ workerId: "recovery-worker", leaseSeconds: 30 }),
  );
  assert.equal(recovered.job.phase, "draft_uncertain");
  assert.equal(
    recovered.job.checkpoint.submissionKeys.draft,
    "stable-draft-key",
  );
  const oldToken = leaseToken;
  job = recovered.job;
  leaseToken = recovered.leaseToken;
  assert.notEqual(oldToken, leaseToken);
  await assert.rejects(
    atomic(() =>
      store.automation.patch(job.id, {
        leaseToken: oldToken,
        revision: job.revision,
        action: "renew",
      }),
    ),
    (e) => e.status === 409,
  );
  await assert.rejects(
    patch({ action: "checkpoint", phase: "draft_prepared" }),
    (e) => e.status === 409,
  );
  clock += 60000;
  const nextDay = await store.automation.day();
  assert.equal(nextDay.day, "2026-10-21");
  assert.equal(dayFor(clock), "2026-10-21");
  const resumed = await atomic(() =>
    store.automation.claim({ workerId: "last-recovery", leaseSeconds: 120 }),
  );
  job = resumed.job;
  leaseToken = resumed.leaseToken;
  await assert.rejects(
    atomic(() =>
      store.automation.reconcile(job.id, "draft-spend-key", {
        leaseToken,
        revision: job.revision,
        actualMicroUsd: 0,
      }),
    ),
    (e) => e.status === 422,
  );
  assert.equal(
    (await store.automation.day("2026-10-20")).spend.reservedMicroUsd,
    6000,
  );
  const reconciled = await atomic(() =>
    store.automation.reconcile(job.id, "draft-spend-key", {
      leaseToken,
      revision: job.revision,
      confirmed: true,
      actualMicroUsd: 3000,
      taskId: "provider-confirmed-task",
    }),
  );
  job = reconciled.job;
  assert.equal(reconciled.day.day, "2026-10-20");
  assert.equal(reconciled.day.spend.actualMicroUsd, 3000);
  assert.equal(reconciled.day.spend.reservedMicroUsd, 0);
  assert.equal((await store.automation.day()).spend.actualMicroUsd, 0);
  await patch({
    action: "checkpoint",
    phase: "draft_done",
    checkpoint: {
      draftText: "Confirmed bilingual draft",
      draftTaskId: "provider-confirmed-task",
    },
  });
  assert.equal(job.attempts, 3);
  await assert.rejects(patch({ action: "retry" }), (e) => e.status === 409);
});
test("daily budget reservations are atomic, unknown spend stays reserved and default zero pauses claims", async (t) => {
  const { store, atomic, dir } = await fixture(t, {
    dailyBudgetMicroUsd: 9000,
    dailyMaxJobs: 2,
  });
  const claims = [];
  for (const name of ["one", "two"]) {
    await atomic(() => store.automation.enqueue(jobInput(name)));
    let c = await atomic(() => store.automation.claim({ workerId: name }));
    const r = await atomic(() =>
      store.automation.patch(c.job.id, {
        leaseToken: c.leaseToken,
        revision: c.job.revision,
        action: "checkpoint",
        phase: "draft_prepared",
        checkpoint: {
          submissionKeys: { draft: "stable-key-" + name },
          draftRequest: { model: "text", messages: [] },
        },
      }),
    );
    claims.push({ job: r.job, leaseToken: c.leaseToken });
  }
  const results = await Promise.allSettled(
    claims.map((c) =>
      atomic(() =>
        store.automation.reserve(c.job.id, {
          leaseToken: c.leaseToken,
          revision: c.job.revision,
          reservationKey: "budget-reserve-key",
          amountMicroUsd: 6000,
          stage: "draft",
          day: "1900-01-01",
        }),
      ),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.status, 429);
  const day = await store.automation.day();
  assert.equal(day.spend.reservedMicroUsd, 6000);
  assert.equal(day.spend.remainingMicroUsd, 3000);
  const other = await fileStore(path.join(dir, "zero.json"), false);
  const zeroKey = crypto.randomUUID();
  await other.idempotent(zeroKey, "h", () =>
    other.automation.enqueue(jobInput("zero")),
  );
  const noClaim = await other.idempotent("zero-claim", "h", () =>
    other.automation.claim({ workerId: "zero" }),
  );
  assert.equal(noClaim, null);
  assert.equal((await other.automation.day()).paused, true);
  await other.close();
});
test("media validates rights and real bytes, persists hashed immutable WebP and rejects active formats", async (t) => {
  const { call, store } = await fixture(t);
  const sharp = require("sharp");
  const bytes = await sharp({
    create: { width: 8, height: 6, channels: 3, background: "#123456" },
  })
    .png()
    .toBuffer();
  const body = {
    contentType: "image/png",
    base64: bytes.toString("base64"),
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Example",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    credit: "Example creator",
    creator: "Creator",
  };
  const result = await call("/api/v1/automation/media", {
    method: "POST",
    body,
  });
  assert.equal(result.response.status, 201);
  assert.match(result.data.media.url, /\/media\/[a-f0-9]{64}\.webp$/);
  const stored = await store.getMedia(result.data.media.hash);
  assert.equal(stored.rights.license, "CC BY 4.0");
  const response = await call(new URL(result.data.media.url).pathname, {
    bearer: "",
  });
  assert.equal(response.response.status, 200);
  assert.equal(response.response.headers.get("content-type"), "image/webp");
  assert.match(response.response.headers.get("cache-control"), /immutable/);
  assert.equal(
    (
      await call("/api/v1/automation/media", {
        method: "POST",
        body: { ...body, contentType: "image/jpeg" },
      })
    ).response.status,
    422,
  );
  assert.equal(
    (
      await call("/api/v1/automation/media", {
        method: "POST",
        body: {
          ...body,
          base64: Buffer.from("<svg><script>alert(1)</script></svg>").toString(
            "base64",
          ),
        },
      })
    ).response.status,
    422,
  );
  const unsafe = { ...body };
  delete unsafe.license;
  await assert.rejects(validateMedia(unsafe), (e) => e.status === 422);
});
test("HTTP queue completes two text stages and replays the exact prepared review payload", async (t) => {
  const { call } = await fixture(t, { dailyBudgetMicroUsd: 9000 });
  const enqueued = await call("/api/v1/automation/jobs", {
    method: "POST",
    body: jobInput("complete"),
  });
  assert.equal(enqueued.response.status, 201);
  const claimed = await call("/api/v1/automation/jobs/claim", {
    method: "POST",
    body: { workerId: "test-worker", leaseSeconds: 120 },
  });
  let job = claimed.data.job;
  const leaseToken = claimed.data.leaseToken;
  const patch = async (body) => {
    const r = await call("/api/v1/automation/jobs/" + job.id, {
      method: "PATCH",
      body: { leaseToken, revision: job.revision, ...body },
    });
    assert.equal(r.response.status, 200, JSON.stringify(r.data));
    job = r.data.job;
    return r;
  };
  for (const stage of ["draft", "factcheck"]) {
    await patch({
      action: "checkpoint",
      phase: stage + "_prepared",
      checkpoint: {
        submissionKeys: { [stage]: "stable-" + stage + "-key" },
        [stage + "Request"]: {
          model: "text-model",
          messages: [{ role: "user", content: "Use the stored sources only." }],
        },
      },
    });
    const reserve = await call(
      "/api/v1/automation/jobs/" + job.id + "/reservations",
      {
        method: "POST",
        body: {
          leaseToken,
          revision: job.revision,
          reservationKey: stage + "-reservation",
          amountMicroUsd: 3000,
          stage,
        },
      },
    );
    assert.equal(reserve.response.status, 201);
    job = reserve.data.job;
    await patch({ action: "checkpoint", phase: stage + "_uncertain" });
    const cost = await call(
      "/api/v1/automation/jobs/" +
        job.id +
        "/reservations/" +
        stage +
        "-reservation",
      {
        method: "PATCH",
        body: {
          leaseToken,
          revision: job.revision,
          confirmed: true,
          actualMicroUsd: 2000,
          taskId: "confirmed-" + stage,
        },
      },
    );
    assert.equal(cost.response.status, 200);
    job = cost.data.job;
    await patch({
      action: "checkpoint",
      phase: stage + "_done",
      checkpoint: {
        [stage + "Text"]: "Confirmed provider output for " + stage,
        [stage + "TaskId"]: "confirmed-" + stage,
      },
    });
  }
  const articlePayload = draft("complete", job.provenance.contentFingerprint),
    ingestKey = "exact-cms-submission-key";
  await patch({
    action: "checkpoint",
    phase: "ingest_prepared",
    checkpoint: { articlePayload, submissionKeys: { ingest: ingestKey } },
  });
  const changed = await call("/api/v1/automation/jobs/" + job.id, {
    method: "PATCH",
    body: {
      leaseToken,
      revision: job.revision,
      action: "checkpoint",
      checkpoint: {
        articlePayload: {
          ...articlePayload,
          author: "Changed after preparation",
        },
      },
    },
  });
  assert.equal(changed.response.status, 409);
  await patch({ action: "checkpoint", phase: "ingest_uncertain" });
  const submitted = await call("/api/v1/automation/articles", {
    method: "POST",
    body: job.checkpoint.articlePayload,
    key: job.checkpoint.submissionKeys.ingest,
  });
  assert.equal(submitted.response.status, 201);
  const retried = await call("/api/v1/automation/articles", {
    method: "POST",
    body: job.checkpoint.articlePayload,
    key: job.checkpoint.submissionKeys.ingest,
  });
  assert.equal(retried.response.status, 201);
  assert.equal(retried.response.headers.get("idempotency-replayed"), "true");
  assert.deepEqual(retried.data, submitted.data);
  await patch({ action: "complete" });
  assert.equal(job.state, "completed");
  assert.equal(job.articleId, submitted.data.articleId);
  const day = await call("/api/v1/automation/days/current");
  assert.equal(day.response.headers.get("cache-control"), "no-store");
  assert.equal(day.data.counts.reviewed, 1);
  assert.equal(day.data.counts.completed, 1);
  assert.equal(day.data.spend.actualMicroUsd, 4000);
  assert.equal(day.data.spend.reservedMicroUsd, 0);
});
test("daily ingestion quota rolls back both excess draft and source identity", async (t) => {
  const { store, atomic } = await fixture(t, { dailyMaxJobs: 1 });
  const results = await Promise.allSettled(
    ["a", "b"].map((key, i) =>
      atomic(() =>
        store.ingestAutomation(
          automationArticle(draft("quota-" + key, key.repeat(64))),
        ),
      ),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.status, 429);
  assert.equal((await store.query()).pagination.total, 1);
});
test("provider overrun is recorded and pauses further paid work instead of hiding cost", async (t) => {
  const { store, atomic } = await fixture(t, { dailyBudgetMicroUsd: 9000 });
  await atomic(() => store.automation.enqueue(jobInput("overrun")));
  const c = await atomic(() => store.automation.claim({ workerId: "test" }));
  let job = c.job;
  const leaseToken = c.leaseToken;
  const prepared = await atomic(() =>
    store.automation.patch(job.id, {
      leaseToken,
      revision: job.revision,
      action: "checkpoint",
      phase: "draft_prepared",
      checkpoint: {
        draftRequest: { model: "text", messages: [] },
        submissionKeys: { draft: "stable-overrun-key" },
      },
    }),
  );
  job = prepared.job;
  const reserved = await atomic(() =>
    store.automation.reserve(job.id, {
      leaseToken,
      revision: job.revision,
      reservationKey: "overrun-reservation",
      amountMicroUsd: 3000,
      stage: "draft",
    }),
  );
  job = reserved.job;
  const cost = await atomic(() =>
    store.automation.reconcile(job.id, "overrun-reservation", {
      leaseToken,
      revision: job.revision,
      confirmed: true,
      actualMicroUsd: 4000,
    }),
  );
  assert.equal(cost.day.paused, true);
  assert.equal(cost.day.spend.overrunMicroUsd, 1000);
  assert.equal(cost.day.spend.actualMicroUsd, 4000);
  await atomic(() => store.automation.enqueue(jobInput("after-overrun")));
  assert.equal(
    await atomic(() => store.automation.claim({ workerId: "blocked" })),
    null,
  );
});
test("permanent corroborating URL aliases survive changed representatives without changing prepared source identity", async (t) => {
  const { store, atomic } = await fixture(t);
  const shared = {
    url: "https://corroborator.test/report",
    title: "Independent corroboration",
  };
  const first = jobInput("representative-a");
  first.provenance.sources = [...first.sourcePacket.sources, shared];
  const created = await atomic(() => store.automation.enqueue(first));
  const alternate = jobInput("representative-b");
  alternate.provenance.sourceId = "second-publisher.test";
  alternate.provenance.sources = [shared, ...alternate.sourcePacket.sources];
  const duplicate = await atomic(() => store.automation.enqueue(alternate));
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.job.id, created.job.id);
  assert.deepEqual(duplicate.job.provenance.sources, first.provenance.sources);
  const transitive = jobInput("representative-c");
  transitive.provenance.sources = [
    ...alternate.sourcePacket.sources,
    ...transitive.sourcePacket.sources,
  ];
  assert.equal(
    (await atomic(() => store.automation.enqueue(transitive))).job.id,
    created.job.id,
  );
  const articleA = draft("representative-a", "e".repeat(64));
  articleA.provenance.sources = first.provenance.sources;
  const original = await atomic(() =>
    store.ingestAutomation(automationArticle(articleA)),
  );
  const articleB = draft("representative-b", "f".repeat(64));
  articleB.provenance.sourceId = "second-publisher.test";
  articleB.provenance.sources = alternate.provenance.sources;
  const articleDuplicate = await atomic(() =>
    store.ingestAutomation(automationArticle(articleB)),
  );
  assert.equal(articleDuplicate.duplicate, true);
  assert.equal(articleDuplicate.articleId, original.articleId);
  assert.deepEqual(
    articleDuplicate.article.provenance,
    original.article.provenance,
  );
  const articleC = draft("representative-c", "1".repeat(64));
  articleC.provenance.sources = transitive.provenance.sources;
  assert.equal(
    (await atomic(() => store.ingestAutomation(automationArticle(articleC))))
      .articleId,
    original.articleId,
  );
  const keys = sourceKeys({
    ...articleA.provenance,
    sources: [
      shared,
      { ...shared, url: shared.url + "#fragment" },
      ...first.provenance.sources,
    ],
  });
  assert.deepEqual(keys, [...keys].sort());
  assert.equal(keys.length, 4);
  const different = jobInput("independent-event");
  const independent = await atomic(() => store.automation.enqueue(different));
  assert.notEqual(independent.job.id, created.job.id);
  const conflict = jobInput("conflicting-report");
  conflict.provenance.sources = [
    ...first.provenance.sources,
    ...different.sourcePacket.sources,
  ];
  await assert.rejects(
    atomic(() => store.automation.enqueue(conflict)),
    (e) => e.status === 409,
  );
});
module.exports = { draft, jobInput, packet };
