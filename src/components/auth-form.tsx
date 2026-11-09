"use client";
import Link from "next/link";
import { Brand } from "./brand";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
const schema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});
export function AuthForm({
  mode = "login",
}: {
  mode?: "login" | "forgot" | "reset";
}) {
  const [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
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
              : "Email or password is incorrect, or the account is inactive.",
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
  return (
    <div className="auth-shell" lang="en">
      <aside className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h1>
            A little spark.
            <br />A lifetime of
            <br />
            <span style={{ color: "#c0d3e3" }}>possibilities.</span>
          </h1>
          <p>
            A focused space to learn, practice and become a little better every
            day.
          </p>
        </div>
        <p className="footnote">© Spark Academy. All rights reserved.</p>
      </aside>
      <main className="auth-form">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <Link href="/" className="eyebrow mb-8">
          ← BACK TO SPARK ACADEMY
        </Link>
        <h2>
          {mode === "login"
            ? "Welcome back."
            : mode === "forgot"
              ? "Forgot your password?"
              : "A fresh start."}
        </h2>
        <p>
          {mode === "login"
            ? "Sign in to your learning space."
            : "Keep your Spark Academy account secure."}
        </p>
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
        {mode === "login" ? (
          <form className="form" onSubmit={handleSubmit(login)}>
            <label className="label">
              Email address
              <input
                className="input"
                type="email"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <span className="text-red-700">Enter a valid email</span>
              )}
            </label>
            <label className="label">
              Password
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <span className="text-red-700">Password is required</span>
              )}
            </label>
            <Link className="text-slate-700 text-xs" href="/forgot-password">
              Forgot password?
            </Link>
            <button className="btn" disabled={busy}>
              {busy ? "Signing in…" : "Sign in →"}
            </button>
            <p className="footnote">
              Your coaching administrator provides your account. Contact them if
              you need access.
            </p>
          </form>
        ) : (
          <form className="form" onSubmit={reset}>
            {mode === "forgot" ? (
              <label className="label">
                Email address
                <input
                  className="input"
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
                  className="input"
                  type="password"
                  name="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
            )}
            <button className="btn" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Update password"}
            </button>
            <Link href="/login" className="text-slate-700">
              Back to sign in
            </Link>
          </form>
        )}
      </main>
    </div>
  );
}
