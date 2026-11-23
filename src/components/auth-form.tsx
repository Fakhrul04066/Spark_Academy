"use client";
import Link from "next/link";
import { LoginView } from "./login-view";
import { PublicHeader } from "./public-header";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
const schema = z.object({
  email: z.string().trim().min(1, "Enter your email or phone number"),
  password: z.string().min(1).max(128),
});
export function AuthForm({
  mode = "login",
}: {
  mode?: "login" | "forgot" | "reset";
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (!code) return;
    const messages: Record<string, string> = {
      GoogleEmailUnverified: "Use a Google account with a verified email address.",
      GoogleLinkRequired: "This email already has an account. Please sign in with your existing password.",
      AccountInactive: "This account is inactive. Please contact the academy.",
      GoogleUnavailable: "Google sign-in is temporarily unavailable. Please try again or use your password.",
      AccessDenied: "Google sign-in was not completed. Please try again.",
    };
    setError(messages[code] || "Google sign-in could not be completed. Please try again or use your password.");
  }, []);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  async function login(values: z.infer<typeof schema>) {
    setBusy(true);
    setError("");
    try {
      const r = await signIn("credentials", { ...values, redirect: false });
      if (r?.error)
        throw new Error(
          r.error === "DatabaseUnavailable"
            ? "The database is offline. Please start the local database and try again."
            : r.error === "TooManyAttempts"
              ? "Too many sign-in attempts. Please try again later."
              : "Email, phone number or password is incorrect, or the account is inactive.",
        );
      const s = await fetch("/api/profile").then((r) => r.json());
      if (!s.data?.role) throw new Error("Could not load your account");
      window.location.href = "/" + s.data.role.toLowerCase();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }
  async function reset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const token = new URLSearchParams(window.location.search).get("token");
      const r = await fetch("/api/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "forgot"
            ? { email: form.get("email") }
            : { token, password: form.get("password") },
        ),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setSuccess(
        mode === "forgot"
          ? data.data.message
          : "Password updated. You can now sign in.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  if (mode === "login") {
    return (
      <LoginView
        register={register}
        errors={errors}
        submit={handleSubmit(login)}
        busy={busy}
        error={error}
        showPassword={showPassword}
        toggle={() => setShowPassword((visible) => !visible)}
      />
    );
  }

  return (
    <div className="spark-login" lang="en">
      <PublicHeader />
      <main className="site-container recovery-main">
        <section className="login-card recovery-card" aria-labelledby="recovery-title">
        <h1 id="recovery-title">{mode === "forgot" ? "Forgot your password?" : "A fresh start."}</h1>
        <p>Keep your Spark Academy account secure.</p>
        {error && (
          <div role="alert" className="error space">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="success space">
            {success}
          </div>
        )}
        <form className="form" onSubmit={reset}>
          {mode === "forgot" ? (
            <label className="label">
              Email address
              <input
                className="login-input"
                type="email"
                name="email"
                required
                autoComplete="email"
              />
            </label>
          ) : (
            <label className="label">
              New password
              <input
                className="login-input"
                type="password"
                name="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
          )}
          <button className="login-submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "forgot"
                ? "Send reset link"
                : "Update password"}
          </button>
        </form>
        <Link href="/login" className="recovery-back">Back to sign in</Link>
        </section>
      </main>
    </div>
  );
}
