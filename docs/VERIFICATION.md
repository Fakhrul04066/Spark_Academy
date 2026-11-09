# Verification report — 2026-11-09

## Executed successfully

- PostgreSQL: three non-destructive migrations applied to the local application database and isolated spark_test database. No database reset/drop was run.
- Local seed: administrator, three teachers, twenty synthetic students, two batches and sample academic records. Re-running seed preserves existing accounts/data.
- npm run typecheck: Next route type generation and strict TypeScript check passed.
- npm test: 28 tests passed across three files. Includes revision dates/status transitions, UTC/Dhaka handling, ranking ties, scoring/deadlines, attendance uniqueness, assignment permissions, anonymous serialization, private feedback, job idempotency, overdue reminders/preferences and adapter failure handling.
- npm run build: successful Next.js production build with public/auth pages, three protected role workspaces, REST API routes and authenticated job endpoint.
- npm audit: zero reported vulnerabilities, including development dependencies at verification time.
- Playwright full suite: 14 desktop/mobile tests passed. Covers login/navigation for all roles, account creation/deactivation/reset, lesson URLs, revision topics, feedback, exams/autosave/refresh/results and recorded Q&A.
- Focused follow-up: eight public-page/navigation checks passed after dashboard/public content refinements.
- Final dashboard smoke: student, teacher and administrator data sections rendered; mobile open/close navigation worked; no horizontal overflow or browser page errors. Screenshots are local QA artifacts, not committed student records.
- Final examination regression: passed after timezone-aware timestamp migration, including nonnegative server-reported exam duration.
- Final account-security regression: passed after revoking all pending reset tokens on password change, including session invalidation and token reuse rejection.

MediaRecorder tests used a synthetic browser microphone source to produce actual WebM bytes. Local private filesystem upload and unauthorized access rejection were exercised; no real microphone capture or live S3 upload was claimed.

## External services

Local mail previews and mocked provider request/error tests passed. The development job dispatcher executed and recorded unconfigured Google Sheets jobs as FAILED. No live Resend delivery, live S3 bucket policy or Google service-account synchronization was verified because credentials were not provided. Production configuration and acceptance steps are in DEPLOYMENT.md.

## Operational checks still required before live enrollment

Configure the managed database and backups, verified email domain, private bucket, private Sheets service account and scheduler. Run live-provider smoke checks, a backup/restore drill, load testing for the intended concurrency and an independent security/accessibility review. Local tests are not a substitute for these deployment-specific checks.

## Reference design update — 2026-11-10

The supplied landing design was converted into a React component with scoped CSS and actual login links, class filters, course dialogs and FAQ controls. Shared branding, fonts, buttons, cards, forms, charts and navigation use the same crimson/navy visual language across Student, Teacher and Admin workspaces. Eight focused Playwright cases passed across desktop and mobile; all 28 existing unit/integration tests passed. The production Next.js build passed in an isolated .next-design-check output directory using the already-generated Prisma client, avoiding replacement of the running application’s locked Windows DLL. No database schema, account password or student record was changed.
