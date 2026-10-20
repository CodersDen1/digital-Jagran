# Integrated rebuild verification

Verified locally on 20 October 2026. This is evidence for the local rebuild, not a live production deployment or traffic benchmark.

## Application checks

- Client: 12/12 tests pass; Vite client and SSR builds pass; focused active-code lint passes.
- CMS: 12/12 tests pass; production build and active-code lint pass.
- Backend: 30/30 tests pass with an explicitly selected disposable MongoDB replica set, including concurrent idempotency, transactional rollback, shared sessions/rate limits, optimistic conflicts, migration dry-run/apply, legacy field preservation, publication visibility and metadata.
- Root syntax check: eight server modules pass.
- All four workspaces report zero npm audit findings, including development dependencies, at verification time. This is an advisory snapshot, not proof of absence of vulnerabilities.

## Deployment checks

Helm strict lint and offline render validation pass for seven baseline resources and eleven resources with HPA, migration and Prometheus options enabled. Eight unsafe configurations are rejected. Checks cover immutable image references, non-root/read-only settings, probes, TLS, restricted egress, publication-only Service/PDB selectors, distinct migration labels and namespace/service-scoped alert expressions.

The final Docker image builds successfully. Its Linux runtime was tested against a disposable Mongo replica set with a read-only root filesystem, dropped capabilities, disabled privilege escalation and the non-root Node user. Readiness, SSR HTML, CMS HTML and the separate internal metrics listener return 200; the public listener's `/metrics` returns 404. Real Docker SIGTERM shutdown exits cleanly with code 0. The disposable database containers and network were removed after verification.

CI definitions include Windows/Linux app checks, a separate disposable Mongo replica-set job, deployment validation and a Docker build without publishing. The workflow has been authored and locally checked; a hosted GitHub Actions run is not claimed.

## Browser checks

Verified local reader navigation, English/Hindi pages, article detail, device reading lists, Hindi search, 375-pixel layouts, newsroom sign-in, bilingual authoring, preview, draft/save/publish/source rendering and reversible archive. After integration, rechecked sign-in, story library, archived story loading and Hindi structured preview. Browser console inspection found no errors during these checks.

Screenshots are in `artifacts/rebuild/`, including `integrated-public-hindi.jpg` and `integrated-hindi-preview.jpg`. Local preview remains at http://localhost:5001/hi and http://localhost:5001/newsroom/ using isolated demonstration data. Existing environment files and the user's Mongo database were not connected or changed.

## Required deployment evidence

Cluster scheduling, real ingress/proxy identity, TLS and DNS, network-policy enforcement, CDN/WAF behavior, managed Mongo backups/PITR restoration, load/soak/chaos tests, production Core Web Vitals and alert routing still require the selected staging/production infrastructure. AI citation and ranking outcomes cannot be guaranteed. Follow the Kubernetes runbook and production considerations register for those responsibilities.
