"use client";
import Link from "next/link";
import { Eye, EyeOff, Search, ChevronDown } from "lucide-react";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
type Values = { email: string; password: string };
export function LoginView({ register, errors, submit, busy, error, showPassword, toggle }: { register: UseFormRegister<Values>; errors: FieldErrors<Values>; submit: React.FormEventHandler<HTMLFormElement>; busy: boolean; error: string; showPassword: boolean; toggle: () => void }) {
return <div className="spark-login" lang="en">
  <header className="login-header">
    <div className="login-discovery"><Link href="/#courses" className="login-explore">Explore <ChevronDown size={19}/></Link><form className="login-search" action="/" role="search"><Search size={25} aria-hidden="true"/><input name="search" aria-label="Search courses, topics, or subjects" placeholder="Search courses, topics, or subjects"/></form></div>
    <Link href="/" className="login-logo" aria-label="Spark Academy home"><img src="/spark-reference-wordmark.svg" alt="Spark Academy" width="330" height="80"/></Link>
    <nav className="login-nav" aria-label="Account"><Link href="/login" aria-current="page">Log in</Link><Link href="/signup" className="login-nav-signup">Sign up</Link></nav>
  </header>
  <main className="login-main">
    <section className="login-art" aria-label="Ignite your learning journey"><img src="/login-learning-journey.webp" alt="The next generation of learning. Ignite your learning journey. Focused learning, practice, and growth for lasting academic success. An open book with Physics, Chemistry, Biology, Math, and Higher Math floating above it." width="995" height="853"/></section>
    <section className="login-card" aria-labelledby="login-title">
      <h1 id="login-title">Welcome Back</h1>
      {error && <div role="alert" className="error">{error}</div>}
      <form className="login-fields" onSubmit={submit} noValidate>
        <div><label className="sr-only" htmlFor="login-email">Email</label><input id="login-email" className="login-input" placeholder="Email" autoComplete="username" aria-invalid={!!errors.email} aria-describedby={errors.email ? "login-email-error" : undefined} {...register("email")}/>{errors.email && <span id="login-email-error" className="login-field-error">Enter your email or phone number</span>}</div>
        <div><div className="login-password"><label className="sr-only" htmlFor="login-password">Password</label><input id="login-password" className="login-input" type={showPassword ? "text" : "password"} placeholder="Password" autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? "login-password-error" : undefined} {...register("password")}/><button type="button" onClick={toggle} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff/> : <Eye/>}</button></div>{errors.password && <span id="login-password-error" className="login-field-error">Password is required</span>}</div>
        <div className="login-options"><label><input type="checkbox" name="remember"/><span>Remember Me</span></label><Link href="/forgot-password">Forgot password?</Link></div>
        <button type="submit" className="login-submit" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
      </form>
      <p className="login-register">Don’t have an account? <Link href="/signup">Register now</Link></p>
    </section>
  </main>
</div>;
}
