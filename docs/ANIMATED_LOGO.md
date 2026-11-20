# Spark Academy animated logo

The logo uses the existing Next.js / React / TypeScript stack with inline SVG and CSS keyframes. No animation dependency is added. The icon, SPARK lettering and ACADEMY lettering animate independently and share a synchronized strike state.

## Integration

`src/components/brand.tsx` delegates to `SparkAcademyLogo`, so the existing public navbar, mobile navigation, authentication pages and dashboard sidebar use the same component. The landing footer supplies `variant="footer" theme="dark"`. `src/app/loading.tsx` uses the centered, one-time loader variant. Static SVG exports supply the favicon and downloadable wordmark.

```tsx
<SparkAcademyLogo size="small" />
<SparkAcademyLogo size="medium" animated variant="navbar" />
<SparkAcademyLogo size="large" variant="loader" />
<SparkAcademyLogo variant="footer" theme="dark" />
<SparkAcademyLogo animated={false} />
```

Sizes: small, medium, large. Variants: navbar, loader, footer. Themes: auto, light, dark. Auto adapts to the existing sidebar, authentication panel and dark footer. The navbar/footer render a homepage link with the single accessible name "Spark Academy". The loader is an image within an announced loading status.

## Animation

An icon entrance starts immediately, SPARK letters enter from 400 ms, and ACADEMY letters enter from 850 ms. Clouds drift, the bolt breathes gently, particles fade and a reflection crosses the icon. A single soft lightning pulse runs at irregular 6–12 second intervals; it synchronizes the icon, both words and their electric underlines. Desktop pointer entry triggers the same 720 ms pulse without restarting letter entrances. The loader does not schedule repeated strikes.

Document visibility changes pause CSS animations and clear pending strike timers. Returning to a visible tab schedules a fresh interval. Reduced-motion users receive a static, readable logo with no strikes or hover motion. `animated={false}` disables both CSS motion and JavaScript scheduling. Event listeners and timers are removed on unmount. The SVG and full text are server-rendered and remain available without JavaScript.

## Customize

- Timing: edit `STRIKE_MIN_DELAY_MS`, `STRIKE_JITTER_MS`, and `STRIKE_DURATION_MS` in `SparkAcademyLogo.tsx`. Keep the corresponding `.72s` strike keyframes in the CSS aligned with the duration. The interval excludes the active pulse duration, giving 6–12 seconds between strike starts.
- Idle speed: override `--sa-idle-duration` on `.sa-logo` (default `12s`). Individual bolt, particle and sheen durations are also named in the CSS.
- Colors: change `--sa-blue`, `--sa-royal`, `--sa-purple`, `--sa-academy`, and `--sa-glow` in `SparkAcademyLogo.css`; change SVG sky, bolt, cloud and book stops in `LightningIcon.tsx` for the icon. Dark-theme values are scoped separately. Defaults follow the supplied navy/electric-blue/purple brief.
- Static usage: pass `animated={false}`. Use the static SVG assets for contexts that cannot run component animations.

The work follows the written logo reference: navy rounded icon, electric-blue bolt, purple storm clouds, open book, blue-to-purple SPARK and navy ACADEMY. No separate generated reference image accompanied this request.

## Verification

Run `node scripts/verify-branding.mjs` against the local app for Chrome, Edge and Firefox, or pass `edge firefox` to select browsers. Install the required Playwright browsers/channels first. This checks computed sizes, synchronized hover, visibility pause, reduced motion, mobile layout, footer and routing. External font CSS is stubbed only for these checks. Run `npm test -- tests/branding.test.tsx` for the three component tests.
