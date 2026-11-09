import "dotenv/config";
import { runJobs } from "../src/services/revision";
import { db } from "../src/lib/db";
try {
  console.log(await runJobs());
} finally {
  await db.$disconnect();
}
