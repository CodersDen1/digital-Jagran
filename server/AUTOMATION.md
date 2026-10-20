# Review-only automation API

The automation API runs inside the existing server. It never calls Kie, fetches arbitrary image URLs, publishes a story, or configures n8n. The worker downloads sources/reference images and makes authorized text-only provider calls. All automation endpoints require `/api/v1` and `Authorization: Bearer <AUTOMATION_INGEST_TOKEN>`. This independent secret contains32–512 non-whitespace characters; editor passwords and cookies do not substitute for it. SHA-256 hashes are compared with `timingSafeEqual`. Disabled/unconfigured integrations return401. The token grants no admin/session/publishing permissions. Configuring it equal to ADMIN_PASSWORD is rejected.

All POST/PATCH requests require `Content-Type: application/json` and `Idempotency-Key` (8–128 printable ASCII). Keep each key and exact body stable across uncertain network outcomes. Key replay preserves the original status/body; changed bodies return409. GETs and errors are no-store. No credentials belong in payloads, source packets, checkpoints or logs.

## Configuration and rollout

| Variable                               | Default | Purpose                                                                                                                                                        |
| -------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTOMATION_INGEST_TOKEN`              | unset   | Independent machine secret; unset disables automation.                                                                                                         |
| `AUTOMATION_DAILY_BUDGET_MICRO_USD`    | 0       | Maximum new daily reservations plus reconciled actual cost, in integer microUSD. 900000 means US$0.90. Default0 pauses new paid work.                          |
| `AUTOMATION_MIN_RESERVATION_MICRO_USD` | 1       | Deployment-enforced minimum per text-stage reservation; set from researched maximum token/model pricing. Never treat this minimum as a provider cost estimate. |
| `AUTOMATION_MAX_ATTEMPTS`              | 5       | Maximum lease acquisitions per job, capped20. Renew an active lease rather than claiming each phase.                                                           |
| `AUTOMATION_DAILY_MAX_JOBS`            | 150     | Daily unique claimed jobs and newly ingested review drafts, capped10000.                                                                                       |

Writes use the server's **Asia/Kolkata** calendar day. Request-supplied dates/budgets/attempt limits cannot change quotas. Historical day reads cannot change the charge day. Target100/day is reported as a throughput goal; budget, source availability, quality failures and human editorial review can reduce output. No paid request is made by this server, and it cannot independently verify a provider's eventual bill. The trusted worker must reserve a conservative **maximum** based on the actual model, input/output token bounds and price before each paid call. A reservation is permission for that bounded call, not for unlimited provider use. Provider account limits should independently match the intended spend ceiling.

Apply the additive indexes before rolling out new code. Startup validates automation/media indexes even when the automation token is disabled:

```powershell
# Explicit MONGODB_URI from your deployment secret mechanism; neither command reads .env.
npm run migrate:indexes --prefix server
npm run migrate:indexes --prefix server -- --apply
```

Mongo uses existing replica-set transactions for ledger, queue, leases, daily counts, reservations, source aliases and article writes. New no-TTL collections are `newsroom_automation_sources`, `newsroom_automation_jobs`, `newsroom_automation_job_keys`, `newsroom_automation_days`, `newsroom_media`, plus GridFS bucket `newsroom_media_bytes`. Permanent source/job aliases remain after the48h HTTP replay ledger expires. Back them up with articles. File mode is a single-process development equivalent using the same atomic state-file rename and a sibling `<DATA_FILE>.media` directory.

## Source queue

`POST /api/v1/automation/jobs`:

```json
{
  "sourcePacket": {
    "title": "Source report title",
    "summary": "Source evidence and relevant context; do not invent missing facts.",
    "category": "india",
    "newsPublishedAt": "2026-10-20T09:00:00Z",
    "canonicalUrl": "https://publisher.example/report",
    "sources": [
      {
        "url": "https://publisher.example/report",
        "title": "Source report title",
        "summary": "Relevant excerpt or summary within your reuse rights.",
        "publishedAt": "2026-10-20T09:00:00Z",
        "retrievedAt": "2026-10-20T09:05:00Z",
        "publisher": "Source publisher"
      }
    ],
    "referenceImages": []
  },
  "provenance": {
    "sourceId": "publisher.example",
    "eventId": "https://publisher.example/report",
    "workflowId": "newsroom-daily",
    "runId": "n8n-execution-id"
  }
}
```

Only those top-level sourcePacket fields are accepted; packet JSON is bounded100000bytes. `sources` needs1–30 HTTP(S) URLs. Optional `provenance.contentFingerprint` is a64hex SHA-256. If omitted, the server hashes JSON `[canonicalUrl,title,summary,newsPublishedAt||'']`; use the returned fingerprint in article ingestion. This fallback deduplicates that exact source packet, not semantic similarity between independent reports. Source/event identity, fingerprint and every provenance.sources[].url are durable aliases (unique, sorted SHA-256 keys; URL fragments removed, query preserved). Queue provenance defaults sources to sourcePacket.sources when omitted. Corroborating URLs therefore retain identity when a later discovery scan selects a different representative. The original stored source packet/provenance and prepared identity stay unchanged. All matching aliases are checked for contradictory job/article references, and duplicate encounters add newly observed URL aliases. Source/event identity and fingerprint are also durable aliases; encountering either existing alias returns the original job and adds the other alias without replacing the original packet. Contradictory aliases referring to different jobs return409.

Reply201 `{job,duplicate:false}` or200 `{job,duplicate:true}`. Use a fresh enqueue HTTP key for a new logical discovery run if runId or source packet changes; permanent source aliases provide cross-run deduplication. Reusing a prior HTTP key with a changed runId/body correctly returns409. Job fields include `id`, `provenance`, `sourcePacket`, `state`, `phase`, integer `revision`, `attempts`, `availableAt` (epochms), `checkpoint`, `reservations`, `claimDays`, and timestamps. `GET /automation/jobs/:id` returns `{job}`. The stored lease-token hash is never returned.

`POST /automation/jobs/claim` body `{workerId:"worker-1",leaseSeconds:120}` returns200 `{job,leaseToken}` or204 with no body. Lease seconds are30–300. Each new logical claim needs a new HTTP key (including a new polling cycle after204); only retries of that exact claim reuse its key. The server atomically selects due queued jobs or expired leases, prioritizing uncertain outcomes. New paid preparation pauses when the daily budget is zero/exhausted/overrun. The server will still allow recovery of uncertain phases so outcomes can be reconciled. One worker owns a lease; failover gets a new token/revision and retains all checkpoints and uncertainty. Each claim increments attempts; max-attempt jobs stop automatic claims and require operator investigation. There is deliberately no automatic attempt-reset or paid-submission reset endpoint.

`PATCH /automation/jobs/:id` always includes `{leaseToken,revision,action,...}`. A stale/expired lease or revision returns409. Use a fresh HTTP idempotency key for a _different_ revision/action; reuse it for retrying that exact request. Responses return `{job}` with the next revision.

| Action       | Additional fields                         | Behavior                                                                                                                                                    |
| ------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renew`      | `leaseSeconds?`                           | Extends an active lease.                                                                                                                                    |
| `checkpoint` | `phase?`, `checkpoint?`                   | Persists the allowed forward phase/checkpoint.                                                                                                              |
| `retry`      | `retryAfterSeconds?` (1–86400, default60) | Releases lease until due; retains phase and reservations. Refused when attempts are exhausted.                                                              |
| `fail`       | `checkpoint?:{lastError:...}`             | Terminal failure; retains unresolved reservations, never assumes no charge.                                                                                 |
| `complete`   | none                                      | Allowed only from ingest_uncertain, after durable ingestion source proof exists and all reservations are reconciled. Marks completed and records articleId. |

Checkpoint keys are limited to `submissionKeys:{draft,factcheck,ingest}`, `draftRequest`, `draftText`, `draftTaskId`, `factcheckRequest`, `factcheckText`, `factcheckTaskId`, `articlePayload`, `ingestResult`, `lastError`. Complete checkpoint JSON is bounded350000bytes, limited nesting/array sizes, and rejects credential/reserved object keys. Prepared requests, response texts, task IDs, articlePayload and submission keys cannot be replaced after storage. Keep articlePayload in exactly its original submitted shape; do not rebuild it from current timestamps or changed generation output after a timeout.

Allowed phase chain:

```text
queued
 -> draft_prepared      (immutable draftRequest + submissionKeys.draft)
 -> draft_uncertain     (matching reserved draft-stage maximum cost required)
 -> draft_done          (confirmed draftText required)
 -> factcheck_prepared  (immutable factcheckRequest + submissionKeys.factcheck)
 -> factcheck_uncertain (matching reserved factcheck-stage maximum cost required)
 -> factcheck_done      (confirmed factcheckText required)
 -> ingest_prepared     (validated review-only bilingual articlePayload + submissionKeys.ingest)
 -> ingest_uncertain
 -> action:complete     (server verifies durable source-to-article identity)
```

The server accepts same-phase checkpoints/renewals, never backward transitions. Before making a paid call, first persist its prepared request/key, reserve its maximum cost, and persist its uncertain phase. A crash before/after the outbound request therefore does **not** grant permission to repeat it. When a recovered job is \*\_uncertain, poll/reconcile an existing known provider task or retain it for operator investigation; never automatically repeat a synchronous chat request with an unknown outcome. A locally stored submission key alone does not prove Kie supports remote idempotency. Confirm a provider response/task before recording output and advancing. Text generation and fact checking are separate stages; image-generation stages do not exist.

## Daily spend

`GET /automation/days/current` or `/automation/days/YYYY-MM-DD`:

```json
{
  "day": "2026-10-20",
  "timeZone": "Asia/Kolkata",
  "target": 100,
  "counts": {
    "enqueued": 0,
    "claimed": 0,
    "reviewed": 0,
    "completed": 0,
    "failed": 0
  },
  "spend": {
    "reservedMicroUsd": 0,
    "actualMicroUsd": 0,
    "overrunMicroUsd": 0,
    "budgetMicroUsd": 900000,
    "remainingMicroUsd": 900000
  },
  "paused": false,
  "limits": {
    "maxAttempts": 5,
    "dailyMaxJobs": 150,
    "minimumReservationMicroUsd": 1
  },
  "revision": 1
}
```

`POST /automation/jobs/:id/reservations`:

```json
{
  "leaseToken": "claim-response-token",
  "revision": 3,
  "reservationKey": "stable-draft-reservation",
  "amountMicroUsd": 4500,
  "stage": "draft"
}
```

The4500 value is an example allowance, **not** a quoted provider price. Compute your actual conservative maximum before using it. Stages are `draft`/`factcheck`; reserve only in the corresponding \*\_prepared phase. One stable reservation per stage is allowed; replay the same key instead of creating another paid attempt. Reservation totals and actual costs must fit the configured server daily cap, otherwise429 and no state changes. Reply201 `{job,reservation,day}`. Reservation has `key,stage,day,amountMicroUsd,state,createdAt`; it remains `reserved` through unknown outcomes, lease expiry, restarts and failures. Never release a reservation merely because an HTTP attempt timed out.

`PATCH /automation/jobs/:id/reservations/:key`:

```json
{
  "leaseToken": "active-lease-token",
  "revision": 5,
  "confirmed": true,
  "actualMicroUsd": 3200,
  "taskId": "confirmed-provider-task-or-response-id"
}
```

`confirmed:true` is mandatory; set it only after confirmed provider usage/response or operator verification of no charge. `actualMicroUsd:0` is not a timeout fallback. Reply200 `{job,reservation,day}`. Reconciliation is immutable and uses the reservation's original day, even after midnight. It releases the original reserved amount and adds the actual confirmed cost. If a provider charge exceeds its reservation, the ledger records the real cost/overrun and pauses further new paid work for that day rather than concealing the charge. This is why conservative bounded token/model pricing and external provider limits are necessary; the server's atomic reservation cap does not intercept an independently executed external provider request.

## Review ingestion and provenance

`POST /api/v1/automation/articles` uses the existing article JSON fields with **both** complete en/hi translations and visible `sources:[{label,url}]`. `status` must be omitted or `review`. `publishedAt`, `id`, and `updatedAt` are forbidden. Featured/breaking are forcedfalse. Publication/scheduling and edits of existing stories are rejected. Add:

```json
{
  "provenance": {
    "origin": "n8n",
    "sourceId": "publisher.example",
    "eventId": "https://publisher.example/report",
    "contentFingerprint": "64-hex-digest-returned-by-enqueue",
    "workflowId": "newsroom-daily",
    "runId": "execution-id",
    "generatedAt": "2026-10-20T10:00:00Z",
    "textModel": "actual-provider-text-model",
    "textTaskId": "confirmed-task-id-if-available",
    "imageGenerated": false,
    "sources": [
      {
        "url": "https://publisher.example/report",
        "title": "Source title",
        "publishedAt": "2026-10-20T09:00:00Z",
        "retrievedAt": "2026-10-20T09:05:00Z"
      }
    ],
    "warnings": ["Human editorial verification required."],
    "imageRights": {
      "license": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
      "creator": "Creator",
      "credit": "Creator / Source",
      "sourceUrl": "https://commons.wikimedia.org/wiki/File:Reference"
    },
    "referenceImages": [
      {
        "url": "https://source.example/image.jpg",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Reference",
        "title": "Reference image",
        "credit": "Creator",
        "license": "CC BY 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0/"
      }
    ]
  }
}
```

`receivedAt` is set by the server. `imageRights` is required when article.image is nonempty; visible `imageCredit` is also required. Reference images are capped5 and provenance sources30; timestamps/URLs/strings are bounded/validated. `imageGenerated:true`, `imageTaskId` and `imageModel` are rejected. No AI-generated images are supported. Image rights are an asserted editorial record, not legal verification by the server; review the actual source rights and attribution before approving a story.

Reply201 `{article,articleId,duplicate:false}`. Same durable source/event or fingerprint returns200 `{article,articleId,duplicate:true}`, adding missing aliases without rewriting or reverting editor work. Duplicates survive HTTP ledger expiry and editor publication/archive. Contradictory aliases return409. Editor saves preserve stored provenance and ignore client attempts to replace it. Authenticated lists expose only compact `{origin,imageGenerated:false}`; detail returns full provenance. Public article JSON does not expose internal provenance/run/task fields.

## Durable reference images

`POST /api/v1/automation/media` JSON:

```json
{
  "contentType": "image/jpeg",
  "base64": "actual-downloaded-image-bytes-as-base64",
  "sourceUrl": "https://commons.wikimedia.org/wiki/File:Reference",
  "license": "CC BY 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
  "credit": "Creator / Source",
  "creator": "Creator"
}
```

Only PNG/JPEG/WebP with matching signatures are accepted, maximum5MiB decoded,24million pixels,10000px per dimension, still images only. `sharp` decodes/re-encodes bounded WebP, removes metadata and uses at most2 concurrent per-process conversions. SVG/HTML, animation, mismatched signatures, invalid bytes and missing rights are rejected. JSON upload is bounded8MiB; normal API JSON remains1MiB. No remote URL is fetched by the backend.

Reply201 `{media:{hash,contentType:"image/webp",bytes,width,height,rights,createdAt,schemaVersion:2,url}}`. Use returned URL as article.image and preserve returned rights/credit. `GET /media/:sha256.webp` serves only finalized media with immutable caching and content hash ETag; authenticated requests remain no-store. Hash identifies the normalized bytes. Same bytes deduplicate to the first finalized immutable media metadata; per-story provenance can retain the specific verified source rights.

Mongo GridFS does not support multi-document transactions: bytes are uploaded privately first, then the finalized public reference and replay result commit together. Aborted/racing uploads can leave unreferenced complete GridFS files, never a public half-written image. After48h, inspect and optionally remove **only unreferenced completed** uploads:

```powershell
# Explicit MONGODB_URI; default dry-run.
npm run media:gc --prefix server
npm run media:gc --prefix server -- --apply
```

This bounded maintenance command never removes a referenced file and performs no provider calls. Interrupted partial chunks without a completed GridFS file are not claimed to be cleaned by this command; include standard GridFS orphan inspection in storage maintenance/backups. Keep media finalized references and GridFS files/chunks together when restoring.

## Verification

`npm test --prefix server` uses isolated temporary files and no paid provider requests. `TEST_MONGODB_URI` naming a new `dj_test_...` database enables real replica tests; the automation test uses a separate `_automation` suffix and drops only that disposable DB. Tests cover machine/editor separation, review-only/bilingual validation, permanent source aliases after replay expiry, provenance preservation/public omission, computed queue fingerprints, concurrent claims, lease recovery, immutable requests/CMS replay, phase guards, daily quota rollback, racing spend reservations, midnight reconciliation, actual image decoding and cross-store GridFS reads. No production database or existing environment file is used.

Primary implementation references: [sharp bounded constructors](https://sharp.pixelplumbing.com/api-constructor/), [Mongo GridFS limitations](https://www.mongodb.com/docs/manual/core/gridfs/), [Mongo transaction API](https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/).
