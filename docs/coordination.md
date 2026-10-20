# Rebuild coordination contract

Manager: this chat (`01a15904-dcbd-7023-b151-fbda981cb2f4`). The user explicitly authorized separate backend, client and CMS chats to work concurrently and coordinate through the manager. All work uses the same local checkout. Do not reset, stash, commit, deploy, touch environment secrets, or modify another owner's files.

## Ownership

- Backend: `server/**`, including tests, API documentation in `server/`, and server dependency lockfile.
- Client: `client/**`, including browser rendering and SSR entry, client dependency lockfile.
- CMS: `cms/**`, including editor/dashboard and CMS dependency lockfile.
- Manager: root files, `scripts/**`, `deploy/**`, `.github/**`, `docs/**`, integration and previews.
- Existing review subagent: `docs/production-considerations.md` only.

Use built-in chat tools to message the manager with contract changes, blockers and completion. The human authorized coordination. Do not write directly into another chat's file scope. Ask the manager to route dependencies. No external publishing or deployment is authorized by this coordination request.

## Product state

The three apps have already been rebuilt into a functioning local news platform. Preserve the current visual direction and working features. Read root README before changes. Existing data and `.env` files must remain untouched. Development uses isolated `server/data/newsroom.json`. Never connect to the existing MongoDB during checks. User selected a structured bilingual editor with preview, wants AI search citation eligibility (not guaranteed citations), and now selected **Kubernetes** for production.

The existing 19 tests and production builds pass. A local preview runs on port 5001; manager owns its lifecycle. Browser QA has verified draft/preview/publish/source/archive plus 375px Hindi layouts and desktop navigation. The previously published verification article is archived.

## Agreed API evolution

Keep unversioned `/api/...` aliases working, but new clients use `/api/v1/...`. Preserve current JSON shapes where possible, adding pagination and request metadata. Cookies keep path `/api`, HttpOnly, SameSite=Lax, Secure in production. Explicit origin allowlists; request IDs; do not trust arbitrary forwarded headers.

- `GET /api/v1/page?path=<encoded public path>` returns the current page-data shape. Section/search pagination is represented inside the public `path` query (`?page=2`, retaining `q`). Add `pagination: {page,pageSize,total,hasMore}`. Page size defaults 12 and is bounded at 30. `articles` contains only that page for section/search. Homepage is bounded to 30; `latest` to 5; `breaking` to 3. Avoid sending article body in story-list cards; the main `article` retains full body. `data.path` must exactly match the requested public path including its query. Client adds real previous/next links.
- `GET /api/v1/admin/articles?page=1&pageSize=20&q=&status=&section=` returns `{articles,sections,demo,pagination:{page,pageSize,total,hasMore},counts:{all,draft,review,published,scheduled,archived}}`. Bound pageSize to 100. Filter in persistence, not after reading all documents.
- `GET /api/v1/admin/subscribers?page=1&pageSize=50&q=` returns `{subscribers,pagination}`. Bounded authenticated export may use a separate explicit endpoint if needed; coordinate with manager before changing.
- Other article/auth/newsletter endpoints retain their current shapes. Admin detail returns effective publishing status, including elapsed schedules.
- All supported POST/PUT/DELETE content mutations accept `Idempotency-Key` (8–128 printable ASCII). In versioned routes require it for article mutations and newsletter signup. Login/logout use their own auth semantics and need no idempotency key. Same key+scope+body replays the original result; same key with changed body returns 409. Original status and replay marker should be preserved. Keys persist for at least 24 hours. Prevent duplicate side effects across Kubernetes replicas; use transactionally coupled Mongo ledger/write on a replica set, atomic file-ledger/write in development. Document uncertain outcomes and do not silently retry writes with a new key.
- Clients use a 10-second per-attempt deadline, at most two retries with capped exponential backoff+jitter for safe reads and keyed content writes only; honor bounded Retry-After, cancellation and 401/403/409/422 without retries. Keep a mutation key stable through automatic retries and uncertain-result manual resubmissions; release it after confirmed success. No automatic login retries.
- Errors remain `{error}` with optional stable `code` and `requestId`. Expose `X-Request-Id`, `Retry-After`, `Idempotency-Replayed` as appropriate. Never log bodies, credentials, cookies or subscriber email.

## Production baseline

Kubernetes runs >=2 Node replicas behind an ingress and managed MongoDB **replica set**, not independent file stores. No sticky sessions: shared Mongo-backed session records, rate limits, and idempotency ledger. Define bounded pooling/wait/operation timeouts. Avoid unbounded `find()`/N+1. Indexes/migrations are explicit operations, never destructive auto-startup work. Add schemaVersion=2 to new records while safely reading legacy records.

Health contract for Helm: `/health/live` is process liveness; `/health/ready` is 200 only when not draining and storage is available, 503 otherwise. Keep `/health` compatible. Expose Prometheus `/metrics` on a separate `METRICS_PORT` (default 9464) bound inside the pod, excluded from public ingress. Structured request logs and bounded metric dimensions; support traceparent/request-id correlation without claiming full tracing instrumentation. `SIGTERM` first fails readiness, drains bounded in-flight requests, closes pooled resources, exits before 40-second Kubernetes grace. HTTP timeouts are distinct from DB operation deadlines.

Default cache strategy: private/authenticated/search/saved/error responses no-store. Hashed assets immutable. Public page/JSON can use ETag revalidation with `no-cache`, avoiding stale publication visibility across replicas. Do not add long-lived process-local content caches without coordinated invalidation. CDN stale content must never keep withdrawn/draft stories public. Explain deferred distributed features honestly rather than implementing empty queues/webhooks/circuit breakers without dependencies.

## Completion evidence

Each owner returns changed paths, commands/results, exact API or environment additions, any unresolved gaps and recommended integration checks to the manager. Continue independently within ownership; do not wait for permission already given. Manager runs final builds, tests, deployment template validation and cross-app browser QA before reporting completion.
