# Spark Academy development checklist

- [x] Phase 1: Next.js/TypeScript, PostgreSQL schema/migrations, NextAuth, RBAC
- [x] Phase 2: landing/auth pages, three dashboards, responsive shared navigation
- [x] Phase 3: accounts, assignments, batches, subjects/chapters, routines, attendance/resources
- [x] Phase 4: teacher YouTube links, timed exams/autosave/grading/release, ranking/progress
- [x] Phase 5: anonymous text/recorded Q&A, private storage adapter, feedback/notifications
- [x] Phase 6: revision schedules/history, Sheets adapter, leased reminder jobs/retries
- [x] Phase 7: automated/browser verification, production build, review and deployment documentation; source prepared for GitHub

## Verification

28 unit/integration tests, 14 desktop/mobile E2E cases, eight focused public/navigation checks, three role dashboard/mobile smoke checks and final exam/account-security regressions passed. Strict TypeScript and production build passed. npm audit reported zero vulnerabilities. Three migrations applied without resetting/deleting student records. Details: docs/VERIFICATION.md.

## External acceptance checks

- [ ] Configure production database/backups and first administrator
- [ ] Live Resend verified domain and actual reminder delivery
- [ ] Live private S3 bucket upload/authorized playback/access-denial test
- [ ] Google Sheets service-account row synchronization
- [ ] Production scheduler execution and monitoring
- [ ] Independent security, accessibility and load review

Local adapters are clearly labeled and disabled in production. No provider success is claimed without configuration. No student data was reset/deleted. Spark Academy branding is used throughout the served application. No live calls, teacher booking or emergency-session feature is served.
