# REST API

Responses: {data,page?,pageSize?} or {error}. Lists accept page (20/page) and q where supported. HTTPS session cookies authenticate browsers and compatible mobile clients; native apps must implement the NextAuth CSRF/cookie flow.

- /api/auth/\*: NextAuth providers, CSRF, credentials callback, session and signout.
- POST /api/password-reset: email, or token + password.
- GET/PATCH /api/profile: own safe profile/editable fields.
- GET /api/catalog: authorized choices.
- /api/students and /api/teachers: scoped GET, admin POST/PATCH.
- /api/batches, /api/subjects, /api/chapters: scoped GET, admin POST/PATCH/DELETE.
- /api/enrollments and /api/assignments: admin GET/POST/DELETE.
- /api/lessons and /api/resources: scoped GET, assigned teacher/admin POST/PATCH/DELETE.
- /api/exams: scoped GET, teacher/admin POST/PATCH/DELETE.
- GET /api/exams/:id: authorized teacher/admin editor data.
- POST /api/exam-attempts/start: {examId}; new/resumed attempt.
- GET /api/exam-attempts/:id: owned attempt, release-filtered result.
- POST /api/exam-attempts/save or /submit: {id,answers:[{questionId,option}]}.
- GET /api/results and /api/progress: released scoped results/progress.
- POST /api/progress: {lessonId,completed}.
- GET/POST /api/attendance: scoped records; {batchId,date,records:[{userId,present}]}.
- /api/routines: scoped GET, admin POST/PATCH/DELETE.
- /api/questions: safe GET, student POST, scoped PATCH report/moderation.
- POST /api/question-replies: assigned teacher/admin text/audio response.
- POST /api/audio: multipart audio; max 3 MB.
- GET /api/audio/:id: authorized private playback URL.
- /api/revision or /api/revision-topics: student GET/POST/PATCH.
- /api/revision-schedules: scoped GET; student PATCH {id} completes own task.
- /api/feedback: own/admin GET, student POST, admin PATCH reply/status.
- /api/notifications: own GET, PATCH {id?} read one/all, admin POST announcement.
- GET /api/dashboard: real stored statistics.
- GET /api/reports or /api/admin/reports: admin audit/integration summaries.
- GET /api/jobs: scheduler bearer secret; revision, notifications and Sheets jobs.

Invalid data: 400; unauthenticated: 401; forbidden: 403; not found: 404; unsupported method: 405; record/concurrency conflict: 409; throttled: 429. Provider unavailable: 503 where surfaced directly. Private responses: no-store.

- POST /api/avatar: private profile image, PNG/JPEG/WebP, maximum 2 MB.
- GET /api/avatar: authorized own image or short-lived S3 redirect.
