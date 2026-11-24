"use client";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { PublicHeader } from "./public-header";
import { GoogleSignInButton } from "./google-signin-button";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FormEvent } from "react";
import type { z } from "zod";
import { signupDetails } from "@/lib/signup-schema";

type Values = z.infer<typeof signupDetails>;

async function requestSignup(body: Record<string, string>) {
  const response = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || "Signup is temporarily unavailable.");
  }
}

export function SignupView() {
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [pending, setPending] = useState<Values | null>(null);
  const [code, setCode] = useState("");
  const {register, handleSubmit, reset, formState:{errors}} = useForm<Values>({resolver:zodResolver(signupDetails)});

  async function sendCode(values: Values) {
    setBusy(true);
    setError("");
    try {
      await requestSignup({ action: "send", email: values.email });
      setPending(values);
      setShowPassword(false);
      setCode("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not send the verification code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending || busy || created || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    setError("");
    try {
      await requestSignup({ action: "verify", ...pending, code });
      setCreated(true);
      setPending(null);
      reset();
      const login = await signIn("credentials", { email: pending.email, password: pending.password, redirect: false });
      if (login && !login.error) window.location.assign("/student");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not verify the code.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="spark-login spark-signup" lang="en">
    <PublicHeader />
    <main className="signup-main">
      <section className="signup-art" aria-label="Ignite your learning journey"><img src="/signup-learning-journey.webp" alt="The next generation of learning. Ignite your learning journey. Focused learning, practice, and growth for lasting academic success. Physics, Chemistry, Biology, Math and Higher Math rise from an open book." width="600" height="1006"/></section>
      <section className="signup-card" aria-labelledby="signup-title">
        <Link href="/login" className="signup-back"><ArrowLeft size={20}/> Back to Login</Link>
        <h1 id="signup-title">{created ? "Account created" : pending ? "Verify your email" : "Create Your Account"}</h1>
        <p className="signup-intro">{created ? "Your email is verified. You can now log in." : pending ? `Enter the six-digit code sent to ${pending.email}. It expires in 10 minutes.` : "Register now to explore more on Spark Academy."}</p>
        {error && <p className="signup-error" role="alert">{error}</p>}
        {pending && <form className="signup-fields" onSubmit={verifyCode}>
          <div className="signup-field">
            <label htmlFor="signup-code">Verification code</label>
            <input id="signup-code" className="signup-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
          </div>
          <button className="signup-submit" disabled={busy || code.length !== 6}>{busy ? "Please wait…" : "Verify and create account"}</button>
          <button type="button" disabled={busy} onClick={() => void sendCode(pending)}>Resend code</button>
          <button type="button" disabled={busy} onClick={() => { setPending(null); setError(""); }}>Change email</button>
        </form>}
        {!pending && !created && <form className="signup-fields" onSubmit={handleSubmit(sendCode)} noValidate>
          {([{key:"name",label:"Full Name",placeholder:"Enter your full name",type:"text",autoComplete:"name"},{key:"email",label:"Email Address",placeholder:"Enter your email address",type:"email",autoComplete:"email"},{key:"phone",label:"Mobile Number",placeholder:"Enter your mobile number",type:"tel",autoComplete:"tel"},{key:"password",label:"Password",placeholder:"Create a password",type:showPassword ? "text" : "password",autoComplete:"new-password"}] as const).map(field=><div className="signup-field" key={field.key}>
            <label htmlFor={`signup-${field.key}`}>{field.label}</label>
            <div className={field.key === "password" ? "login-password" : undefined}>
              <input id={`signup-${field.key}`} type={field.type} className="signup-input" placeholder={field.placeholder} autoComplete={field.autoComplete} aria-invalid={!!errors[field.key]} aria-describedby={errors[field.key] ? `signup-${field.key}-error` : field.key === "password" ? "signup-password-hint" : undefined} {...register(field.key)}/>
              {field.key === "password" && <button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff/> : <Eye/>}</button>}
            </div>
            {errors[field.key] && <span className="signup-error" id={`signup-${field.key}-error`}>{errors[field.key]?.message}</span>}
          </div>)}
          <span id="signup-password-hint" className="signup-hint">Use at least 8 characters for your password.</span>
          <button className="signup-submit" disabled={busy}>{busy ? "Sending code…" : "Send verification code"}</button>
        </form>}
        {!pending && !created && <GoogleSignInButton disabled={busy} />}
        <p className="signup-footer"><span>Already have an account? <Link href="/login">Log in</Link></span></p>
      </section>
    </main>
  </div>;
}
