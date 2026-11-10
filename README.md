# Spark Academy — Smart Learning Platform

Next.js App Router, React, TypeScript, Tailwind CSS, accessible Radix/shadcn-style primitives, Recharts, React Hook Form/Zod, NextAuth.js, Prisma and PostgreSQL. Three role workspaces share REST APIs with server-side scope checks. No live tutoring, emergency sessions, calls or teacher booking is implemented.

## Local setup

Requires Node.js 22.12+ or 24, npm and PostgreSQL.

```sh
npm install
```

Copy `.env.example` to `.env`. Set random NEXTAUTH_SECRET and CRON_SECRET values, and your own DEMO_SEED_PASSWORD (12+ characters). For the optional bundled development PostgreSQL runtime:

```sh
npm run db:local
```

Leave that terminal running. It binds only to 127.0.0.1:55432 and retains data in ignored .local/postgres. The example database password is loopback development only. Or configure your own PostgreSQL DATABASE_URL.

In another terminal:

```sh
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open http://127.0.0.1:3000. Seed creates 1 administrator, 3 teachers, 20 synthetic students and 2 batches. It refuses NODE_ENV=production and does not overwrite existing passwords/data.

Local accounts: admin@spark.example, teacher1@spark.example through teacher3@spark.example, student1@spark.example through student20@spark.example. The initial password is YOUR local DEMO_SEED_PASSWORD, never a committed default.

## Features

- Three dashboards, responsive navigation and role-protected routes.
- Admin accounts, deactivation, batches, enrollments, teacher assignments, subjects/chapters, routine conflicts, announcements and audit history.
- Teacher YouTube lesson and HTTPS learning resource management.
- Timed MCQ exams, drafts/publishing, attempt limits, autosave, refresh restoration, server grading and release-time confidentiality.
- Best-attempt competition ranking, explicit lesson/chapter completion and attendance with CSV export.
- Anonymous text/recorded Q&A, replies, reporting/moderation and private audio playback. Natural voices may reveal identity.
- Private student-to-admin teacher feedback, status and replies; teachers cannot access complaints.
- Revision status schedules with preserved history, Sheets jobs, scheduled reminders, notifications and preferences.
- Password reset with session invalidation.

## External integrations

Audio: STORAGE_MODE=local stores private files under ignored .local/audio in development only. Configure a PRIVATE S3-compatible bucket for production; playback uses 120-second signed URLs after authorization. Recorder limit: 120 seconds. Server limit: 3 MB, MIME/signature checks. Full transcoding/antimalware processing is a deployment extension.

Email: EMAIL_MODE=local writes previews to ignored .local/mail and never claims delivery. Production requires Resend and a verified EMAIL_FROM with the Spark Academy display name. Local adapters are disabled in production.

Sheets: create a private spreadsheet with a tab named Revisions. Headers: Topic ID, Student reference, Subject, Chapter, Topic, Learning date, Status, Revision dates, Completed dates. Share only with the service account/admins. Set GOOGLE\_\* credentials. Database is authoritative; jobs upsert by topic ID, record failures and retry. Students receive no master spreadsheet URL or credentials.

Scheduler: `npm run jobs` locally, or GET /api/jobs with Authorization: Bearer CRON_SECRET. Uses Asia/Dhaka calendar dates. Persistent job leases, retry states and stable email idempotency keys prevent routine duplicate delivery. Jobs create revision/result notifications. Local preview logs are distinct from SENT.

Live-provider success is NOT implied by passing local tests. See docs/DEPLOYMENT.md, docs/ARCHITECTURE.md and docs/API.md.

## Checks

```sh
npm run test:unit
npm run test:setup
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Test setup migrates a separate local spark_test database. Integration tests refuse other names. E2E uses the seeded app at 127.0.0.1:3000 and adds synthetic test records; never run it against production. Keep local PostgreSQL and npm run dev running. Do not run next build and next dev against the same .next directory concurrently.

Production: npm run db:deploy, npm run build, npm run start. Never reset or recreate a populated student database.

The original prototype remains in this workstation’s ignored legacy/ folder and earlier Git history; it is not served by this application. Logo assets are in public/.

## Visual system

The current reference-informed design uses a black landing page, white header, green actions, Inter/Anek Bangla typography and an animated electric-violet/cyan lightning-and-spark logo. Existing premium Student, Teacher and Admin dashboards use the same identity and action colors. Class filters, program search, course details and FAQ are interactive. See [design notes](docs/DESIGN.md). Existing accounts and academic services are preserved.

### Local startup

Run `npm run dev` from the project directory after configuring `.env`. It checks the configured PostgreSQL address and starts the retained local database automatically when using `127.0.0.1:55432`. Do not delete `.local/postgres`; it contains the local student data. Apply new additive migrations with `npm run db:deploy` before starting an updated checkout.
