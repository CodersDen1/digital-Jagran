# Backend production contract

All `/api/...` routes retain their legacy aliases. New integrations use `/api/v1/...`. Public page data preserves the requested public path and query. Section/search pages have `pagination: {page,pageSize,total,hasMore}` with 12 stories per page, home at most 30, latest 5, breaking 3. Story cards omit `body`; article detail includes it. Admin story lists accept `page`, `pageSize` (default20, maximum100), `q`, `status`, `section`, and return global workflow `counts` including `all`. Subscriber lists default50, maximum100, and return pagination. Ordering includes an ID tie-breaker. Offset pagination is not a snapshot: concurrent edits or signups can shift later pages; exports must state that limitation.

Versioned article POST/PUT/DELETE and newsletter signup require `Idempotency-Key` (8–128 printable ASCII). Unversioned writes accept optional keys. Keys are scoped by configured authenticated editor (or newsletter), HTTP method, resource path, and key; bodies are canonically hashed. Successful responses preserve status/body for replay, with `Idempotency-Replayed: true`; a different body returns409. Retention is at least48 hours (Mongo TTL deletion is asynchronous). A database timeout or lost network response may have committed: resubmit the exact same payload/key, including the original `updatedAt`, until the result is confirmed. Never invent a new key for an uncertain result. Errors roll back both ledger and side effect. Versioned DELETE requires JSON `{updatedAt}` and returns409 for a stale revision.

Cookies remain HttpOnly, SameSite=Lax, path `/api`, Secure in production. Mongo sessions are shared across replicas, expire after8hours, and store only a token hash. Login allows8 attempts per15minutes per trusted client IP; newsletter allows20/hour. Shared Mongo counters use fixed windows and hashed bucket identifiers. Development memory equivalents expire records and reject new entries at10000 records. Password verification uses asynchronous scrypt with at most4 active verifications per process; a busy process returns503/Retry-After. There is one configured editor identity. No email sending or background delivery system is claimed.

Production refuses file mode and requires Mongo with a managed replica set. Standalone Mongo startup is refused. All Mongo content writes with keys use a transaction coupling the ledger claim, write, and original response. Transactions use snapshot reads and majority writes. File mode is a single-process demonstration/development adapter: its queued mutations atomically rename one state file containing both ledger and articles/subscribers. Do not run file mode across replicas. File sessions and rate limits are bounded process memory and do not survive restarts.

## Explicit migration

The server never creates indexes on startup and refuses Mongo startup until required indexes exist. The migration command deliberately does not load `.env`; supply an explicit staging/production URI. First inspect the dry-run, then apply during your maintenance workflow:

```powershell
# Supply MONGODB_URI using your deployment secret mechanism.
npm run migrate --prefix server
npm run migrate:indexes --prefix server -- --apply
```

The dry-run connects only to inspect replica-set topology and prints planned index specifications; `--apply` creates indexes without dropping/replacing indexes or rewriting documents. Existing duplicate slugs/emails cause a diagnostic failure: reconcile those records before retrying. Index names are `slug_1`, `newsroom_publication`, `newsroom_section`, `newsroom_recent`, `email_1`, `newsroom_subscriber_recent`, `newsroom_idempotency_ttl`, `newsroom_sessions_ttl`, `newsroom_rates_ttl`. Existing compatible legacy `slug_1`/`email_1` indexes are reused. New records and saves set `schemaVersion:2`. Existing legacy rich HTML, layout and gallery fields are preserved when saving; no bulk destructive schema migration runs.

## Runtime configuration

Existing configuration remains documented in the root README. Added options:

| Variable                      |     Default | Meaning                                                                                                                                                       |
| ----------------------------- | ----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRUST_PROXY`                 | unset/false | Explicit Express trusted proxy CIDRs or named ranges, comma-separated; never trust arbitrary forwarded headers. Configure ingress source networks accurately. |
| `METRICS_PORT`                |        9464 | Separate HTTP listener; expose only on the pod/internal monitoring network.                                                                                   |
| `METRICS_HOST`                |      `HOST` | Metrics bind address.                                                                                                                                         |
| `MONGO_MAX_POOL_SIZE`         |          20 | Per-process pool maximum; account for HPA plus rolling-update surge.                                                                                          |
| `MONGO_MIN_POOL_SIZE`         |           0 | Pool floor.                                                                                                                                                   |
| `MONGO_WAIT_QUEUE_TIMEOUT_MS` |        2000 | Maximum pool checkout wait.                                                                                                                                   |
| `MONGO_OPERATION_TIMEOUT_MS`  |        5000 | Database operation maxTimeMS, bounded to15000.                                                                                                                |
| `DRAIN_TIMEOUT_MS`            |       30000 | Forced-exit deadline, bounded1000–35000ms.                                                                                                                    |

Mongo uses5s selection/connect deadlines,8s driver operation timeout,10s socket timeout,5s majority write/commit deadlines,10s transaction deadline. HTTP has15s request-receipt timeout,10s header timeout,5s keepalive,20s socket inactivity timeout; these are distinct from DB work deadlines. SIGTERM/SIGINT immediately fail readiness, allow1s ingress observation, then stop listeners, drain in-flight requests and close Mongo, with forced exit before40s. `/health/live` reports process liveness; `/health/ready` and compatible `/health` return503 on unavailable storage or drain.

The metrics listener serves only `/metrics` in Prometheus text format: `dj_http_requests_total{method,route,status}`, `dj_http_request_duration_seconds_{bucket,sum,count}`, `dj_http_inflight`, `dj_process_uptime_seconds`. Route templates and fixed method labels bound dimensions. It is separate from the main public listener. JSON request logs contain request ID, validated optional traceparent, method, route template, status and duration; no bodies, cookies, email or credentials. `X-Request-Id` supports safe incoming IDs or generates a UUID. Correlation is implemented; a distributed tracing exporter is not installed.

Private/authenticated/search/saved/errors use `Cache-Control: no-store`; public HTML/JSON use ETag revalidation with `no-cache`. Public hashed assets are immutable. Content is read from persistence on every request; no process-local publication cache can keep withdrawn content alive. Sitemap reads are paginated and bounded (500news/24990general articles per chunk, at most2language URLs/article). Mongo query filtering/counting/pagination/grouping runs in the database with bounded operations; legacy compatibility expressions and substring search can still scan records, so benchmark on a staging copy before sizing a large newsroom.

## Checks

`npm test --prefix server` uses disposable files. `TEST_MONGODB_URI` additionally enables replica-set tests and must name a new database beginning `dj_test_`; those tests create indexes and drop only that explicit disposable database. They never read the real `.env` or use `MONGODB_URI`. Build the client SSR bundle before the HTML checks. No existing database is contacted by default.

Primary references used: [Mongo transaction API](https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/), [Node HTTP server timeouts and close methods](https://nodejs.org/api/http.html).
