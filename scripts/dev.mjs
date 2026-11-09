import net from "node:net";
import { spawn } from "node:child_process";
const databaseUrl = process.env.DATABASE_URL;
// Next loads .env itself; the local database uses this port unless overridden.
const port = databaseUrl ? Number(new URL(databaseUrl).port || 5432) : 55432;
const host = databaseUrl ? new URL(databaseUrl).hostname : "127.0.0.1";
function available() {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    socket.setTimeout(1000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}
if (!(await available()) && host === "127.0.0.1" && port === 55432) {
  spawn(process.execPath, ["scripts/local-db.mjs"], { stdio: "inherit" });
  for (let attempt = 0; attempt < 30 && !(await available()); attempt++)
    await new Promise((r) => setTimeout(r, 1000));
}
if (!(await available())) {
  console.error(
    "Database is offline. Start the configured PostgreSQL database first.",
  );
  process.exit(1);
}
const next = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);
next.on("exit", (code) => process.exit(code || 0));
