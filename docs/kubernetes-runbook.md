# Kubernetes deployment and recovery runbook

Updated: 20 October 2026 (Asia/Kolkata).

This runbook describes the repository's deployment artifacts and the operator work needed to use them. It does **not** report a live cluster installation, successful cloud deployment, production load result, or completed recovery exercise. Commands below are procedures to review and execute in the selected environment. Start in staging.

The baseline is one region, at least two application replicas on separate nodes, an explicitly selected HTTPS ingress, and a managed MongoDB **replica set**. The application serves the public SSR site, newsroom and API from one image. It uses shared Mongo-backed sessions, rate counters and transactional idempotency. Production file storage is refused. A separate metrics listener is internal only.

For the complete 1–110 production-topic register, ownership boundaries and proposed service objectives, see [production considerations](production-considerations.md). For precise API, storage and timeout contracts, see [the backend contract](../server/README.md).

## 1. Establish infrastructure and ownership

An operator must provide these before installation:

- A supported Kubernetes cluster, version compatible with `Chart.yaml` (currently `>=1.30.0-0`), with a NetworkPolicy-enforcing CNI. The chart's compatibility floor is not a recommendation to run an unsupported Kubernetes release.
- At least **two eligible schedulable worker nodes** and enough additional capacity for one rolling-update surge pod. Node selectors, tolerations and quotas must leave two hostname domains available. Use separate availability zones where supported; the current chart spreads by hostname, not by zone.
- An installed, supported ingress controller, its actual IngressClass, source network ranges, namespace and pod labels; a publicly resolvable domain and valid TLS Secret in the application namespace.
- A managed Mongo replica set, restricted network path/private endpoint where available, TLS validation, suitable runtime credentials, backup/PITR configuration, storage/connection limits and operational owner.
- An image registry and immutable release digest, image pull credentials if needed, and a release pipeline identity with the minimum required namespace permissions.
- An external secret manager or pre-existing Kubernetes runtime Secret, monitoring/log collection, alert routing and accountable responders.

The chart installs application resources. It does not provision worker nodes, the Mongo service, certificates, DNS, an ingress controller, WAF, CDN, secret-store encryption, backup storage or monitoring operators. Establish cloud IAM, registry access, database access restrictions, encrypted storage and retention independently.

Community **`ingress-nginx` is retired** and must not be an assumed new production default. Select a maintained controller compatible with the chart's Ingress resource, or adapt the chart if choosing a Gateway-only implementation. Verify product identity: community `ingress-nginx` and F5's NGINX Ingress Controller are separate projects. See the official [Kubernetes retirement statement](https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/). The chart now requires explicit class, namespace and pod-selector values.

Provider-specific Terraform is deliberately deferred until the cloud account, region, network, managed Mongo offering, state backend and ownership model are selected. Helm defines application workloads; it does not substitute for infrastructure provisioning. Introduce reviewed provider IaC once those concrete targets exist rather than committing speculative resources or credentials.

## 2. Build, verify and pin the image

Run the repository checks through the normal pipeline. `npm run check:deploy` uses Helm to lint and render the chart and checks expected safety properties; it does not contact a cluster or prove live scheduling/network behavior. The CI workflow builds an image without publishing it. Promotion/publishing requires the team's registry workflow.

The root `Dockerfile` builds client/CMS/SSR artifacts in stages and runs as the non-root Node user. The chart runs with a read-only root filesystem and bounded `/tmp`, drops capabilities and disables service-account token mounting. Override `NODE_IMAGE` with an approved pinned base-image digest for release builds; the Dockerfile's convenient default tag is not an immutable supply-chain pin.

Deploy the resulting runtime image by its registry digest, not `latest`. Verify the exact promoted image in staging, including SSR article output and the index command. Retain the prior known-good image digest and source release. Image scanning/signing, registry retention and provenance verification are pipeline/platform responsibilities beyond the chart.

## 3. Prepare namespace and secrets first

The examples use Bash syntax. Set these to reviewed environment values; commands are not intended to be pasted with unresolved placeholders:

```bash
export DJ_NAMESPACE=digital-jagran-staging
export DJ_RELEASE=publication
export DJ_VALUES=/secure/config/digital-jagran-staging-values.yaml
export DJ_CHART=deploy/helm/digital-jagran
```

Confirm the Kubernetes context and namespace before a mutation:

```bash
kubectl config current-context
kubectl get namespace "$DJ_NAMESPACE"
```

Create the namespace through the team's infrastructure process if absent. Provision the runtime Secret and TLS Secret **before** invoking Helm with migration hooks: pre-install hooks run before regular release resources and cannot use resources that have not yet been created.

The externally managed runtime Secret must contain:

| Secret key | Requirement |
|---|---|
| `MONGODB_URI` | Explicit target database on the managed replica set, with authenticated TLS. Never disable certificate verification. |
| `ADMIN_EMAIL` | Configured editor identity. The current application has one editor identity, not a multi-user IAM system. |
| `ADMIN_PASSWORD` | Unique production password, at least 16 characters; never the documented development password. |

Prefer a secret-manager integration. If operational policy uses a local protected env file, an operator can create the existing Secret without putting its values into Helm:

```bash
# DJ_SECRET_ENV points to a protected, temporary file supplied by the secret process.
kubectl create secret generic digital-jagran-runtime \
  --namespace "$DJ_NAMESPACE" \
  --from-env-file "$DJ_SECRET_ENV"
```

Do not print that file, use literal secrets in command history, commit it, or include its content in review artifacts. Follow the secret process to retire temporary material. Do not recreate an existing Secret with this command; update it through the established manager and rotate credentials deliberately. Keep the Secret restricted to the necessary keys. The chart imports it using `envFrom`; explicit chart environment entries take precedence over identically named Secret entries.

The TLS Secret must match the selected ingress host. The chart references it and does not request certificates itself. If certificate issuance is managed by a cluster operator, configure that integration and validate renewal/expiry alerts before launch. Private registry pull Secrets are also pre-existing references through `imagePullSecrets`.

Changing an external Secret does not automatically change a pod template or restart Node. Plan a controlled rollout after credential/configuration rotation, ensure the new credential is usable during the overlap, and revoke the old credential after validation. Kubernetes Secret encryption at rest, RBAC and external manager permissions are infrastructure controls.

## 4. Fill environment-specific chart values

Create an environment values file without credential values. The following is illustrative; replace every placeholder with the actual installed infrastructure identity:

```yaml
image:
  repository: registry.example.com/news/digital-jagran
  digest: "sha256:<64-lowercase-hex-characters>"
publicOrigin: https://news.example.com
existingSecret: digital-jagran-runtime
replicaCount: 2
trustProxy: "<actual-ingress-source-CIDR>"
ingress:
  enabled: true
  className: "<installed-supported-ingress-class>"
  host: news.example.com
  tlsSecretName: digital-jagran-public-tls
  annotations: {}
networkPolicy:
  enabled: true
  ingressNamespace: "<actual-controller-namespace>"
  ingressPodSelector:
    app.kubernetes.io/name: "<actual-controller-label>"
  monitoringNamespace: monitoring
  mongoCidrs: ["<actual-managed-Mongo-endpoint-CIDR>"]
  mongoPorts: [27017]
mongo:
  maxPoolSize: 20
  minPoolSize: 0
  waitQueueTimeoutMs: 2000
  operationTimeoutMs: 5000
autoscaling:
  enabled: false
migration:
  enabled: false
```

`ci-values.yaml` contains reserved example routes, a nonexistent image digest and test Secret names for offline validation. It is **not a production values file**. Keep private infrastructure addresses in the team's protected configuration repository where policy requires it.

`publicOrigin` must equal `https://` plus `ingress.host` when chart ingress is enabled. Keep a single canonical host; configure alternative-host redirects at the ingress/edge deliberately. The chart rejects blanket proxy trust and requires an explicit trust setting. Confirm the trusted ingress overwrites client-supplied forwarding headers, and block direct public access to the app. A CIDR matching every pod in a cluster is wider trust than necessary; choose the real topology rather than copying example CIDRs.

The chart supplies these runtime variables:

| Runtime variable | Chart source / behavior |
|---|---|
| `NODE_ENV`, `DATA_STORE`, `SEED_DEMO` | `production`, `mongo`, `false` |
| `HOST`, `PORT`, `METRICS_PORT` | `0.0.0.0`, `5001`, `9464` |
| `PUBLIC_ORIGIN`, `TRUST_PROXY` | `publicOrigin`, `trustProxy` |
| `MONGO_MAX_POOL_SIZE`, `MONGO_MIN_POOL_SIZE` | `mongo.maxPoolSize`, `mongo.minPoolSize` |
| `MONGO_WAIT_QUEUE_TIMEOUT_MS` | `mongo.waitQueueTimeoutMs` |
| `MONGO_OPERATION_TIMEOUT_MS` | `mongo.operationTimeoutMs` |
| `DRAIN_TIMEOUT_MS` | Currently `30000` |
| `NODE_OPTIONS` | `nodeOptions`, default `--max-old-space-size=320` |

Pod defaults request 250m CPU/256Mi memory and limit CPU to 1 core/memory to 512Mi. These are initial allocations requiring load/soak validation. V8 heap size is only part of RSS; preserve memory headroom for native buffers, code, libraries and rendering. Do not claim a traffic capacity from these settings.

## 5. Validate network reachability and migration ordering

The chart's NetworkPolicy selects this release's application and migration pods. It allows HTTP from the selected ingress pods, metrics from the monitoring namespace, DNS to `kube-system` pods labelled `k8s-app: kube-dns`, and database egress to the configured CIDRs/ports. It does not allow arbitrary internet egress. External article images are fetched by readers' browsers; this is not a server-side image proxy.

Inspect the actual cluster DNS implementation. NodeLocal DNS, differently labelled DNS pods, private-endpoint address translation and CNI policy behavior may require a reviewed policy adaptation. SRV Mongo connections require DNS plus reachability to **all** advertised replica-set members. Permit provider endpoint ranges intentionally; a single currently resolved IP can break after maintenance/failover. Retest Mongo primary changes and DNS rotation. Do not fix failed reachability by setting `0.0.0.0/0` or trusting the whole internet.

**Default-deny namespace prerequisite:** the optional migration Job is a `pre-install,pre-upgrade` hook. On initial installation, the chart's ordinary NetworkPolicy has not been installed yet. If the namespace already denies egress, platform operators must provision a narrowly scoped DNS/Mongo egress policy for migration-labelled pods before the hook runs. During upgrades the existing policy must also permit any new database destination before the hook starts. Alternatively perform the explicit migration from an approved management environment with the necessary network access. Turning off NetworkPolicy is not an equivalent security fix.

Migration pods have `app.kubernetes.io/component: migration`; application pods have `component: publication`. Services/Deployment/PDB use the publication selector so index jobs do not become HTTP backends. Preserve that separation when adding organization-wide labels or policies. The migration Job does not require Kubernetes API credentials.

## 6. Check Mongo and run index migration explicitly

Ordinary server startup never creates indexes. It verifies replica-set topology and required indexes and refuses startup if they are missing. A standalone Mongo server is unsupported because content mutation and idempotency response must commit together.

Use a database credential with necessary index-management privileges for the maintenance operation. A dedicated migration identity is preferable; the opt-in chart hook imports the referenced runtime Secret, so its credential must have those privileges if that hook is used. Do not grant broad cluster administration to the runtime merely for convenience. Record which credential is used and revoke temporary elevation afterward.

From an approved environment containing the matching server release, supply `MONGODB_URI` through the secret mechanism and inspect the dry-run:

```bash
# MONGODB_URI must already be injected. The migration deliberately does not read .env.
npm run migrate --prefix server
```

The dry-run connects to check replica-set topology and prints index specifications. It is not a database write or proof that those indexes can be built. Verify target database identity, recovery point and legacy duplicate checks. Then explicitly apply:

```bash
npm run migrate:indexes --prefix server -- --apply
```

This creates missing indexes without dropping/replacing indexes or bulk rewriting article documents. Duplicate slugs/emails or incompatible existing index definitions can fail the operation. Index creation across collections is not an all-or-nothing migration: some indexes may already exist after a failure. Inspect diagnostics, reconcile data using a reviewed backed-up plan, and safely rerun; never delete records or indexes blindly.

Expected indexes are:

- Articles: `slug_1`, `newsroom_publication`, `newsroom_section`, `newsroom_recent`.
- Newsletter: `email_1`, `newsroom_subscriber_recent`.
- Operational TTL indexes: `newsroom_idempotency_ttl`, `newsroom_sessions_ttl`, `newsroom_rates_ttl`.

The index script does not perform a destructive content migration. Legacy compatibility remains part of the application; test rich text, custom-layout and gallery fixtures before adopting an existing production database. Benchmark compatibility expressions and substring search on a staging copy because they can still scan documents despite bounded response sizes.

For automated maintenance, `migration.enabled=true` runs the apply command in a pre-install/pre-upgrade Job. It is deliberately opt-in, with default 300-second active deadline and no automatic retry. Ensure external Secrets, registry access, DNS/Mongo egress and migration privileges exist first. Set deadlines from measured index build time, not guesswork. Do not use a short Helm timeout to interrupt a large production index build without assessing its database outcome. Successful hook Jobs are deleted; capture logs into the release evidence while they run or through cluster logging. Failed Jobs remain until cleanup policy applies.

## 7. Size replicas, pools and probes

The chart uses hostname topology spreading with `minDomains: 2`, `maxSkew: 1` and `DoNotSchedule`. A one-node cluster can leave the second replica Pending by design. Two physical nodes must remain eligible after affinity/selector/taint/resource constraints. Verify available surge capacity; a Pending pod is not a reason to remove spreading without reviewing the availability objective.

Rolling updates use `maxUnavailable: 0`, `maxSurge: 1` and `minReadySeconds: 10`. The PDB retains at least one ready publication replica during voluntary disruptions. It does not prevent hardware failures or guarantee uninterrupted service during a shared database outage.

Budget Mongo connections at **maximum application replicas plus rollout surge**, not at the initial two replicas. With optional HPA defaults (min 2/max 6), plan for at least 7 concurrent app pods during a rollout, plus a migration pod or administrative connections. At pool size 20, primary-directed workload pools can use about 140 connections for those app pods, in addition to monitoring sockets and other clients. The driver opens topology-monitoring connections, and secondary-directed workloads can grow pools on additional members. Use the provider's per-node/cluster limits and actual read topology rather than treating 140 as a complete cluster total.

Keep pool acquisition wait finite. Increasing replicas or pool size cannot repair a saturated database and may make it worse. HPA needs a functioning resource metrics pipeline and realistic CPU requests. Default HPA is disabled; enabling it without metrics does not provide scaling protection. Test scale-out delay, scale-in draining, CPU throttling and pool wait before enabling it in production.

Probe behavior:

| Probe | Current chart configuration | Meaning |
|---|---|---|
| Startup | `/health/live`, every 2s, timeout 2s, 30 failures allowed | Allows a startup window before liveness takes over. Mongo startup checks happen before listening, so test slow startup realistically. |
| Liveness | `/health/live`, every 10s, timeout 2s, 3 failures | Process liveness; shared Mongo outage should not produce a restart storm. |
| Readiness | `/health/ready`, every 5s, timeout 2s, 1 failure | Removes unusable/draining pods from normal traffic. Verify provider latency does not make these thresholds unstable. |

`SIGTERM`/`SIGINT` immediately mark the app draining, allow a 1-second ingress-observation interval, then stop listeners, drain in-flight work and close Mongo. Forced exit occurs by the configured 30-second application drain deadline; the chart grants 40 seconds. Test actual ingress/EndpointSlice propagation under load. Request receipt, socket inactivity and database execution deadlines are different controls; do not interpret any one timeout as proof that a write never committed. Retry uncertain mutations with the **same** original idempotency key and payload/revision.

## 8. Render, install and verify staging

First run offline validation with the reviewed values:

```bash
helm lint "$DJ_CHART" --strict -f "$DJ_VALUES"
helm template "$DJ_RELEASE" "$DJ_CHART" \
  --namespace "$DJ_NAMESPACE" -f "$DJ_VALUES"
```

Inspect the rendered image, ingress/controller identity, Secret references, policy ranges, selectors, probes, resource budgets and optional resources. No secret values should be present. If enabling Prometheus resources, install their CRDs/operators first; see the next section. If enabling migration hooks, complete all earlier prerequisites first.

Install or upgrade through the release pipeline, or after its equivalent controls:

```bash
helm upgrade --install "$DJ_RELEASE" "$DJ_CHART" \
  --namespace "$DJ_NAMESPACE" -f "$DJ_VALUES" \
  --atomic --wait --timeout 10m
kubectl rollout status deployment/"$DJ_RELEASE"-digital-jagran \
  --namespace "$DJ_NAMESPACE" --timeout=5m
kubectl get pods --namespace "$DJ_NAMESPACE" \
  -l app.kubernetes.io/instance="$DJ_RELEASE" -o wide
kubectl get ingress,service,endpointslice --namespace "$DJ_NAMESPACE"
```

The fullname is `<release>-digital-jagran`, truncated for Kubernetes names; use the rendered name for unusually long releases. `--atomic` helps restore application resources after a failed Helm release; it does **not** undo index creation, data writes or external side effects.

Before routing public production traffic, record evidence for:

1. HTTPS, DNS, certificate chain/renewal, expected canonical host and spoofed-forwarding-header rejection.
2. Two ready replicas on separate nodes, externally reachable SSR HTML in both locales, valid metadata/schema, Unicode article routes and inaccessible drafts/future schedules.
3. Authenticated operations distributed across pods; logout/revocation; shared limits; duplicate same-key requests producing one durable write/result; stale edit/archive conflicts preserving local work.
4. Public HTML/data revalidation and private `no-store` behavior through every actual edge. Home/article/section/sitemap publication and archive visibility across replicas. The current server has no process-local public content cache; do not override revalidation with indiscriminate CDN caching.
5. Pod termination and rolling upgrade under traffic, Mongo primary election, connection exhaustion, rejected egress and recovery from dependency loss.
6. Load/soak results with a realistic bilingual corpus, bounded route metrics, logs without secrets/PII, tested alert routing, rollback and isolated restore.

A successful `helm template`, ready pod or health response cannot substitute for those user-journey and durability checks.

## 9. Metrics, logs and candidate alerts

HTTP uses container port 5001 through the public Service/ingress. Prometheus uses a separate ClusterIP Service on port 9464, with no public ingress route. NetworkPolicy permits that port from the configured monitoring namespace. If policy is disabled or not enforced by the CNI, the separate port alone is not an access-control mechanism.

Optional chart settings:

- `monitoring.serviceMonitor.enabled`: emits a `monitoring.coreos.com/v1` ServiceMonitor. The Prometheus Operator CRD must already exist; its namespace/label selectors must select this object. Use `monitoring.serviceMonitor.labels` to match your installation's discovery rules.
- `monitoring.prometheusRule.enabled`: emits candidate rules requiring the corresponding PrometheusRule CRD and an operator that selects them. Configure its labels similarly.
- `networkPolicy.monitoringNamespace`: must match the actual scraper namespace. Verify the ServiceMonitor targets and successful scrape; do not assume resource creation equals collection.

The application exposes request counts/duration histograms, in-flight requests and uptime with bounded labels. It emits JSON logs with request ID, optional validated trace correlation, method, route template, status and duration. A tracing exporter, log database, infrastructure/database monitoring and pager integration are external additions. Never add raw slugs, email addresses, IPs or idempotency keys as metric labels.

The chart's candidate rules detect no available replica for 2 minutes, server errors above 1% for 10 minutes with a small traffic floor, and server p99 above 1 second for 10 minutes. Error/latency expressions are scoped to the release's metrics Service and namespace. Confirm your Prometheus scrape labels match those selectors. Availability needs kube-state-metrics; add a missing-series alert and external synthetic checks so a broken scraper or deleted deployment does not look healthy.

Rules are **initial operational thresholds**, not achieved SLOs. Candidate service objectives in [production considerations](production-considerations.md) include 99.9% public availability, public uncached TTFB p95 ≤800ms/p99 ≤2s, and publishing freshness bounds. Approve final targets, denominators, alert windows and owners after staging measurement. The chart's 1-second p99 warning can intentionally provide earlier notice than a 2-second objective; reconcile it with real traffic rather than claiming it measures browser experience.

## 10. Roll out and roll back safely

Before each release, retain the prior image digest, Helm revision, values/secret references, schema compatibility notes and an appropriate database recovery point. Use additive schema/index changes compatible with old/new pods overlapping. Watch public journeys, error/latency rates, database saturation and editorial correctness while deployment progresses.

Inspect release history and state:

```bash
helm history "$DJ_RELEASE" --namespace "$DJ_NAMESPACE"
helm status "$DJ_RELEASE" --namespace "$DJ_NAMESPACE"
kubectl get events --namespace "$DJ_NAMESPACE" --sort-by=.metadata.creationTimestamp
```

For an application regression, choose the **specific known-good revision**, then roll back:

```bash
# DJ_GOOD_REVISION must be the reviewed history entry compatible with current data.
helm rollback "$DJ_RELEASE" "$DJ_GOOD_REVISION" \
  --namespace "$DJ_NAMESPACE" --wait --timeout 10m
kubectl rollout status deployment/"$DJ_RELEASE"-digital-jagran \
  --namespace "$DJ_NAMESPACE" --timeout=5m
```

Helm rollback restores workload configuration; it does not roll back Mongo data/indexes, reverse publishing, restore the external Secret or undo credential revocation. If a database migration is incompatible, fence unsafe writes and use an approved forward fix or recovery plan. Do not run an improvised destructive down migration.

After rollback, recheck both locales, newsroom authentication, idempotent retries of unknown operations, publication/withdrawal visibility, ready replicas and metric collection. Preserve logs and deployment evidence. A successful Kubernetes rollout alone does not close an incident.

## 11. Backup, PITR and restoration drills

Managed Mongo backup/PITR must be configured outside Helm with an owner, retention, encryption/key access and a tested restoration path. Include media/object storage, domain access, infrastructure definitions and secret-manager recovery in the dependency inventory. Replica-set replication is availability, not a backup against accidental changes or deletion.

Candidate recovery objectives are **RPO ≤15 minutes and RTO ≤2 hours**, pending the selected provider tier and measured drill. Do not claim those objectives if only daily snapshots are configured. Record actual results.

For a drill or incident recovery:

1. Select and record the provider recovery timestamp and application release/schema version. Confirm recovery credentials work independently of the failed cluster.
2. Restore to a **new isolated database/cluster** and separate namespace, with public ingress and outbound side effects disabled. Never test restore by overwriting production.
3. Supply separate runtime Secrets pointing only to the restored target. Check replica-set support and index definitions; run the reviewed index procedure if necessary. Confirm no validation Job can write to the original production database.
4. Verify article counts/sample hashes, bilingual content, gallery/layout preservation, sources, timestamps, published/draft visibility, subscriber consent and idempotency results. Decide session revocation explicitly: restored sessions and credentials must not silently extend compromised access.
5. Measure the newest recovered acknowledged write and elapsed time to usable, verified service. Record missing dependencies and discrepancies; a backup success notification is not proof of recoverability.
6. For a real cutover, authorize incident ownership, stop/fence old writers, update endpoint/Secret references, roll application pods, and verify a single authoritative write target. Account explicitly for writes newer than the restored point. Preserve and reconcile uncertain idempotent operations rather than generating new keys blindly.
7. Purge any active edge caches as required, verify externally, re-enable approved side effects, confirm backup coverage on the new target and remove temporary access. Retain evidence and retire the isolated drill data under policy.

Rehearse restoration and application rollback before launch and after significant schema/platform changes, then on an agreed schedule. Regional recovery remains a separate approved procedure; two pods in one region do not provide regional failover.

## 12. Common failure checks and external boundaries

| Symptom | First checks |
|---|---|
| Helm rejects values | Fill required immutable image, domain, Secret reference, explicit ingress identity, trust network and Mongo egress ranges. Do not use CI fixtures as real values. |
| Hook fails before pods start | Confirm pre-existing runtime/pull Secrets, migration privilege, replica-set URI, duplicate/index compatibility, timeout and pre-install DNS/Mongo egress policy. Inspect retained Job/logs before cleanup. |
| Pod refuses Mongo startup | Verify replica-set topology and every required index. Ordinary startup does not repair missing indexes. Confirm provider TLS/DNS/access list and database name. |
| Second/surge pod Pending | Inspect eligible nodes, two-domain topology spread, taints/selectors, requests, quota and capacity. Read scheduler events before changing placement guarantees. |
| Readiness fails on all pods | Inspect shared Mongo reachability, credentials and pool saturation; liveness restarts are not a database recovery strategy. |
| Ingress cannot reach HTTP | Verify controller namespace/pod labels, ingress class, Service publication selector and CNI policy enforcement. Migration pods must not appear as HTTP backends. |
| Metrics absent | Check metrics Service, monitoring namespace, CRDs/operator selectors, scrape labels and NetworkPolicy. Verify kube-state-metrics for availability alerts. |
| Writes time out | Preserve original operation key/payload/revision; inspect durable result and DB health before retry. Never clear the editor's recovery data as a server repair step. |
| Too many connections | Include HPA maximum, rollout surge, migrations, monitoring sockets and other clients. Reduce admitted work or pool budget with measurement; blindly adding pods can amplify saturation. |

Cloud WAF/DDoS protection, CDN/origin shielding, registrar/DNS security, TLS issuance/renewal, cloud/cluster IAM, encrypted storage, secret-manager controls and managed database maintenance remain platform responsibilities. Configure cost alerts for cluster, database, egress and telemetry. A repository artifact is not proof that these controls are active.

This runbook intentionally does not create an unnecessary broker, WebSocket service, cross-service saga, sharded database or multi-region active/active setup. Introduce those only for a concrete product need or measured capacity/recovery requirement, with operational ownership and acceptance tests.
