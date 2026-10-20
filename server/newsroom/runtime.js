const { randomUUID } = require("node:crypto");
function observability(
  app,
  store,
  { logger = console.log, trustProxy = false } = {},
) {
  app.set("trust proxy", trustProxy);
  const state = {
    draining: false,
    started: Date.now(),
    requests: new Map(),
    duration: new Map(),
    inflight: 0,
  };
  app.locals.lifecycle = state;
  app.use((req, res, next) => {
    req.versioned = /^\/api\/v1(?:\/|$)/.test(req.url);
    if (req.versioned) req.url = req.url.replace(/^\/api\/v1/, "/api");
    req.requestId = /^[A-Za-z0-9._-]{1,128}$/.test(
      req.get("x-request-id") || "",
    )
      ? req.get("x-request-id")
      : randomUUID();
    const trace = req.get("traceparent");
    req.traceparent =
      /^00-(?!0{32})[a-f0-9]{32}-(?!0{16})[a-f0-9]{16}-[a-f0-9]{2}$/.test(
        trace || "",
      )
        ? trace
        : undefined;
    res.set("X-Request-Id", req.requestId);
    if (req.traceparent) res.set("traceparent", req.traceparent);
    res.set("Cache-Control", "no-cache");
    const privateRequest = Boolean(
      req.get("cookie") ||
        /^\/api\/(admin|auth|newsletter)/.test(req.path) ||
        /\/(search|saved)(?:\/|$|\?)/.test(req.path) ||
        req.path.startsWith("/newsroom"),
    );
    if (privateRequest) res.set("Cache-Control", "no-store");
    const originalSend = res.send;
    res.send = function (body) {
      if (res.statusCode >= 400 || req.method !== "GET")
        res.set("Cache-Control", "no-store");
      return originalSend.call(this, body);
    };
    state.inflight++;
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      state.inflight--;
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      const route =
        typeof req.route?.path === "string"
          ? req.route.path
          : req.route
            ? "document"
            : "unmatched";
      const method = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS",
        "HEAD",
      ].includes(req.method)
        ? req.method
        : "OTHER";
      const labels = JSON.stringify({
        method,
        route,
        status: String(res.statusCode),
      });
      state.requests.set(labels, (state.requests.get(labels) || 0) + 1);
      const d = state.duration.get(labels) || {
        sum: 0,
        count: 0,
        buckets: [0, 0, 0, 0, 0, 0],
      };
      d.sum += seconds;
      d.count++;
      [0.01, 0.05, 0.1, 0.5, 1, 5].forEach((b, i) => {
        if (seconds <= b) d.buckets[i]++;
      });
      state.duration.set(labels, d);
      logger(
        JSON.stringify({
          event: "http_request",
          requestId: req.requestId,
          ...(req.traceparent ? { traceparent: req.traceparent } : {}),
          method,
          route,
          status: res.statusCode,
          durationMs: Math.round(seconds * 1000),
        }),
      );
    });
    if (state.draining && !req.path.startsWith("/health")) {
      res.set("Connection", "close");
      return res
        .status(503)
        .json({ error: "Server is draining.", requestId: req.requestId });
    }
    next();
  });
  app.get("/health/live", (req, res) =>
    res.set("Cache-Control", "no-store").json({ status: "ok" }),
  );
  const ready = async (req, res) => {
    let available = false;
    if (!state.draining)
      try {
        available = await store.ready();
      } catch {}
    res
      .set("Cache-Control", "no-store")
      .status(available ? 200 : 503)
      .json({
        status: available ? "ok" : "unavailable",
        service: "digital-jagran",
        storage: store.kind,
      });
  };
  app.get(["/health/ready", "/health"], ready);
  app.locals.metrics = () => {
    const labels = (k) =>
      Object.entries(JSON.parse(k))
        .map(([n, v]) => `${n}=${JSON.stringify(v)}`)
        .join(",");
    const lines = [
      "# TYPE dj_http_requests_total counter",
      "# TYPE dj_http_request_duration_seconds histogram",
    ];
    for (const [k, n] of state.requests)
      lines.push(`dj_http_requests_total{${labels(k)}} ${n}`);
    for (const [k, d] of state.duration) {
      [0.01, 0.05, 0.1, 0.5, 1, 5].forEach((b, i) =>
        lines.push(
          `dj_http_request_duration_seconds_bucket{${labels(k)},le="${b}"} ${d.buckets[i]}`,
        ),
      );
      lines.push(
        `dj_http_request_duration_seconds_bucket{${labels(k)},le="+Inf"} ${d.count}`,
        `dj_http_request_duration_seconds_sum{${labels(k)}} ${d.sum}`,
        `dj_http_request_duration_seconds_count{${labels(k)}} ${d.count}`,
      );
    }
    lines.push(
      "# TYPE dj_http_inflight gauge",
      `dj_http_inflight ${state.inflight}`,
      "# TYPE dj_process_uptime_seconds gauge",
      `dj_process_uptime_seconds ${(Date.now() - state.started) / 1000}`,
    );
    return lines.join("\n") + "\n";
  };
}
module.exports = { observability };
