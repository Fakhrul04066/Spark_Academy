import "dotenv/config";
import { z } from "zod";
import { hash } from "bcryptjs";
import { db } from "../src/lib/db";
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const i = a.indexOf("=");
    return [a.slice(2, i), a.slice(i + 1)];
  }),
);
try {
  const data = z
    .object({ email: z.email(), name: z.string().min(1) })
    .parse(args);
  const password = z
    .string()
    .min(12)
    .max(128)
    .parse(process.env.ADMIN_INITIAL_PASSWORD);
  await db.user.create({
    data: {
      ...data,
      email: data.email.toLowerCase(),
      role: "ADMIN",
      passwordHash: await hash(password, 12),
    },
  });
  console.log(
    "Administrator created. Remove the bootstrap password from the environment.",
  );
} finally {
  await db.$disconnect();
}
