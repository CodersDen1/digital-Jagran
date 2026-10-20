# Coolify deployment

The user selected a fresh MongoDB replica set for this deployment after the old Atlas hostname failed DNS resolution. The existing database and local `.env` files were not changed. The new database starts without articles or demonstration content.

The deployment source is `codex/digital-jagran-rebuild-deploy`, using root `docker-compose.yaml` and `Dockerfile`. The repository's newer `main` branch was preserved. Coolify builds reader, SSR, CMS and server into one runtime image. Kubernetes artifacts remain available separately; this Coolify Compose installation is not a Kubernetes cluster.

## Routes and secrets

- Reader: `https://digitaljagran.com/en` and `/hi`.
- Newsroom: `https://digitaljagran.com/newsroom/`.
- API compatibility hostname: `https://server.digitaljagran.com/api/v1`.
- `www.digitaljagran.com` routes to the same publication. Canonical metadata uses the root domain.
- Browser apps use same-origin API calls; they need no database or administrator secrets and no localhost API build setting.
- Production `PUBLIC_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `MONGO_ROOT_PASSWORD`, `MONGO_APP_PASSWORD` and `TRUST_PROXY` are configured through Coolify. Password values are generated uniquely, stored only in Coolify, and omitted from this repository. Retrieve the newsroom password from Coolify's production environment editor.
- `TRUST_PROXY` trusts the observed ingress peer (`10.0.4.2/32` on this resource’s private application network), plus Cloudflare’s published IPv4/IPv6 ranges. The proxy was identified by inspecting the deployed resource network, not by assuming the global Coolify network. Recheck this peer and the official Cloudflare lists if topology or CDN ranges change.

BuildKit secret handling is enabled in Coolify. Administrator/database passwords are marked unavailable during build and available at runtime. No application secret is committed to Git.

## Database and startup

MongoDB 8 uses a private Compose database network with authentication, a persisted replica key, and persistent `mongo-data`/`mongo-config` volumes. Coolify additionally attaches services to its private application network. MongoDB has no public domain or published host ports. Its health check initializes the fresh `djrs` replica set and creates a `digitaljagran` database user with only `readWrite` on `digital_jagran`. The application uses this user, not the database root identity.

The publication waits for database health. This particular Compose entrypoint explicitly runs additive index provisioning before executing the server. No content migration or seeding runs. Duplicate existing index data fails the migration instead of being erased. The generic server startup still only validates indexes; this bootstrap is specific to the selected fresh Coolify deployment.

The application is non-root, has a read-only root filesystem, dropped capabilities, bounded memory/CPU and a temporary `/tmp`. Its Docker health check uses `/health/ready`; shutdown has a 40-second grace period. The metrics listener on 9464 is not routed through the public proxy.

This is a **single-member replica set on one server**, enabling transactions but providing no database/node failover. Durable Docker volumes do not replace backups. Before relying on the publication operationally, configure encrypted off-server backups and test restoration into an isolated destination. Multi-node/zone database redundancy and the Kubernetes deployment require separate infrastructure.

## Verification and operations

Local verification of this exact Compose configuration established authenticated replica-set initialization, least-privileged application connectivity, index creation and healthy application readiness. Production verification must additionally confirm HTTPS, initial SSR HTML, CMS login, public API reads and private API rejection.

Redeploy through Coolify after source/configuration changes. Keep the previous source commit for application rollback; do not remove volumes when rolling back application code. Database password changes require a deliberate user-rotation operation inside MongoDB as well as matching Coolify environment values; changing an initialization environment variable alone does not rotate an existing database user.

Never run `docker compose down -v` against the production project. Avoid rebuilding or reinitializing the database merely to roll back the web image. Retain a recent database backup before migrations beyond this additive index bootstrap.

## Deployment evidence — 20 October 2026

Coolify successfully built and started the application and authenticated Mongo replica set on the selected server. Both language routes and the newsroom return HTTPS 200, the API health endpoint returns 200, unauthenticated admin reads return 401, and public metrics return 404. Initial reader HTML includes rendered navigation, content state, localized title and canonical metadata. Production editor sign-in succeeds and its Mongo-backed session survives a container redeployment. The dashboard confirms zero articles and subscribers, as requested for the fresh database. Off-server backups and multi-node failover have not been configured.
