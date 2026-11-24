# Spark Academy landing polish

## Current user adjustment

The latest screenshot request restores the lower `#features` section to its original six cards, icons, wording and 3×2 desktop layout, including Smart Attendance and Private Teacher Feedback in that section. Only that section was replaced from the checkpoint; the four-card hero orbit and current approved colors remain.

The user requested the original content, fonts, spacing, layout and links back, keeping only the new colors. Those non-color changes below have been reverted to the original checkpoint, including the statistics `6–12`, `3`, `24/7`, `100%` and their English labels, the original Join Spark/Explore all courses links, icons and heading weights. Only the approved palette remains from the visual polish. The earlier requested removal of attendance/private-feedback marketing and the four matching feature/course animations remain in place. The ordered pass notes below describe the earlier iteration, not the current typography or copy.

Branch: `codex/unslop-landing-polish`. The original landing source was checkpointed before editing so the changes can be reviewed with `git diff 9dc3510 -- spark-academy/src/components` from the workspace root.

## Sources and method

Method adapted from **Unslop by Damir Sokolovsky (@heydamir)**, licensed **CC BY 4.0**: https://github.com/heydamir/unslop. Official instructions: https://github.com/heydamir/unslop/blob/main/skills/unslop/SKILL.md. Author credit is retained here and beside the stylesheet changes.

The official README and skill were checked before use. Repowise and HDATF describe the project independently; they are not official maintainer documentation. Installation used the Codex skill-installer helper, not the Claude plugin marketplace. No existing Claude skills were removed.

## Direction and audit

- Product: SSC and HSC science learning, chapter tests, results and questions for teachers.
- Character: helpful, clear, confident.
- World: classroom notes and study materials.
- Moments: the existing Spark logo/bolt and the course/feature cards.
- Signature: class numbers and specific chapter-based learning information.

Use the existing brand as the direction. Retain the requested three-column hero and circular animation rather than replacing them with a new hero composition. Findings: widely tracked uppercase labels, heavy headings, competing colored course covers, emoji decoration, duplicate hero chips, generic promotional copy, conflicting class coverage, and attendance/feedback claims throughout the landing page.

## Ordered passes

1. **Spacing:** 80px section spacing on desktop, 48px on mobile; 24px card padding/gaps, 20px padding and 16px gaps on small screens. Hero card dimensions and its 385px stages stay intact.
2. **Color:** quieter ink-tinted surfaces, one course-cover color and subdued borders/shadows. Keep the established Spark brand artwork and the light-blue hero panels.
3. **Icons:** replace decorative emoji and miscellaneous control glyphs with consistent inline line SVGs. Keep the existing four feature illustrations as product content; remove the two illustrations for retired landing features.
4. **Copy:** use direct student-facing Bengali, concrete course descriptions and clearer calls to action. Remove unsupported-looking 24/7 and 100% promotional metrics; use the actual four feature types, three question formats and three revision states. Correct class coverage to 9–12.
5. **Type:** reduce section headings to weight 500 and a 28–40px responsive scale; use sentence-case labels without tracking. Preserve existing type families and the branded wordmark.
6. **Layout:** preserve section order and the three-column desktop hero. Four remaining feature details use a 2×2 grid and a single column on mobile. Login is visually secondary to enrollment.
7. **Details:** consistent 16px content-card radii, 10px action radius and visible keyboard focus. The forthcoming app is presented as a quiet status rather than a glowing call to action.
8. **Visuals:** retain the existing product-specific artwork and clearly labeled illustrative app preview. Replace its attendance tile with a revision status. No new generated image, paid generation service or prompt was needed.
9. **Motion:** remove no requested card motion. Both orbits now contain four cards and share direction `+1`, speed `0.12 rad/s`, radius formula, depth scaling, spring, inertia, opacity and layering. Existing reduced-motion, focus, hover and offscreen handling remain. No button-click animations were added.

## Requested removals

Smart Attendance and Private Teacher Feedback were removed from the hero cards, detailed features, about copy, app list, app mockup, FAQ, footer and course dialog description. This is a marketing-page change; it does not delete accounts, records or application modules.

## Review and validation

Validated desktop and mobile screenshots, course filtering, course dialog, FAQ, keyboard navigation, four feature cards, matching circular transforms/direction, native mobile swipe, reduced motion and horizontal overflow. Hero stage/card sizes match the pinned GitHub fixture. All 12 local browser checks passed. The Vercel production build succeeded; all six anonymous public-URL checks passed, and the public page returned HTTP 200. Live result: https://spark-academy-pied.vercel.app/?v=unslop-four-features.

Remaining follow-up: the legacy stylesheet contains many historical overrides. Consolidating it should be a separate task with visual regression checks, rather than being mixed into this polish pass. Existing branded gradient artwork and explicitly requested looping card motion are intentional exceptions to the generic Unslop checklist.
