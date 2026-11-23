import { z } from "zod";

export const signupEmail = z.string().trim().toLowerCase().max(254).pipe(
  z.email("Enter a valid email address"),
).refine((email) => !email.endsWith("@phone.spark.invalid"), "Enter a valid email address");

export const signupDetails = z.object({
  name: z.string().trim().min(1, "Enter your full name").max(100),
  email: signupEmail,
  phone: z.string().max(30).transform((value) => {
    const number = value.replace(/[\s()-]/g, "").replace(/^\+?880/, "0");
    return number.startsWith("1") ? "0" + number : number;
  }).refine((value) => /^01[3-9]\d{8}$/.test(value), "Enter a valid Bangladesh mobile number"),
  password: z.string().min(8, "Use at least 8 characters").max(72)
    .refine((value) => new TextEncoder().encode(value).length <= 72, "Password must be at most 72 bytes"),
});
