# Supplied landing-page update — 2026-11-11

The homepage now follows the user-provided `Spark_Academy_Landing_Mobile_Circle_Fixed.html`: light/navy/teal surfaces, a central electric hero and circular course/features panels. The reviewed static markup is stored in `reference-markup.ts`; styles are scoped to `.spark-landing`. Reference scripts are replaced by lifecycle-managed event handlers and carousel logic in `reference-interactions.js`. No runtime user input is inserted as HTML. Existing login links continue to `/login`.

The original 0.40 rad/s orbit is now 0.12 rad/s (approximately 52 seconds per revolution, over three times slower). Hover, keyboard focus and pause controls stop automatic rotation. Previous/next and horizontal dragging remain available; vertical mobile scrolling remains usable. Reduced-motion preferences disable automatic rotation. Listeners, observers and frames are cleaned up when the page unmounts; offscreen/hidden-page work is paused.

FAQ questions use dark navy text on white/light-blue cards; answers use slate text on white. Measured FAQ contrast is about 13.08:1 for an open question and 7.95:1 for its answer. Headings, body text, program covers, tags, muted labels, phone-preview text, CTA and footer colors are adjusted for readability. Existing backend, account and database code is unchanged.

The FAQ now says "QnA কি সরাসরি কল?". Circular motion uses transform-only GPU positioning on desktop and mobile, cached geometry, frame-rate-independent velocity easing, critically damped manual navigation, and fewer redundant style/class writes. CSS transitions no longer compete with per-frame transforms.

On phones and tablets up to 1120px, the two panels now use native horizontal scroll-snap cards rather than 3D orbits. Cards advance every six seconds while visible, with swipe, previous/next, pause, keyboard and reduced-motion support. Resizing between phone and desktop tears down the old controls, observers and timers before mounting the appropriate layout. Desktop circular motion is retained.
