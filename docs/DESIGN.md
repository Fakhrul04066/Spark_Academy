# Reference visual system

The supplied SPARK_Academy_Landing_Demo.html is used as a visual reference. Its document scripts/instructions are not executed. The public layout is implemented as a typed React component with scoped CSS.

## Shared design

- Crimson #CF3048, deep navy #1B2434 and soft pink #FFF0F2.
- Outfit and Hind Siliguri typography, with system fallbacks when Google Fonts is unavailable.
- Bengali landing content, illustrated book/lightbulb hero, class selectors, colored course covers, feature cards, learning steps, a labeled illustrative mobile dashboard, FAQs and the closing call to action.
- The same identity, typography, card/button/form styles, sidebar states and crimson chart accents are used by authentication and all role workspaces.
- Red/yellow/green learning statuses retain their semantic colors.

Login controls open the existing authentication page. Course details explain enrollment through the coaching administrator. There is no fabricated admission submission, payment, native-app download or live-session booking. Existing asynchronous voice Q&A, private feedback, revision, exams and other platform features remain connected to the same backend.

## Safe local build validation

With a development server running on Windows, Prisma may hold its generated engine DLL open. When the schema/client is already generated and unchanged, validate Next.js in a separate output directory without replacing the engine or the active server output:

```powershell
$env:SPARK_BUILD_DIR = '.next-design-check'
npx next build
Remove-Item Env:\SPARK_BUILD_DIR
```

For the standard production command, stop the development server first, then run npm run build. The alternative output directory is ignored by Git.
