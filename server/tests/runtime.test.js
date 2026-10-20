const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
async function freePort() {
  const s = http.createServer();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const port = s.address().port;
  await new Promise((r) => s.close(r));
  return port;
}
test(
  "runtime exposes metrics separately and SIGTERM handler fails readiness then closes listeners",
  { timeout: 12000 },
  async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dj-runtime-"));
    const port = await freePort(),
      metricsPort = await freePort();
    const child = spawn(
      process.execPath,
      [
        "-e",
        "process.stdin.on('data',()=>process.emit('SIGTERM')); require('./server/index.js');",
      ],
      {
        cwd: path.resolve(__dirname, "../.."),
        windowsHide: true,
        env: {
          ...process.env,
          NODE_ENV: "development",
          HOST: "127.0.0.1",
          PORT: String(port),
          PUBLIC_ORIGIN: `http://127.0.0.1:${port}`,
          METRICS_HOST: "127.0.0.1",
          METRICS_PORT: String(metricsPort),
          DATA_STORE: "file",
          DATA_FILE: path.join(dir, "runtime.json"),
          SEED_DEMO: "false",
          ADMIN_EMAIL: "runtime@test.local",
          ADMIN_PASSWORD: "runtime-test-password",
          TRUST_PROXY: "",
          MONGODB_URI: "",
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.on("data", (b) => {
      output += b;
    });
    child.stderr.on("data", (b) => {
      output += b;
    });
    const exited = new Promise((resolve) =>
      child.once("exit", (code, signal) => resolve({ code, signal })),
    );
    try {
      await new Promise((resolve, reject) => {
        const deadline = setTimeout(
          () => reject(new Error("Startup timeout: " + output)),
          5000,
        );
        const inspect = () => {
          if (output.includes('"event":"listening"')) {
            clearTimeout(deadline);
            child.stdout.off("data", inspect);
            resolve();
          }
        };
        child.stdout.on("data", inspect);
        inspect();
        child.once("exit", () => {
          clearTimeout(deadline);
          reject(new Error("Unexpected startup exit: " + output));
        });
      });
      const origin = `http://127.0.0.1:${port}`;
      assert.equal((await fetch(origin + "/health/ready")).status, 200);
      assert.equal((await fetch(origin + "/metrics")).status, 404);
      const metrics = await fetch(`http://127.0.0.1:${metricsPort}/metrics`);
      assert.equal(metrics.status, 200);
      assert.match(await metrics.text(), /dj_http_requests_total/);
      assert.equal(
        (await fetch(`http://127.0.0.1:${metricsPort}/anything`)).status,
        404,
      );
      const draining = new Promise((resolve) => {
        const inspect = () => {
          if (output.includes('"event":"drain_started"')) {
            child.stdout.off("data", inspect);
            resolve();
          }
        };
        child.stdout.on("data", inspect);
      });
      // Windows does not deliver Unix signals; emit the real installed handler in the child.
      child.stdin.write("terminate\n");
      await draining;
      assert.equal((await fetch(origin + "/health/ready")).status, 503);
      assert.equal((await fetch(origin + "/health/live")).status, 200);
      const exit = await exited;
      assert.equal(exit.code, 0, output);
      assert.equal(exit.signal, null);
    } finally {
      if (child.exitCode === null) child.kill();
      await exited;
      await fs.rm(dir, { recursive: true });
    }
  },
);
