import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import "dotenv/config";
const url = new URL(
  process.env.DATABASE_URL ||
    "postgresql://spark:spark_local_only@127.0.0.1:55432/spark",
);
url.pathname = "/spark_test";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: { DATABASE_URL: url.toString(), EMAIL_MODE: "local" },
  },
});
