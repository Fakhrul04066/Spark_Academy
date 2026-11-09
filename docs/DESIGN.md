# Spark Academy visual system

## Current reference direction — 2026-11-10

The public homepage at https://10minuteschool.com/ was reviewed for its current color and typography system. The application now uses a black/dark landing page, white header, green actions, Inter and Anek Bangla typography, gradient Bengali headings and colorful academic tiles. Spark Academy keeps its own name and original red education/play logo with a stacked wordmark.

Primary action: #1CAB55. Hover: #149353. Identity accent: #ED1C24. Core text: #111827. Public backgrounds: #050607 / #080A0D. The same fonts, logo assets and green-action styling apply to authentication and the existing premium role dashboards. Learning-status and danger colors remain semantic.

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
