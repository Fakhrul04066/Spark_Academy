import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import { spawnSync } from "node:child_process";
const source = new URL(process.env.DATABASE_URL || "");
if (
  !["127.0.0.1", "localhost"].includes(source.hostname) ||
  source.port !== "55432"
)
  throw new Error(
    "Test bootstrap only supports the dedicated local PostgreSQL server",
  );
const pg = new EmbeddedPostgres({
  user: decodeURIComponent(source.username),
  password: decodeURIComponent(source.password),
  port: 55432,
});
const client = pg.getPgClient();
await client.connect();
if (
  !(await client.query("SELECT 1 FROM pg_database WHERE datname='spark_test'"))
    .rowCount
)
  await client.query("CREATE DATABASE spark_test");
await client.end();
source.pathname = "/spark_test";
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  {
    env: { ...process.env, DATABASE_URL: source.toString() },
    stdio: "inherit",
  },
);
process.exitCode = result.status || 0;
