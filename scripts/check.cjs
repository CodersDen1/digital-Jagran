const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const files = [
  "server/index.js",
  ...fs
    .readdirSync(path.join(root, "server/newsroom"))
    .filter((f) => f.endsWith(".js"))
    .map((f) => `server/newsroom/${f}`),
];
for (const file of files) {
  const result = spawnSync(
    process.execPath,
    ["--check", path.join(root, file)],
    { stdio: "inherit" },
  );
  if (result.status) process.exit(result.status);
}
console.log(`Checked ${files.length} server modules.`);
