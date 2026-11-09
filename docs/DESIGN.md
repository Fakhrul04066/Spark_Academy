# Spark Academy visual system

The supplied HTML informs the Bengali landing layout and learning illustrations. The latest requested palette is formal Navy Blue, Slate and White throughout the website.

## Palette

- Primary Navy: #16324F; hover #0F243A.
- Workspace background: #F5F7FA; white cards with #E5EBF2 borders.
- Muted blue accent: #315F81; text #17324D.
- Course covers use coordinated, desaturated blue, teal, slate and stone tones.
- Danger and RED/YELLOW/GREEN understanding statuses keep their semantic colors.

## Premium dashboards

Student, Teacher and Admin workspaces share a dark navy sidebar, refined typography, uniform summary cards and role-specific quick-access links. The dashboard includes an academic welcome panel, a performance area chart derived from actual released assessments, upcoming classes, examinations and notifications. Existing results, revision and anonymous Q&A sections remain available. No fabricated improvement percentages or performance history are added.

The dashboard implementation is separated into premium-dashboard.tsx; charts and shared shell components remain reusable. All role permissions, API services, existing accounts and database records are unchanged by the design update.

## Public and authentication pages

Outfit/Hind Siliguri typography, the Bengali reference layout, program filters, course dialogs, FAQ, login and password-reset screens use the same formal palette. Google Fonts have system fallbacks. The phone dashboard illustration is labeled as an illustration. Enrollment actions direct users to their coaching administrator; no unsupported native app, payment or live-session booking is introduced.

## Local validation on Windows

The generated Prisma client is unchanged. To avoid replacing the engine DLL held by a running development server, Next.js can validate a production build into an ignored separate directory:

```powershell
$env:SPARK_BUILD_DIR = '.next-design-check'
npx next build
Remove-Item Env:\SPARK_BUILD_DIR
```

For the standard npm run build command, stop the development server first. Existing database services do not need recreation.
