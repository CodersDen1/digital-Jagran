const {
  randomUUID,
  randomBytes,
  createHash,
  timingSafeEqual,
} = require("node:crypto");
const { HttpError } = require("./domain");
const { sourceKeys } = require("./automation");
const hash = (x) => createHash("sha256").update(x).digest("hex");
const clone = (x) => structuredClone(x);
const DAY_ZONE = "Asia/Kolkata";
const dayFor = (now) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: DAY_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
const number = (v, name, max = Number.MAX_SAFE_INTEGER, min = 0) => {
  if (!Number.isSafeInteger(v) || v < min || v > max)
    throw new HttpError(
      422,
      `${name} must be an integer from ${min} to ${max}.`,
    );
  return v;
};
const string = (v, name, max = 200) => {
  if (
    typeof v !== "string" ||
    !v.trim() ||
    v.length > max ||
    /[\u0000-\u001f\u007f]/.test(v)
  )
    throw new HttpError(422, `Provide valid ${name}.`);
  return v.trim();
};
function safeJson(value, maxBytes = 350000) {
  const visit = (v, depth) => {
    if (depth > 12)
      throw new HttpError(422, "Automation data is nested too deeply.");
    if (v === null || typeof v === "boolean" || typeof v === "string") return;
    if (typeof v === "number" && Number.isFinite(v)) return;
    if (Array.isArray(v)) {
      if (v.length > 100)
        throw new HttpError(422, "Automation arrays are too large.");
      for (const item of v) visit(item, depth + 1);
      return;
    }
    if (v && typeof v === "object") {
      const keys = Object.keys(v);
      if (
        keys.length > 50 ||
        keys.some((k) =>
          /^(authorization|cookie|password|api[_-]?key|access[_-]?token|secret|__proto__|prototype|constructor)$/i.test(
            k,
          ),
        )
      )
        throw new HttpError(
          422,
          "Checkpoint credentials and reserved object keys are forbidden.",
        );
      for (const x of Object.values(v)) visit(x, depth + 1);
      return;
    }
    throw new HttpError(422, "Provide JSON automation data.");
  };
  visit(value, 0);
  if (Buffer.byteLength(JSON.stringify(value)) > maxBytes)
    throw new HttpError(422, "Automation data exceeds its size limit.");
  return clone(value);
}
const sourcePacket = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new HttpError(422, "Provide a sourcePacket.");
  const allowed = [
    "title",
    "summary",
    "category",
    "newsPublishedAt",
    "canonicalUrl",
    "sources",
    "referenceImages",
  ];
  if (Object.keys(input).some((k) => !allowed.includes(k)))
    throw new HttpError(422, "Unknown source packet field.");
  const p = safeJson(input, 100000);
  string(p.title, "source title", 500);
  string(p.summary, "source summary", 20000);
  string(p.category, "source category", 100);
  let url;
  try {
    url = new URL(p.canonicalUrl);
  } catch {}
  if (
    !url ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new HttpError(422, "Provide a canonical HTTP(S) source URL.");
  if (!Array.isArray(p.sources) || !p.sources.length || p.sources.length > 30)
    throw new HttpError(422, "Source packet needs 1–30 source references.");
  for (const s of p.sources) {
    let u;
    try {
      u = new URL(s.url);
    } catch {}
    if (
      !u ||
      !["http:", "https:"].includes(u.protocol) ||
      u.username ||
      u.password
    )
      throw new HttpError(422, "Provide valid source reference URLs.");
  }
  p.canonicalUrl = url.href;
  return p;
};
const phases = {
  queued: ["draft_prepared"],
  draft_prepared: ["draft_uncertain"],
  draft_uncertain: ["draft_done"],
  draft_done: ["factcheck_prepared"],
  factcheck_prepared: ["factcheck_uncertain"],
  factcheck_uncertain: ["factcheck_done"],
  factcheck_done: ["ingest_prepared"],
  ingest_prepared: ["ingest_uncertain"],
  ingest_uncertain: [],
  completed: [],
  failed: [],
};
const checkpointKeys = [
  "submissionKeys",
  "draftRequest",
  "draftText",
  "draftTaskId",
  "factcheckRequest",
  "factcheckText",
  "factcheckTaskId",
  "articlePayload",
  "ingestResult",
  "lastError",
];
const immutableKeys = [
  "draftRequest",
  "draftText",
  "draftTaskId",
  "factcheckRequest",
  "factcheckText",
  "factcheckTaskId",
  "articlePayload",
];
function checkpoint(old, input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((k) => !checkpointKeys.includes(k))
  )
    throw new HttpError(422, "Unknown or invalid checkpoint fields.");
  for (const field of ["draftText", "factcheckText"])
    if (
      input[field] != null &&
      (typeof input[field] !== "string" ||
        !input[field].trim() ||
        input[field].length > 150000)
    )
      throw new HttpError(
        422,
        "Confirmed stage text must be a bounded nonempty string.",
      );
  for (const field of ["draftTaskId", "factcheckTaskId"])
    if (input[field] != null) string(input[field], field);
  for (const field of ["draftRequest", "factcheckRequest"])
    if (
      input[field] != null &&
      (!input[field] ||
        typeof input[field] !== "object" ||
        Array.isArray(input[field]))
    )
      throw new HttpError(
        422,
        "Prepared provider requests must be JSON objects.",
      );
  const data = safeJson(input);
  const result = { ...clone(old), ...data };
  for (const key of immutableKeys)
    if (
      old[key] != null &&
      data[key] != null &&
      JSON.stringify(old[key]) !== JSON.stringify(data[key])
    )
      throw new HttpError(
        409,
        `Prepared ${key} is immutable; reconcile the existing submission.`,
      );
  if (data.submissionKeys) {
    if (
      typeof data.submissionKeys !== "object" ||
      Array.isArray(data.submissionKeys) ||
      Object.keys(data.submissionKeys).some(
        (k) => !["draft", "factcheck", "ingest"].includes(k),
      )
    )
      throw new HttpError(
        422,
        "Provide draft/factcheck/ingest submission keys only.",
      );
    result.submissionKeys = { ...old.submissionKeys, ...data.submissionKeys };
    for (const [key, value] of Object.entries(data.submissionKeys)) {
      if (typeof value !== "string" || !/^[\x20-\x7e]{8,128}$/.test(value))
        throw new HttpError(
          422,
          "Submission keys require 8–128 printable ASCII characters.",
        );
      if (old.submissionKeys?.[key] && old.submissionKeys[key] !== value)
        throw new HttpError(
          409,
          "Submission keys remain stable after preparation.",
        );
    }
  }
  safeJson(result);
  return result;
}
function createAutomationQueue(adapter, config = {}) {
  const budget = number(
    Number(config.dailyBudgetMicroUsd || 0),
    "Daily budget",
    100000000000,
  );
  const maxAttempts = number(
    Number(config.maxAttempts || 5),
    "Maximum attempts",
    20,
    1,
  );
  const maxJobs = number(
    Number(config.dailyMaxJobs || 150),
    "Daily maximum jobs",
    10000,
    1,
  );
  const minimumReservation = number(
    Number(config.minimumReservationMicroUsd || 1),
    "Minimum reservation",
    100000000000,
    1,
  );
  const now = config.now || Date.now;
  const publicJob = (job) => {
    if (!job) return null;
    const { leaseTokenHash, ...rest } = clone(job);
    return rest;
  };
  const loadDay = async (day) =>
    (await adapter.getDay(day)) || {
      day,
      timeZone: DAY_ZONE,
      counts: { enqueued: 0, claimed: 0, reviewed: 0, completed: 0, failed: 0 },
      reservedMicroUsd: 0,
      actualMicroUsd: 0,
      revision: 0,
      schemaVersion: 2,
    };
  const saveDay = async (d) => {
    d.revision++;
    await adapter.putDay(d);
  };
  const dayView = (d) => ({
    day: d.day,
    timeZone: DAY_ZONE,
    target: 100,
    counts: d.counts,
    spend: {
      reservedMicroUsd: d.reservedMicroUsd,
      actualMicroUsd: d.actualMicroUsd,
      overrunMicroUsd: d.overrunMicroUsd || 0,
      budgetMicroUsd: budget,
      remainingMicroUsd: Math.max(
        0,
        budget - d.reservedMicroUsd - d.actualMicroUsd,
      ),
    },
    paused:
      Boolean(d.overrunMicroUsd) ||
      budget === 0 ||
      budget - d.reservedMicroUsd - d.actualMicroUsd < minimumReservation,
    limits: {
      maxAttempts,
      dailyMaxJobs: maxJobs,
      minimumReservationMicroUsd: minimumReservation,
    },
    revision: d.revision,
  });
  const getJob = async (id) => {
    const j = await adapter.getJob(string(id, "job ID", 100));
    if (!j) throw new HttpError(404, "Automation job not found.");
    return j;
  };
  const leased = async (id, input) => {
    const job = await getJob(id);
    const candidate =
      typeof input.leaseToken === "string" && input.leaseToken.length <= 128
        ? input.leaseToken
        : "";
    const equal = timingSafeEqual(
      Buffer.from(hash(candidate), "hex"),
      Buffer.from(job.leaseTokenHash || hash("absent"), "hex"),
    );
    if (
      job.state !== "leased" ||
      !equal ||
      !candidate ||
      job.leaseUntil <= now() ||
      input.revision !== job.revision
    )
      throw new HttpError(
        409,
        "Job lease or revision is stale. Recover or reload the job.",
      );
    return job;
  };
  const saveJob = async (job) => {
    job.revision++;
    job.updatedAt = new Date(now()).toISOString();
    await adapter.putJob(job);
    return publicJob(job);
  };
  const queue = {
    async enqueue(input) {
      const packet = sourcePacket(input.sourcePacket);
      const p = input.provenance || {};
      const provenance = {
        ...safeJson(p, 20000),
        origin: "n8n",
        sourceId: string(p.sourceId, "source ID"),
        eventId: string(p.eventId, "event ID", 1000),
        sources: clone(p.sources ?? packet.sources),
      };
      provenance.contentFingerprint =
        p.contentFingerprint ||
        hash(
          JSON.stringify([
            packet.canonicalUrl,
            packet.title,
            packet.summary,
            packet.newsPublishedAt || "",
          ]),
        );
      if (!/^[a-f0-9]{64}$/i.test(provenance.contentFingerprint))
        throw new HttpError(422, "contentFingerprint must be SHA-256 hex.");
      provenance.contentFingerprint =
        provenance.contentFingerprint.toLowerCase();
      const keys = sourceKeys(provenance);
      const existing = await adapter.getKeys(keys);
      const ids = [...new Set(existing.map((x) => x.jobId))];
      if (ids.length > 1)
        throw new HttpError(
          409,
          "Source event and fingerprint refer to different jobs.",
        );
      if (ids.length) {
        for (const key of keys) await adapter.putKey(key, ids[0]);
        return { job: publicJob(await getJob(ids[0])), duplicate: true };
      }
      const stamp = new Date(now()).toISOString();
      const job = {
        id: randomUUID(),
        provenance,
        sourcePacket: packet,
        state: "queued",
        recoveryPriority: 1,
        phase: "queued",
        revision: 1,
        attempts: 0,
        availableAt: now(),
        createdAt: stamp,
        updatedAt: stamp,
        checkpoint: {},
        reservations: {},
        claimDays: [],
        schemaVersion: 2,
      };
      await adapter.putJob(job);
      for (const key of keys) await adapter.putKey(key, job.id);
      const d = await loadDay(dayFor(now()));
      d.counts.enqueued++;
      await saveDay(d);
      return { job: publicJob(job), duplicate: false };
    },
    async get(id) {
      return { job: publicJob(await getJob(id)) };
    },
    async day(day = dayFor(now())) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day))
        throw new HttpError(422, "Invalid day.");
      return dayView(await loadDay(day));
    },
    async recordIngest() {
      const d = await loadDay(dayFor(now()));
      if (d.counts.reviewed >= maxJobs)
        throw new HttpError(429, "Daily automation review quota reached.");
      d.counts.reviewed++;
      await saveDay(d);
    },
    async claim(input) {
      const workerId = string(input.workerId, "worker ID");
      const seconds = number(
        input.leaseSeconds ?? 120,
        "Lease seconds",
        300,
        30,
      );
      const day = dayFor(now());
      const d = await loadDay(day);
      const job = await adapter.findCandidate(now(), maxAttempts);
      if (!job) return null;
      if (!job.claimDays.includes(day) && d.counts.claimed >= maxJobs)
        return null;
      if (
        (job.phase === "queued" ||
          job.phase === "draft_prepared" ||
          job.phase === "factcheck_prepared") &&
        (d.overrunMicroUsd ||
          budget === 0 ||
          budget - d.reservedMicroUsd - d.actualMicroUsd < minimumReservation)
      )
        return null;
      const token = randomBytes(32).toString("hex");
      job.attempts++;
      job.state = "leased";
      job.workerId = workerId;
      job.leaseUntil = now() + seconds * 1000;
      job.leaseTokenHash = hash(token);
      if (!job.claimDays.includes(day)) {
        job.claimDays.push(day);
        d.counts.claimed++;
        await saveDay(d);
      }
      return { job: await saveJob(job), leaseToken: token };
    },
    async patch(id, input) {
      const job = await leased(id, input);
      const action = input.action;
      if (action === "renew")
        job.leaseUntil =
          now() +
          number(input.leaseSeconds ?? 120, "Lease seconds", 300, 30) * 1000;
      else if (action === "checkpoint") {
        const next = input.phase || job.phase;
        if (next !== job.phase && !phases[job.phase]?.includes(next))
          throw new HttpError(409, "Invalid automation phase transition.");
        if (input.checkpoint)
          job.checkpoint = checkpoint(job.checkpoint, input.checkpoint);
        const c = job.checkpoint;
        if (
          next === "draft_prepared" &&
          (!c.submissionKeys?.draft || !c.draftRequest)
        )
          throw new HttpError(
            422,
            "Prepare an immutable draft request and submission key.",
          );
        if (
          next === "factcheck_prepared" &&
          (!c.submissionKeys?.factcheck || !c.factcheckRequest)
        )
          throw new HttpError(
            422,
            "Prepare an immutable factcheck request and submission key.",
          );
        if (next === "draft_done" && !c.draftText)
          throw new HttpError(
            422,
            "Record the confirmed draft response first.",
          );
        if (next === "factcheck_done" && !c.factcheckText)
          throw new HttpError(
            422,
            "Record the confirmed factcheck response first.",
          );
        if (next === "ingest_prepared") {
          if (!c.submissionKeys?.ingest || !c.articlePayload)
            throw new HttpError(
              422,
              "Prepare an immutable article payload and submission key.",
            );
          const { automationArticle } = require("./automation");
          const a = automationArticle(c.articlePayload);
          if (
            sourceKeys(a.provenance).join("|") !==
            sourceKeys(job.provenance).join("|")
          )
            throw new HttpError(
              409,
              "Article payload must retain job source identity and fingerprint.",
            );
        }
        if (next === "draft_uncertain" || next === "factcheck_uncertain") {
          const stage = next.split("_")[0];
          if (
            !Object.values(job.reservations).some(
              (r) => r.stage === stage && r.state === "reserved",
            )
          )
            throw new HttpError(
              409,
              "Reserve the maximum expected stage cost before submission.",
            );
        }
        job.phase = next;
        job.recoveryPriority = next.endsWith("_uncertain") ? 0 : 1;
      } else if (action === "retry") {
        if (job.attempts >= maxAttempts)
          throw new HttpError(
            409,
            "Maximum attempts reached; operator reconciliation is required.",
          );
        job.state = "queued";
        job.availableAt =
          now() +
          number(input.retryAfterSeconds ?? 60, "Retry seconds", 86400, 1) *
            1000;
        delete job.leaseTokenHash;
        job.leaseUntil = 0;
      } else if (action === "fail") {
        job.state = "failed";
        job.failedPhase = job.phase;
        job.phase = "failed";
        if (input.checkpoint)
          job.checkpoint = checkpoint(job.checkpoint, input.checkpoint);
        const d = await loadDay(dayFor(now()));
        d.counts.failed++;
        await saveDay(d);
        delete job.leaseTokenHash;
        job.leaseUntil = 0;
      } else if (action === "complete") {
        if (job.phase !== "ingest_uncertain")
          throw new HttpError(
            409,
            "Complete only after the prepared ingestion attempt.",
          );
        const articleId = await adapter.articleForKeys(
          sourceKeys(job.provenance),
        );
        if (!articleId)
          throw new HttpError(
            409,
            "No durable ingested article exists for this job.",
          );
        if (Object.values(job.reservations).some((r) => r.state === "reserved"))
          throw new HttpError(
            409,
            "Reconcile all cost reservations before completing.",
          );
        job.articleId = articleId;
        job.phase = "completed";
        job.state = "completed";
        job.leaseUntil = 0;
        delete job.leaseTokenHash;
        const d = await loadDay(dayFor(now()));
        d.counts.completed++;
        await saveDay(d);
      } else throw new HttpError(422, "Unknown job action.");
      return { job: await saveJob(job) };
    },
    async reserve(id, input) {
      const job = await leased(id, input);
      const key = string(input.reservationKey, "reservation key", 128);
      if (!/^[a-zA-Z0-9._-]{8,128}$/.test(key))
        throw new HttpError(
          422,
          "Use a stable 8–128 character reservation key.",
        );
      const amount = number(
        input.amountMicroUsd,
        "Reservation amount",
        100000000000,
        minimumReservation,
      );
      const stage = input.stage;
      if (
        !["draft", "factcheck"].includes(stage) ||
        job.phase !== stage + "_prepared"
      )
        throw new HttpError(
          409,
          "Reserve only the prepared text-generation stage.",
        );
      if (job.reservations[key]) {
        const existing = job.reservations[key];
        if (existing.amountMicroUsd !== amount || existing.stage !== stage)
          throw new HttpError(409, "Reservation key mismatch.");
        return {
          job: publicJob(job),
          reservation: existing,
          day: dayView(await loadDay(existing.day)),
        };
      }
      if (
        Object.keys(job.reservations).length >= 4 ||
        Object.values(job.reservations).some((r) => r.stage === stage)
      )
        throw new HttpError(
          409,
          "A stage has one stable cost reservation; reconcile it instead of resubmitting.",
        );
      const d = await loadDay(dayFor(now()));
      if (
        d.overrunMicroUsd ||
        budget === 0 ||
        amount > budget - d.reservedMicroUsd - d.actualMicroUsd
      )
        throw new HttpError(
          429,
          "Automation daily spend cap reached or paid work is paused.",
        );
      const r = {
        key,
        stage,
        day: d.day,
        amountMicroUsd: amount,
        state: "reserved",
        createdAt: new Date(now()).toISOString(),
      };
      job.reservations[key] = r;
      d.reservedMicroUsd += amount;
      await saveDay(d);
      return { job: await saveJob(job), reservation: r, day: dayView(d) };
    },
    async reconcile(id, key, input) {
      const job = await leased(id, input);
      const r = job.reservations[string(key, "reservation key", 128)];
      if (!r) throw new HttpError(404, "Cost reservation not found.");
      if (input.confirmed !== true)
        throw new HttpError(
          422,
          "Unknown provider outcomes must retain their reservation; reconcile only confirmed cost.",
        );
      const actual = number(input.actualMicroUsd, "Actual cost", 100000000000);
      const taskId =
        input.taskId == null
          ? undefined
          : string(input.taskId, "provider task ID");
      if (r.state === "reconciled") {
        if (r.actualMicroUsd !== actual || r.taskId !== taskId)
          throw new HttpError(409, "Cost reconciliation is immutable.");
        return {
          job: publicJob(job),
          reservation: r,
          day: dayView(await loadDay(r.day)),
        };
      }
      if (taskId) {
        const field = r.stage + "TaskId";
        if (job.checkpoint[field] && job.checkpoint[field] !== taskId)
          throw new HttpError(409, "Provider task identity is immutable.");
        job.checkpoint[field] = taskId;
      }
      const d = await loadDay(r.day);
      d.reservedMicroUsd -= r.amountMicroUsd;
      d.actualMicroUsd += actual;
      if (actual > r.amountMicroUsd)
        d.overrunMicroUsd =
          (d.overrunMicroUsd || 0) + actual - r.amountMicroUsd;
      r.state = "reconciled";
      r.actualMicroUsd = actual;
      if (taskId) r.taskId = taskId;
      r.reconciledAt = new Date(now()).toISOString();
      await saveDay(d);
      return { job: await saveJob(job), reservation: r, day: dayView(d) };
    },
  };
  for (const name of [
    "enqueue",
    "recordIngest",
    "claim",
    "patch",
    "reserve",
    "reconcile",
  ]) {
    const run = queue[name];
    queue[name] = async (...args) => {
      adapter.assertAtomic();
      return run(...args);
    };
  }
  return queue;
}
module.exports = {
  createAutomationQueue,
  dayFor,
  safeJson,
  sourcePacket,
  phases,
};
