const path = require("node:path");
require("dotenv").config({ quiet: true, path: path.join(__dirname, ".env") });
const { fileStore, mongoStore } = require("./newsroom/store");
const { createApp } = require("./newsroom/app");
async function start() {
  const production = process.env.NODE_ENV === "production";
  if (
    production &&
    (!process.env.ADMIN_EMAIL ||
      !process.env.ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD.length < 16 ||
      !process.env.PUBLIC_ORIGIN)
  )
    throw new Error(
      "Production requires ADMIN_EMAIL, a 16+ character ADMIN_PASSWORD and PUBLIC_ORIGIN.",
    );
  if (production && process.env.ADMIN_PASSWORD === "newsroom-local-2026")
    throw new Error("Choose a unique production admin password.");
  require("./newsroom/automation").automationAuth(
    process.env.AUTOMATION_INGEST_TOKEN,
  );
  if (
    process.env.AUTOMATION_INGEST_TOKEN &&
    process.env.AUTOMATION_INGEST_TOKEN === process.env.ADMIN_PASSWORD
  )
    throw new Error("Automation and editor credentials must differ.");
  const mode = process.env.DATA_STORE || "file";
  if (!["file", "mongo"].includes(mode))
    throw new Error("DATA_STORE must be file or mongo.");
  if (production && mode !== "mongo")
    throw new Error(
      "Production requires DATA_STORE=mongo with a replica set; file mode is development only.",
    );
  if (mode === "mongo" && !process.env.MONGODB_URI)
    throw new Error("MONGODB_URI is required for mongo storage.");
  const automationConfig = {
    dailyBudgetMicroUsd: process.env.AUTOMATION_DAILY_BUDGET_MICRO_USD,
    maxAttempts: process.env.AUTOMATION_MAX_ATTEMPTS,
    dailyMaxJobs: process.env.AUTOMATION_DAILY_MAX_JOBS,
    minimumReservationMicroUsd:
      process.env.AUTOMATION_MIN_RESERVATION_MICRO_USD,
  };
  const store =
    mode === "mongo"
      ? await mongoStore(process.env.MONGODB_URI, automationConfig)
      : await fileStore(
          path.resolve(
            process.env.DATA_FILE || path.join(__dirname, "data/newsroom.json"),
          ),
          !production && process.env.SEED_DEMO !== "false",
          automationConfig,
        );
  if (production && store.demo)
    throw new Error(
      "The demo store cannot be served in production. Select MongoDB or a fresh production DATA_FILE.",
    );
  const port = Number(process.env.PORT || 5001);
  const origin = (
    process.env.PUBLIC_ORIGIN || `http://localhost:${port}`
  ).replace(/\/$/, "");
  const parsedOrigin = new URL(origin);
  if (
    !["http:", "https:"].includes(parsedOrigin.protocol) ||
    parsedOrigin.pathname !== "/"
  )
    throw new Error("PUBLIC_ORIGIN must be an HTTP(S) origin without a path.");
  if (production && parsedOrigin.protocol !== "https:")
    throw new Error("Production PUBLIC_ORIGIN must use HTTPS.");
  const host = process.env.HOST || "127.0.0.1";
  if (
    !production &&
    !process.env.ADMIN_PASSWORD &&
    !["127.0.0.1", "localhost", "::1"].includes(host)
  )
    throw new Error(
      "Set ADMIN_PASSWORD before exposing development outside localhost.",
    );
  const app = createApp({
    store,
    production,
    origin,
    adminEmail: process.env.ADMIN_EMAIL || "editor@digitaljagran.local",
    adminPassword: process.env.ADMIN_PASSWORD || "newsroom-local-2026",
    trustProxy: process.env.TRUST_PROXY || false,
    automationToken: process.env.AUTOMATION_INGEST_TOKEN,
    allowedOrigins: (
      process.env.ALLOWED_ORIGINS ||
      (!production ? "http://localhost:5173,http://localhost:5174" : "")
    )
      .split(",")
      .filter(Boolean),
  });
  const http = require("node:http");
  const server = http.createServer(
    { requestTimeout: 15000, headersTimeout: 10000, keepAliveTimeout: 5000 },
    app,
  );
  server.setTimeout(20000, (socket) => socket.destroy());
  const metrics = http.createServer((req, res) => {
    if (req.url !== "/metrics") {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, {
      "Content-Type": "text/plain; version=0.0.4",
      "Cache-Control": "no-store",
    });
    res.end(app.locals.metrics());
  });
  metrics.requestTimeout = 5000;
  metrics.headersTimeout = 5000;
  metrics.setTimeout(5000, (socket) => socket.destroy());
  server.listen(port, host, () =>
    console.log(
      JSON.stringify({ event: "listening", port, host, storage: store.kind }),
    ),
  );
  metrics.listen(
    Number(process.env.METRICS_PORT || 9464),
    process.env.METRICS_HOST || host,
  );
  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    app.locals.lifecycle.draining = true;
    console.log(JSON.stringify({ event: "drain_started" }));
    const timeout = Math.min(
      35000,
      Math.max(1000, Number(process.env.DRAIN_TIMEOUT_MS) || 30000),
    );
    const force = setTimeout(() => {
      server.closeAllConnections();
      metrics.closeAllConnections();
      process.exit(1);
    }, timeout);
    force.unref();
    // Allow ingress readiness observation before closing the HTTP listener.
    setTimeout(() => {
      metrics.close();
      metrics.closeIdleConnections();
      server.close(async () => {
        try {
          await store.close();
          clearTimeout(force);
          process.exit(0);
        } catch {
          process.exit(1);
        }
      });
      server.closeIdleConnections();
    }, 1000);
  };
  server.on("error", (error) => {
    console.error(
      JSON.stringify({ event: "listener_error", code: error.code }),
    );
    close();
  });
  metrics.on("error", (error) => {
    console.error(
      JSON.stringify({ event: "metrics_listener_error", code: error.code }),
    );
    close();
  });
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}
start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
