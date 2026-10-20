const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { mongoStore } = require("../newsroom/store");
const { automationArticle } = require("../newsroom/automation");
const { validateMedia } = require("../newsroom/automation-media");
const baseUri = process.env.TEST_MONGODB_URI;
test(
  "Mongo automation: permanent dedup, cross-instance claims, atomic budget cap, recoverable state and GridFS",
  { skip: !baseUri, timeout: 60000 },
  async () => {
    const parsed = new URL(baseUri);
    assert.match(parsed.pathname, /^\/dj_test_[a-zA-Z0-9_]+$/);
    parsed.pathname += "_automation";
    const uri = parsed.href;
    const setup = await mongoose
      .createConnection(uri, {
        autoIndex: false,
        autoCreate: false,
        serverSelectionTimeoutMS: 5000,
      })
      .asPromise();
    let a, b;
    let clock = Date.parse("2026-10-20T10:00:00Z");
    const config = { dailyBudgetMicroUsd: 9000, now: () => clock };
    const packet = (name) => ({
      sourcePacket: {
        title: name,
        summary: "Verified source summary",
        category: "india",
        canonicalUrl: "https://source.test/" + name,
        sources: [{ url: "https://source.test/" + name, title: name }],
      },
      provenance: { sourceId: "source.test", eventId: name },
    });
    const body = (name) =>
      automationArticle({
        slug: "mongo-auto-" + name,
        category: "india",
        author: "News desk",
        translations: {
          en: {
            title: "English review",
            summary: "Summary",
            body: "English original draft",
          },
          hi: {
            title: "हिंदी समीक्षा",
            summary: "सारांश",
            body: "समीक्षा के लिए हिंदी पाठ",
          },
        },
        sources: [{ label: "Source", url: "https://source.test/" + name }],
        provenance: {
          sourceId: "source.test",
          eventId: name,
          contentFingerprint: "c".repeat(64),
          sources: [{ url: "https://source.test/" + name }],
          imageGenerated: false,
        },
      });
    const atomic = (store, fn) =>
      store.idempotent(crypto.randomUUID(), "same-test-hash", fn);
    try {
      const migrate = spawnSync(
        process.execPath,
        [path.resolve(__dirname, "../newsroom/indexes.js"), "--apply"],
        {
          env: { ...process.env, MONGODB_URI: uri },
          encoding: "utf8",
          windowsHide: true,
        },
      );
      assert.equal(migrate.status, 0, migrate.stderr);
      a = await mongoStore(uri, config);
      b = await mongoStore(uri, config);
      const ingested = await Promise.all(
        Array.from({ length: 8 }, (_, i) => {
          const store = i % 2 ? a : b;
          return atomic(store, () => store.ingestAutomation(body("first")));
        }),
      );
      assert.equal(ingested.filter((x) => !x.duplicate).length, 1);
      assert.equal(new Set(ingested.map((x) => x.articleId)).size, 1);
      assert.equal((await a.automation.day()).counts.reviewed, 1);
      await setup.db.collection("newsroom_idempotency").deleteMany({});
      const alias = await atomic(b, () => b.ingestAutomation(body("alias")));
      assert.equal(alias.duplicate, true);
      assert.equal(alias.articleId, ingested[0].articleId);
      const changedRepresentative = body("different-publisher");
      changedRepresentative.provenance.contentFingerprint = "e".repeat(64);
      changedRepresentative.provenance.sourceId = "other-publisher.test";
      changedRepresentative.provenance.sources = [
        { url: "https://source.test/first" },
        { url: "https://source.test/different-publisher" },
      ];
      assert.equal(
        (await atomic(a, () => a.ingestAutomation(changedRepresentative)))
          .articleId,
        ingested[0].articleId,
      );
      const modified = body("alias");
      modified.provenance.contentFingerprint = "d".repeat(64);
      assert.equal(
        (await atomic(a, () => a.ingestAutomation(modified))).articleId,
        ingested[0].articleId,
      );
      const enqueues = await Promise.all(
        Array.from({ length: 8 }, (_, i) => {
          const store = i % 2 ? a : b;
          return atomic(store, () =>
            store.automation.enqueue(packet("queue-one")),
          );
        }),
      );
      assert.equal(enqueues.filter((x) => !x.duplicate).length, 1);
      assert.equal(new Set(enqueues.map((x) => x.job.id)).size, 1);
      const changedQueueRepresentative = packet("queue-alternate");
      changedQueueRepresentative.provenance.sourceId = "other-publisher.test";
      changedQueueRepresentative.sourcePacket.sources.push({
        url: "https://source.test/queue-one",
        title: "Corroboration",
      });
      const alternateQueue = await atomic(b, () =>
        b.automation.enqueue(changedQueueRepresentative),
      );
      assert.equal(alternateQueue.duplicate, true);
      assert.equal(alternateQueue.job.id, enqueues[0].job.id);
      const claims = await Promise.all(
        Array.from({ length: 8 }, (_, i) => {
          const store = i % 2 ? a : b;
          return atomic(store, () =>
            store.automation.claim({
              workerId: "worker-" + i,
              leaseSeconds: 30,
            }),
          );
        }),
      );
      assert.equal(claims.filter(Boolean).length, 1);
      let one = claims.find(Boolean);
      await atomic(a, () => a.automation.enqueue(packet("queue-two")));
      let two = await atomic(b, () =>
        b.automation.claim({ workerId: "worker-two", leaseSeconds: 30 }),
      );
      for (const [store, c] of [
        [a, one],
        [b, two],
      ]) {
        const r = await atomic(store, () =>
          store.automation.patch(c.job.id, {
            leaseToken: c.leaseToken,
            revision: c.job.revision,
            action: "checkpoint",
            phase: "draft_prepared",
            checkpoint: {
              submissionKeys: { draft: "prepared-draft-key" },
              draftRequest: { model: "text-only", messages: [] },
            },
          }),
        );
        c.job = r.job;
      }
      const reserves = await Promise.allSettled(
        [
          [a, one],
          [b, two],
        ].map(([store, c]) =>
          atomic(store, () =>
            store.automation.reserve(c.job.id, {
              leaseToken: c.leaseToken,
              revision: c.job.revision,
              reservationKey: "stable-reservation",
              amountMicroUsd: 6000,
              stage: "draft",
            }),
          ),
        ),
      );
      assert.equal(reserves.filter((x) => x.status === "fulfilled").length, 1);
      assert.equal(
        reserves.find((x) => x.status === "rejected").reason.status,
        429,
      );
      assert.equal((await a.automation.day()).spend.reservedMicroUsd, 6000);
      const winner = reserves.findIndex((x) => x.status === "fulfilled");
      const lease = [one, two][winner].leaseToken;
      let job = reserves[winner].value.job;
      const uncertain = await atomic(a, () =>
        a.automation.patch(job.id, {
          leaseToken: lease,
          revision: job.revision,
          action: "checkpoint",
          phase: "draft_uncertain",
        }),
      );
      job = uncertain.job;
      await a.close();
      a = await mongoStore(uri, config);
      const durable = await a.automation.get(job.id);
      assert.equal(durable.job.phase, "draft_uncertain");
      assert.equal(
        durable.job.checkpoint.submissionKeys.draft,
        "prepared-draft-key",
      );
      clock += 31000;
      const recovery = await atomic(b, () =>
        b.automation.claim({ workerId: "recovered", leaseSeconds: 120 }),
      );
      assert.equal(recovery.job.id, job.id);
      assert.equal(recovery.job.phase, "draft_uncertain");
      assert.notEqual(recovery.leaseToken, lease);
      await assert.rejects(
        atomic(a, () =>
          a.automation.patch(job.id, {
            leaseToken: lease,
            revision: job.revision,
            action: "renew",
          }),
        ),
        (e) => e.status === 409,
      );
      const cost = await atomic(b, () =>
        b.automation.reconcile(job.id, "stable-reservation", {
          leaseToken: recovery.leaseToken,
          revision: recovery.job.revision,
          confirmed: true,
          actualMicroUsd: 2000,
          taskId: "confirmed-task",
        }),
      );
      assert.equal(cost.day.spend.reservedMicroUsd, 0);
      assert.equal(cost.day.spend.actualMicroUsd, 2000);
      const sharp = require("sharp");
      const bytes = await sharp({
        create: { width: 10, height: 8, channels: 3, background: "#0044aa" },
      })
        .png()
        .toBuffer();
      const validated = await validateMedia({
        contentType: "image/png",
        base64: bytes.toString("base64"),
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Reference",
        license: "CC BY 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
        credit: "Source creator",
      });
      const media = await Promise.all(
        [a, b].map((store) => atomic(store, () => store.putMedia(validated))),
      );
      assert.equal(new Set(media.map((x) => x.hash)).size, 1);
      assert.equal(
        await setup.db.collection("newsroom_media").countDocuments(),
        1,
      );
      const image = await b.getMedia(media[0].hash);
      assert.equal(image.rights.license, "CC BY 4.0");
      const received = await new Promise((resolve, reject) => {
        const parts = [];
        const stream = image.open();
        stream.on("data", (b) => parts.push(b));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(parts)));
      });
      assert.deepEqual(received, validated.buffer);
      assert.equal((await sharp(received).metadata()).format, "webp");
      const bucket = new mongoose.mongo.GridFSBucket(setup.db, {
        bucketName: "newsroom_media_bytes",
      });
      const orphan = bucket.openUploadStream("gc-orphan");
      await new Promise((resolve, reject) => {
        orphan.on("finish", resolve);
        orphan.on("error", reject);
        orphan.end(Buffer.from("orphan-fixture"));
      });
      await setup.db
        .collection("newsroom_media_bytes.files")
        .updateMany(
          {},
          { $set: { uploadDate: new Date(Date.now() - 3 * 86400000) } },
        );
      const before = await setup.db
        .collection("newsroom_media_bytes.files")
        .countDocuments();
      const gc = (args) =>
        spawnSync(
          process.execPath,
          [path.resolve(__dirname, "../newsroom/media-gc.js"), ...args],
          {
            env: { ...process.env, MONGODB_URI: uri },
            encoding: "utf8",
            windowsHide: true,
          },
        );
      const dry = gc([]);
      assert.equal(dry.status, 0, dry.stderr);
      assert.match(dry.stdout, /orphan_media_dry_run/);
      assert.equal(
        await setup.db
          .collection("newsroom_media_bytes.files")
          .countDocuments(),
        before,
      );
      const applied = gc(["--apply"]);
      assert.equal(applied.status, 0, applied.stderr);
      assert.equal(
        await setup.db
          .collection("newsroom_media_bytes.files")
          .countDocuments(),
        1,
      );
      assert.ok(await b.getMedia(media[0].hash));
    } finally {
      for (const store of [a, b]) if (store) await store.close();
      await setup.dropDatabase();
      await setup.close();
    }
  },
);
