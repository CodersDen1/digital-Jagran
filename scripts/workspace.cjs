const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run this script through npm.");
if (["build", "test"].includes(process.argv[2])) {
  const command = process.argv[2];
  for (const folder of command === 'build' ? ["client", "cms"] : ["client", "cms", "server"]) {
    const result = spawnSync(process.execPath, [npm, "run", command], {
      cwd: path.join(root, folder),
      stdio: "inherit",
    });
    if (result.status !== 0) process.exit(result.status || 1);
  }
} else {
  const children = [
    ["server", "start"],
    ["client", "dev"],
    ["cms", "dev"],
  ].map(([folder, command]) =>
    spawn(process.execPath, [npm, "run", command], {
      cwd: path.join(root, folder),
      stdio: "inherit",
    }),
  );
  const stop = () => {
    for (const child of children) child.kill("SIGTERM");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  for (const child of children)
    child.on("exit", (code) => {
      if (code) {
        stop();
        process.exitCode = code;
      }
    });
}
