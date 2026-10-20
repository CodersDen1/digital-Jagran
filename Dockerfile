# syntax=docker/dockerfile:1
# Override with an approved image digest in your release pipeline.
ARG NODE_IMAGE=node:24-bookworm-slim
FROM ${NODE_IMAGE} AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps
COPY client/ ./
RUN npm run build && npm prune --omit=dev --legacy-peer-deps

FROM ${NODE_IMAGE} AS cms-build
WORKDIR /app/cms
COPY cms/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps
COPY cms/ ./
RUN npm run build

FROM ${NODE_IMAGE} AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5001 METRICS_PORT=9464
WORKDIR /app/server
COPY --chown=node:node server/ ./
COPY --from=server-deps --chown=node:node /app/server/node_modules ./node_modules
COPY --from=client-build --chown=node:node /app/client/package.json /app/client/package.json
COPY --from=client-build --chown=node:node /app/client/node_modules /app/client/node_modules
COPY --from=client-build --chown=node:node /app/client/dist /app/client/dist
COPY --from=client-build --chown=node:node /app/client/dist-server /app/client/dist-server
COPY --from=cms-build --chown=node:node /app/cms/dist /app/cms/dist
USER node
EXPOSE 5001 9464
STOPSIGNAL SIGTERM
CMD ["node", "index.js"]
