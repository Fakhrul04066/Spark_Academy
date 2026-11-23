"use client";

import { getProviders, signIn } from "next-auth/react";
import { useState } from "react";

export function GoogleSignInButton({ disabled = false }: { disabled?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <div className="google-signin">
    <div className="auth-divider"><span>or</span></div>
    <button type="button" className="google-signin-button" disabled={disabled || pending} onClick={async () => {
      if (pending) return;
      setPending(true); setError("");
      try {
        const providers = await getProviders();
        if (!providers?.google) throw new Error("Google sign-in is being set up. Please use email and password for now.");
        await signIn("google", { callbackUrl: "/auth/continue" });
      } catch (error) {
        setError(error instanceof Error ? error.message : "Google sign-in could not start. Please try again.");
        setPending(false);
      }
    }}>
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.17 7.09-10.33 7.09-17.65Z"/><path fill="#FBBC05" d="M10.53 28.59a14.41 14.41 0 0 1 0-9.18l-7.98-6.19A23.86 23.86 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
      {pending ? "Connecting to Google…" : "Continue with Google"}
    </button>
    {error && <p className="google-signin-error" role="alert">{error}</p>}
  </div>;
}
