# Spark Academy visual system

## Current reference direction — 2026-11-10

The public homepage at https://10minuteschool.com/ was reviewed for its current color and typography system. The application now uses a black/dark landing page, white header, green actions, Inter and Anek Bangla typography, gradient Bengali headings and colorful academic tiles. Spark Academy keeps its own name and animated electric-violet/cyan lightning-and-spark logo with a stacked wordmark.

Primary action: #1CAB55. Hover: #149353. Identity accent: #149353. Core text: #111827. Public backgrounds: #050607 / #080A0D. The same fonts, logo assets and green-action styling apply to authentication and the existing premium role dashboards. Learning-status and danger colors remain semantic.

The class filters, course dialogs, FAQ, mobile menu and actual login links are retained. A working public program search filters the existing academic catalog; it does not claim to search private lessons. Existing protected academic services and database records are unchanged.

The displayed phone dashboard is labeled illustrative. Course enrollment still uses the coaching administrator. No unsupported courses, payments, live tutoring or third-party contact details are introduced.

## Validation

Eight desktop/mobile design cases passed, including Student, Teacher and Admin workspaces. Program search, font rendering and course-tile contrast were also checked in a browser. TypeScript and the isolated production Next.js build passed.

For Windows validation while the generated Prisma engine is held by a running app:

```powershell
$env:SPARK_BUILD_DIR = '.next-design-check'
npx next build
Remove-Item Env:\SPARK_BUILD_DIR
```

Stop the development server before the standard npm run build command. The separate output directory is ignored by Git.

## Login, revision, and doubt-image fixes — 2026-11-10

Local sign-in requires PostgreSQL. `npm run dev` now checks the configured database and starts the retained embedded database automatically for the default local address. Existing demo account passwords remain unchanged. An offline database or sign-in rate limit now produces a specific login message instead of an incorrect-password message.

Revision dates are circular, keyboard-accessible checkboxes. No active revisions completed is RED; some completed is YELLOW; all completed is GREEN. Unchecking a date recalculates the light. Dates and completion history stay intact, and changes queue the existing Google Sheets sync. The initial understanding choice still determines the revision schedule.

Students can attach a PNG, JPEG, or WebP image up to 2 MB to an anonymous question, with preview and removal before sending. Images use private storage with ownership checks; only the owner, assigned teachers, and administrators can read an attached image. Natural images may contain identifying information, so the uploader advises avoiding personal details. The additive migration adds `AnonymousQuestion.imageId`; it does not recreate or clear existing records.

The shared logo is now an animated lightning-and-spark mark with electric-violet, cyan and warm-gold accents, with a versioned asset URL and visible logo on the login form.

The electric logo draws lightning arcs and gently charges the central bolt once every 5.6 seconds. Its embedded SVG animation works wherever the shared image is used. Reduced-motion preferences disable animation. Browser checks verified arc visibility during the charge phase, reduced-motion behavior, and the versioned login logo.
