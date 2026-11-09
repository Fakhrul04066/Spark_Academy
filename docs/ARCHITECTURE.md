# Architecture and security

Request flow: Browser -> Next.js Route Handler -> authenticated actor -> authorization -> Zod validation -> domain service -> Prisma -> PostgreSQL.

NextAuth Credentials checks bcrypt hashes. The encrypted HTTP-only session cookie contains user ID/session version, not provider credentials. Production HTTPS uses secure cookies. Every protected route loads an active database user and compares session version. Deactivation and password reset invalidate existing sessions. NextAuth handles authentication CSRF. Application writes require same-origin requests; private reads are authenticated/no-store. Login/reset throttles and write budgets are shared in PostgreSQL.

Reset tokens: 32 random bytes, stored as SHA-256 digests, expire after one hour, consumed atomically. Passwords require 12–128 characters for creation/reset, bcrypt cost 12. User/provider secrets are never sent as API entities.

## Boundaries

Students access enrolled batches and their own private data. Teachers access assigned batch/subject pairs for lessons/exams/resources/Q&A; assigned-batch attendance rosters expose limited names/student IDs. Admin alone controls accounts/assignments and private feedback review. Feedback is visible only to its student and admins. Foreign keys prevent unsafe deletion of academic history.

Q&A uses an explicit response allowlist excluding account IDs, names, emails, phones and profiles. Admin moderation may access underlying identity references. Audio IDs are random resource references; storage keys contain no account IDs. Playback requires authorization. A signed S3 link can be shared during its 120-second lifetime. Profile hiding cannot guarantee natural voice anonymity.

## Rules

Exam instants are UTC, displayed in Dhaka time. Start/resume is serialized. Answers received after deadline are ignored; previously saved answers are graded. Refresh finalizes expired attempts. Scores/correct options are absent before release. Questions cannot be edited after any attempt starts; publication can be toggled. Existing attempts remain usable by their owner.

Ranks use the BEST released attempt per eligible student with competition ties (1,1,3). An attempt card displays that attempt's score and the learner's best-attempt position. Other students' private contacts are never in a leaderboard.

Progress is explicit marking, not automatic YouTube watch detection. Chapters complete when all assigned lessons are complete. Empty denominators give 0%. Attendance has unique batch/date and session/student constraints.

Routine conflicts for teacher or batch use serializable transactions. Routines are dated entries; recurring classes are separate entries.

Revision RED offsets: 1,2,4,7,21; YELLOW: 1,4,7; GREEN: none. Initial schedules start from learning date. Status changes restart from the Dhaka date of change. Completed tasks remain; obsolete pending tasks cancel. Same-status saves do nothing. Topic/version/date uniqueness prevents duplicate schedules.

## Integration limitations

Environment-only provider secrets. Local private storage and mail preview adapters are development-only. Failed external operations stay FAILED, not successful. Persistent claims and retries are observable in admin reports. Resend idempotency windows are finite: after an ambiguous prolonged outage, inspect provider logs before retrying exhausted jobs. Sheets does lookup/update/append by topic ID; reconciliation is repeatable but not a distributed database transaction.

The recorder limits 120 seconds and server limits 3 MB plus MIME/signature checks. Server-side media transcoding/scanning is not included. Public resource links are HTTPS; the application does not fetch them server-side.

Production backup/restore, 1,000-user load test, independent security review, real email delivery, real bucket-policy and service-account tests require a configured deployment. Local tests are not proof of these operational checks.

Weak topics use the latest released chapter result below 60%; subject averages use released attempts. Staff overview charts show exam averages, while student charts show explicit lesson completion. Scheduled jobs also finalize expired attempts and catch up pending overdue reminders. Sheets topic leases prevent concurrent version jobs from appending the same new topic at once.

All instant timestamps use PostgreSQL TIMESTAMPTZ(3), so database session timezone cannot shift defaults such as exam start time. The timezone migration treats previously stored naive values as UTC and does not remove rows. Revision/attendance calendar dates remain Dhaka date strings.

Schema consolidation: role-specific profile and guardian fields are one-to-one User attributes; scored results are stored on ExamAttempt; revision completion history is stored on RevisionSchedule. PasswordReset and RateLimit are additional security models. A password change consumes every pending reset token for that user and invalidates previous sessions.
