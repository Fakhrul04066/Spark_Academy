import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const dir = resolve(".local/postgres");
const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: "spark",
  password: "spark_local_only",
  port: 55432,
  persistent: true,
  initdbFlags: ["--locale=C", "--encoding=UTF8"],
  postgresFlags: ["-h", "127.0.0.1"],
  autoRehydrateSymlinks: true,
});
if (!existsSync(resolve(dir, "PG_VERSION"))) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
if (
  !(await client.query("SELECT 1 FROM pg_database WHERE datname='spark'"))
    .rowCount
)
  await pg.createDatabase("spark");
await client.end();
console.log(
  "Local PostgreSQL ready on 127.0.0.1:55432. Data is retained in .local/postgres.",
);
const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 60000);
