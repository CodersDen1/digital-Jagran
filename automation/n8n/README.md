# Digital Jagran daily newsroom

Three importable n8n workflows collect and rank public news, prepare English/Hindi drafts through Kie.ai, and report daily delivery. All submissions enter **review**. There is no automatic publication path.

## Workflows

* `discover.json`: 12 public RSS feeds every 30 minutes, 36-hour freshness window, canonical URLs, conservative event clustering and source-diversity ranking, up to 150 candidates per scan. Permanent server aliases deduplicate repeated discoveries.
* `worker.json`: one leased job every five minutes (288 possible ticks/day), original bilingual brief, bounded second evidence check, reusable Commons photograph when available, durable CMS image upload, exact immutable approval payload and idempotent ingestion.
* `operations.json`: hourly Asia/Kolkata delivery counts, spend, reservations and an explicit shortfall against the 100-review-drafts/day target. View its execution output in n8n.

The target is at least 100 distinct collected candidates and 100 completed review drafts daily. Evidence, source availability, paid provider availability and the spending cap may reduce completed drafts. The report records that shortfall; the workflow must not invent facts or overspend to meet a number. Thin source packets or failed verification stop for editorial investigation. An AI check against snippets is an evidence-consistency check, not independent reporting or a guarantee of truth.

## Budget and text model

User-authorized limit: **US$0.90 per Asia/Kolkata day**, for these workflows only. Configure `AUTOMATION_DAILY_BUDGET_MICRO_USD=900000` on the publication server. The default is zero (paid work paused). Other applications using the same Kie account are outside this ledger.

Kie.ai GPT-6 Luna: `POST https://api.kie.ai/codex/v1/responses`, `stream:false`, `reasoning.effort:low`, text-only input, no tools. As checked on 20 October 2026, Kie lists input **US$0.03/million tokens**, cache writes **US$0.0375/million tokens**, output **US$0.15/million tokens**. One credit corresponds to US$0.005 at the displayed base price. Bonus credits are not assumed. Haiku was replaced after its channel returned HTTP 429 during controlled tests.

Each call reserves a conservative input upper bound (UTF-8 request bytes plus 1,024 tokens for framing, at the higher cache-write rate) plus the model page's full **128,000-token output limit**, including reasoning. Kie's request schema does not document an output cap, so an undocumented parameter is not trusted for budgeting. This temporarily reserves roughly US$0.02 per call; actual `credits_consumed` is reconciled after a confirmed response. A missing response or missing billing field leaves the reservation in place and holds the uncertain job. No paid HTTP request has automatic retries. A provider price change or billing discrepancy cannot be retroactively prevented: actual overrun is recorded honestly and pauses more paid work. Recheck account pricing before activation and after any change. A price-review guard stops new calls after **20 November 2026 UTC** until deliberately updated after verification. This is not a Kie-account-wide billing hard limit.

Before claiming a job, the worker calls Kie's free credit endpoint and requires a successful numeric balance of at least two credits. An unavailable or low balance stops before a lease, reservation or paid call. A successful credit check does not establish that the selected text-model channel is operational.

Primary references: [Kie model pricing and output limit](https://kie.ai/gpt-6-sol-and-luna), [request/response contract](https://docs.kie.ai/market/chat/gpt-6-luna), [n8n HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/).

## Credentials and installation

Keep secrets in Coolify and n8n credentials, never in workflow JSON or Git. Kie credential is Bearer Auth, restricted to `api.kie.ai`. Review API credential is a separate 32+ character machine token, restricted to `server.digitaljagran.com`; it cannot sign in as an editor or publish articles. The server's `AUTOMATION_INGEST_TOKEN` must match it. Keep this token runtime-only, unavailable during image builds.

Apply the new backend indexes before serving the new application. The root Compose startup already runs the explicit additive index migration. [Backend contract](../../server/AUTOMATION.md) covers leases, revisions, reservations, idempotency, storage and manual reconciliation.

Run `node automation/n8n/build.mjs` to regenerate JSON after helper or builder changes. The checked-in credential IDs are metadata for this n8n instance, never their secrets. For another instance, replace both IDs with that instance's credentials. Import each JSON as a new workflow in the Personal project, select the credentials, run discovery manually and verify the worker creates a private review draft before publishing the schedules. Existing workflows must remain untouched.

The workflow uses standard n8n Code and HTTP Request nodes, not community nodes, arbitrary code downloads, database edits or a blanket external module allowlist. n8n 2.10.4's external JavaScript runner does not expose a global URL parser. Allow only the first-party `url` utility in addition to the existing `crypto` allowlist, and use `require('url')` in Code nodes. `prepare-runner.sh` preserves the installed runner configuration and generates the targeted read-only override. Persist the bind mount in Coolify; retain external runner isolation and all other module restrictions. No filesystem or networking module is granted to workflow code.

`import-instance.sh <full-reviewed-commit-sha> [all|worker]` uses the official n8n CLI to update the three fixed workflow IDs, or only the worker while preserving discovery/operations schedules. It never exports or decrypts credentials. For a new instance, remove the workflow IDs before import to avoid collisions. Verify and publish schedules in the editor after import.

## Images, citations and editorial duties

No AI images or image-generation charges. Commons search results must have a supported still-image format, a Wikimedia upload URL, file-page source, explicit reusable license link and creator attribution. Missing/ambiguous/NC/ND licenses are rejected. Bytes are uploaded to immutable CMS media storage, preserving source/credit/license metadata. If none qualifies, the review draft remains imageless with a warning. Do not label an archive photograph as depicting the actual reported event. Licensing and topical relevance still require an editor's check: [Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia).

RSS text is untrusted evidence, never an instruction. The prompts forbid invented facts, quotes, sources, reporting claims and copied paragraphs. Every draft includes visible source links, headline/description metadata and an AI-assistance disclosure. Publication dates are assigned by the CMS, distinct from original source dates. The CMS provenance panel preserves source snapshots, model/task IDs, workflow/run IDs, warnings and image rights. An editor must verify timely factual claims, Hindi/English agreement, allegations, attribution and image relevance before approval.

The public application already supplies server-rendered metadata, NewsArticle structured data, canonical/hreflang URLs, robots, RSS and sitemaps. These support discovery and citation eligibility. Search ranking or citation by an AI service cannot be guaranteed; original reporting, accuracy and editorial quality remain essential.

## Recovery and maintenance

New logical polls and mutations use fresh HTTP keys; exact request retries retain the same key/body. Source identity survives the ordinary replay ledger's expiry. Leases/revisions coordinate concurrent workers.

* `draft_uncertain` / `factcheck_uncertain`: never automatically submit another paid call. Reconcile the exact saved request, provider message/task ID, confirmed response and its cost; keep the reservation if the provider cannot establish the outcome.
* `ingest_uncertain`: replay only `checkpoint.articlePayload` with `checkpoint.submissionKeys.ingest`. Permanent deduplication returns the existing article without overwriting editor changes.
* Quality failures: inspect the saved source packet and model output. Correct source supply/prompt issues deliberately; never bypass the evidence or human-approval gate just to hit volume.
* Media: inspect `npm run media:gc --prefix server` before any explicit cleanup. Orphan GridFS uploads may remain after interrupted transactions; committed media must be preserved. Existing backup/restore procedures still apply.

Run `node --test automation/n8n/*.test.mjs` for source, rights, bilingual validation and generated-workflow integration checks. Backend tests separately exercise real Mongo replica-set contention, durable quotas, GridFS, expiry recovery and editor isolation.

## Production verification — 20 October 2026

Publication backend/CMS deployment: `049bd702df7422f8d8bf5fda2e2236ecf5abcb86`. Imported workflow version: `0399d239cd818a65ff0bacc9dc51070b1ab0c9c3`. The runner's targeted `crypto,url` configuration is persisted as a read-only Coolify bind mount and was verified after a full service recreation. The temporary Coolify API write token used to repair the broken Compose editor was revoked and its local secret files removed.

The final successful discovery scan read 628 feed items, processed 147 nonempty source packets and live authenticated operations reported 159 distinct queued candidates with zero completed review drafts. Discovery (every 30 minutes) and operations (hourly) are published. Outstanding uncertain-call reservations total US$0.005319; confirmed spend is not yet available for those requests. Kie's free credit endpoint returned success with an available balance, but separate controlled Haiku 4.5 and Haiku 5.5 draft requests both returned HTTP 429, `Internal error, please try again later`. Their unknown outcomes retain budget reservations; no paid retry or fabricated article was submitted. **The paid worker remains unpublished pending provider recovery and billing reconciliation.** Discovery and hourly operations can run independently. Twenty automated helper/generated-workflow tests pass, including successful mocked review ingestion, low-credit rejection and uncertain-paid-response recovery; these do not replace a successful live provider-to-CMS test.

After Kie confirms its text channel works, reconcile each uncertain job using confirmed provider billing/response evidence before any deliberate recovery. Run one fresh candidate through both model calls and verify the private CMS review/provenance panel, then publish the worker schedule. Do not replay an uncertain paid request or clear its reservation merely to unblock throughput.

