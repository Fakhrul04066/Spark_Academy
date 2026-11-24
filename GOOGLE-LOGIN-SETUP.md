# Google login setup

The application uses NextAuth's Google OpenID Connect provider with state and PKCE checks. New verified Google identities create a STUDENT in PostgreSQL using their Google display name. Repeat logins use Google's stable subject ID. Existing active Gmail/Google Workspace students can use the same account; teacher/admin accounts continue using their existing password unless explicitly linked separately. Google sign-in grants no course enrollment or paid Q&A access.

1. Open https://console.cloud.google.com/ and create/select the Spark Academy project.
2. In **Google Auth Platform → Branding**, set the application name, user support email and developer contact email.
3. In **Audience**, choose External. This application requests only `openid email profile`; Google's basic identity exception allows sign-in without adding test users, even while Testing. If other scopes are added later, review Google's testing and verification requirements before enabling them. Publish the OAuth app when it is ready for public use.
4. In **Clients**, create a **Web application** client. Register these authorized redirect URIs exactly:

   ```text
   http://127.0.0.1:3010/api/auth/callback/google
   http://localhost:3010/api/auth/callback/google
   https://spark-academy-pied.vercel.app/api/auth/callback/google
   ```

   If origins are requested, use the corresponding origin without the callback path. The callback must match the origin in NEXTAUTH_URL. Register any future custom domain separately.

5. Add the generated values to the local `.env` file, then restart Next.js:

   ```dotenv
   GOOGLE_CLIENT_ID="your-web-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

   Keep these values out of Git and chat. The keys must stay server-side, without a NEXT_PUBLIC_ prefix.
6. For a future Vercel deployment, add the same keys to that project's Production environment and set NEXTAUTH_URL to the production origin. Apply the pending Prisma migrations to the production database before deploying. Deployment still requires the user's existing approval.
7. Test using Continue with Google: the consent screen should return to `/auth/continue`, then `/student`. Verify the new student name/email in admin Student management and confirm a second login uses the same account. Until credentials exist, the button explains that Google sign-in is being set up; email/password login remains available.

References: [Google OAuth client setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [NextAuth Google provider](https://next-auth.js.org/providers/google), [Google email authority and subject IDs](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
