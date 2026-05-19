const { spawnSync } = require("node:child_process");
const { mkdirSync } = require("node:fs");
const path = require("node:path");

if (!process.env.DATABASE_URL) {
  const dataDir = path.resolve(__dirname, "../../../data/dev");
  mkdirSync(dataDir, { recursive: true });
  process.env.DATABASE_URL = `file:${path.join(dataDir, "hms.sqlite").replace(/\\/g, "/")}`;
}

const prismaCli = require.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env
});

process.exit(result.status ?? 1);
