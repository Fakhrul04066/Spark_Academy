# Deployment

1. Provision managed PostgreSQL with encryption, backups and restricted access. Use a Prisma-compatible pooler/runtime URL and direct migration connection as your provider requires. Do not deploy the bundled local PostgreSQL server.
2. Provision a PRIVATE S3-compatible bucket. Deny public listing/object reads. Configure server-only credentials; set STORAGE_MODE=s3.
3. Verify Resend sender domain. Set EMAIL_MODE=provider, RESEND_API_KEY and EMAIL_FROM="Spark Academy <no-reply@your-domain>". Local adapters refuse production operation.
4. Create private Revisions spreadsheet/tab and service-account access. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SPREADSHEET_ID. Never share the master sheet with students.
5. Set DATABASE_URL, HTTPS NEXTAUTH_URL, random NEXTAUTH_SECRET and independent CRON_SECRET in Vercel's encrypted environment. Never set DEMO_SEED_PASSWORD or run demo seed in production.
6. Run npm ci, npm run db:deploy, npm run build. Framework: Next.js, no static-output directory. Never migrate reset or force-reset an existing database.
7. Bootstrap the first admin with npm run admin:create -- --email=you@your-domain --name="Administrator". Supply ADMIN_INITIAL_PASSWORD via a secure environment mechanism, never arguments or source. Unset it after bootstrap. Script hashes passwords and refuses to overwrite an existing user.
8. Schedule authenticated GET /api/jobs hourly. Vercel supplies Authorization Bearer CRON_SECRET when configured. Example vercel.json uses UTC; application jobs select Asia/Dhaka dates. Daily-only hosting plans need a daily cron after Dhaka midnight and have reduced retries.
9. Smoke-test all roles, assignment boundaries, timed exams/release, private Q&A/audio and feedback access. Verify REAL email delivery, a REAL Sheets update and private object denial before inviting students.
10. Complete independent security/accessibility/load review, backups, restore drill, retention policy and monitoring for student data.

Local tests do not verify live provider credentials/policies. This repository prepares deployment; it does not claim a live production deployment or independent security certification.
