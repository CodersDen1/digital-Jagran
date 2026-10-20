# Digital Jagran

A rebuilt Hindi and English publication with an editorial newsroom and an authenticated Express API. The research behind the design is in [the publisher benchmark](research/news-benchmark-2026-10-20/REPORT.md).

## Run locally

Use Node 24 LTS. Install each application's existing dependencies if needed:

```powershell
npm ci
npm ci --prefix client --legacy-peer-deps
npm ci --prefix cms --legacy-peer-deps
npm ci --prefix server
npm run build
npm start
```

Open the [Hindi publication](http://localhost:5001/hi), [English publication](http://localhost:5001/en), or [newsroom](http://localhost:5001/newsroom/).

Local editor defaults, used only when no administrator credentials are configured:

- Email: `editor@digitaljagran.local`
- Password: `newsroom-local-2026`

The server refuses to expose these defaults outside a loopback development host and rejects that password in production. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env` for your own account. Sessions use HttpOnly cookies and expire after eight hours. Development file-mode sessions expire on restart; production Mongo sessions are shared across replicas.

The default storage mode is an isolated JSON file at `server/data/newsroom.json`. On its first development start it creates clearly labelled original demonstration articles. It does not connect to, seed or erase your existing MongoDB. Set `SEED_DEMO=false` with a fresh `DATA_FILE` for a blank local publication. Existing file content is never reseeded.

For frontend hot reload, run `npm run dev`: public Vite runs on port 5173 and newsroom Vite on port 5174 at `/newsroom/`, both proxying `/api` to port 5001. Use the Express server on port 5001 to inspect server-rendered article HTML. Optional `VITE_NEWS_API_ORIGIN` and `VITE_PUBLIC_ORIGIN` configure separate origins; the default built deployment uses one origin for both frontends and the API.

## Reader experience

- Editorial front page, topic sections, working search and clear empty/error states.
- Separate `/en` and `/hi` routes with links between available article translations.
- Article summaries, bylines, publication/update dates, captions, source references and corrections.
- Device-local reading lists, browser speech synthesis where available, text-size controls and link copying.
- Responsive layouts, reduced-motion support, keyboard focus styles and skip links.
- Newsletter opt-in and a newsroom audience list with CSV export. Email delivery is not connected to a mailing provider.

## Newsroom workflow

Create a story in English, Hindi or both. Enter a headline, summary and paragraph-based body; add a licensed image URL, description and credit. Add primary-source reference links and a correction note where appropriate. Each language has its own optional search title and description; blank metadata falls back to the current headline and summary.

Preview either language before saving. Drafts can be incomplete. Review, scheduled and published stories need complete included translations. Publication requires an author; images require descriptive text. Published and scheduled content is filtered on the server. A scheduled story becomes publicly readable at its publication time on the next request, without a browser or a background cron job. This does not send an email or push notification.

The dashboard uses actual content counts. The story library supports search, workflow and section filters. Archiving is reversible. URLs stay stable after the first save. Stale edits return a conflict instead of silently overwriting another editor. The editor keeps recovery drafts on the current device; editing is disabled during a server save.

This rebuild uses a structured editor. The former freeform designers and their database fields remain in the repository for reference; they are not part of the new routes. No old unauthenticated publishing endpoints are mounted.

## Search and AI discovery

The Express server renders article text and page-specific metadata in the initial HTML. It provides one canonical, reciprocal hreflang only for available translations, Open Graph/Twitter metadata, NewsArticle data with boolean access declarations, source citations and publisher editorial-policy links. Structured data reflects visible article facts.

`/sitemap.xml` covers published language URLs and sections. `/news-sitemap.xml` includes articles from the previous two days; large maps are split into indexed chunks. `/en/feed.xml` and `/hi/feed.xml` expose recent published stories. Drafts, reviews, archived stories and future schedules are excluded from public article data, feeds and maps.

Public crawling, including OAI-SearchBot, is allowed. Private newsroom/API paths remain disallowed and authenticated. The prior training-crawler exclusions are preserved separately. Robots rules are not access control; the API enforces authentication independently.

AI citations cannot be guaranteed. Google's [AI features guidance](https://developers.google.com/search/docs/appearance/ai-features) says normal indexing, snippet eligibility and useful accessible content remain the foundation; no special AI schema or text file is required. [OpenAI's crawler documentation](https://developers.openai.com/api/docs/bots) distinguishes search discovery from model training. Verify CDN/firewall access after deployment and use Search Console and referral analytics to assess real discovery. Source links help attribution but do not prove a story's accuracy.

## Existing MongoDB

Set `DATA_STORE=mongo` and `MONGODB_URI` explicitly. The adapter reads the existing Article collection, translates legacy fields to the new contract and respects publication/language flags. Schema additions are additive. Saving an existing document stores the rebuilt article in the new translation/image fields while preserving original HTML bodies, legacy layout inputs and gallery photo arrays. No destructive migration runs automatically.

Legacy HTML is converted to plain text for the new reading template. Bespoke canvas layouts are not reproduced automatically; review those stories before saving the new presentation. The existing database was not connected during verification. Use a staging copy to verify representative old content before switching production.

## Production configuration

Build both apps and the server rendering bundle with `npm run build`. Run the Express process behind an HTTPS reverse proxy; it serves the public site and `/newsroom/` together. `ecosystem.config.js` supplies a single-process PM2 configuration. Set:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=5001
PUBLIC_ORIGIN=https://your-publication.example
ADMIN_EMAIL=your-editor@example.com
ADMIN_PASSWORD=your-own-unique-password-of-at-least-16-characters
DATA_STORE=mongo
MONGODB_URI=your-staging-or-production-connection-string
```

Production requires a MongoDB replica set with explicitly provisioned indexes. File storage is development-only. Mongo-backed sessions, rate counters and transactionally coupled idempotency keys work across replicas. New clients use `/api/v1`; unversioned aliases remain compatible. See [the backend contract](server/README.md) for migration, key replay, pooling and timeout details. Environment files and runtime data are ignored by Git.

Before public launch, replace demonstration copy and images, verify image rights and authorship, complete ownership/contact/privacy procedures, and connect a newsletter provider if email delivery is needed. The administrator account is currently one configured editor account; team invitations, per-user roles and subscription billing are not implemented. No external service credentials are invented or embedded.

## Kubernetes delivery

For the user's selected Coolify hosting, use the [Coolify runbook](docs/coolify-runbook.md) and root `docker-compose.yaml`. It includes a fresh authenticated MongoDB replica set with private networking and persistent volumes; production secrets belong in Coolify.

The [Helm chart](deploy/helm/digital-jagran/) targets two or more replicas with TLS ingress, restrictive network policies, readiness/liveness probes, graceful shutdown, rolling updates, a disruption budget and optional HPA/Prometheus resources. The runtime image runs as a non-root user with a read-only root filesystem. Choose an installed, supported ingress controller explicitly.

Follow the [Kubernetes runbook](docs/kubernetes-runbook.md) for required infrastructure, secrets, index provisioning, rollout, rollback and recovery. The [production considerations register](docs/production-considerations.md) addresses idempotency and all 110 requested topics, distinguishing implemented behavior from deployment responsibilities and deferred features. These artifacts have not been deployed to a live cluster.

CI builds all apps on Windows/Linux, tests a disposable Mongo replica set, validates Helm configuration and builds the Docker image without publishing. Run `npm run check:deploy` with Helm installed (or `HELM_BIN` pointing to it). Never deploy `ci-values.yaml`; it contains offline test settings.

## Verification commands

```powershell
npm run check
npm test
npm run build
```

The default integration suite uses disposable temporary files. Explicit `TEST_MONGODB_URI` enables disposable replica-set tests using only a new database prefixed `dj_test_`; CI runs those tests separately. It covers authorization, cookie sessions, origin checks, publication visibility, scheduling, Unicode URLs, initial HTML/metadata, XSS escaping, concurrency conflicts, source persistence, reversible archiving, consent, sitemap freshness, RSS and legacy field preservation. Build before tests because server-rendering checks use the compiled frontend.

Browser verification covers local sign-in, bilingual authoring and preview, draft saving, publication, source-link rendering, archiving, reading-list persistence and navigation. Screenshots are in `artifacts/rebuild/`. Production Core Web Vitals, rich-result eligibility and live search/AI citations require verification on the deployed domain.
