"use client";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Eye, EyeOff, Search } from "lucide-react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
const schema = z.object({
  name: z.string().trim().min(1, "Enter your full name").max(100),
  email: z.email("Enter a valid email address").trim(),
  phone: z.string().trim().transform(v => { const number = v.replace(/[\s()-]/g, "").replace(/^\+?880/, "0"); return number.startsWith("1") ? "0" + number : number; }).refine(v => /^01[3-9]\d{8}$/.test(v), "Enter a valid Bangladesh mobile number"),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});
type Values = z.infer<typeof schema>;
export function SignupView() {
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const {register, handleSubmit, formState:{errors}} = useForm<Values>({resolver:zodResolver(schema)});
  async function submit(values:Values) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/signup", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const result = await response.json();
      if(!response.ok) throw new Error(result.error || "Could not create your account. Please try again.");
      setCreated(true);
      const login = await signIn("credentials", {email:values.email,password:values.password,redirect:false});
      if(!login || login.error) throw new Error("Your account was created. Please log in to continue.");
      window.location.assign("/student");
    } catch(e) { setError(e instanceof Error ? e.message : "Could not create your account. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="spark-login spark-signup" lang="en">
    <header className="login-header">
      <div className="login-discovery"><Link href="/#courses" className="login-explore">Explore <ChevronDown size={17}/></Link><form className="login-search" action="/" role="search"><Search size={21} aria-hidden="true"/><input name="search" aria-label="Search courses, topics, or subjects" placeholder="Search courses, topics, or subjects"/></form></div>
      <Link href="/" className="login-logo" aria-label="Spark Academy home"><img src="/spark-reference-wordmark.svg" alt="Spark Academy" width="330" height="80"/></Link>
    </header>
    <main className="signup-main">
      <section className="signup-art" aria-label="Ignite your learning journey"><img src="/signup-learning-journey.webp" alt="The next generation of learning. Ignite your learning journey. Focused learning, practice, and growth for lasting academic success. Physics, Chemistry, Biology, Math and Higher Math rise from an open book." width="600" height="1006"/></section>
      <section className="signup-card" aria-labelledby="signup-title">
        <Link href="/login" className="signup-back"><ArrowLeft size={20}/> Back to Login</Link>
        <h1 id="signup-title">Create Your Account</h1>
        <p className="signup-intro">Register now to explore more on Spark Academy.</p>
        {error && <p className="signup-error" role="alert">{error}</p>}
        <form className="signup-fields" onSubmit={handleSubmit(submit)} noValidate>
          {([{key:"name",label:"Full Name",placeholder:"Enter your full name",type:"text",autoComplete:"name"},{key:"email",label:"Email Address",placeholder:"Enter your email address",type:"email",autoComplete:"email"},{key:"phone",label:"Mobile Number",placeholder:"Enter your mobile number",type:"tel",autoComplete:"tel"},{key:"password",label:"Password",placeholder:"Create a password",type:showPassword ? "text" : "password",autoComplete:"new-password"}] as const).map(field=><div className="signup-field" key={field.key}>
            <label htmlFor={`signup-${field.key}`}>{field.label}</label>
            <div className={field.key === "password" ? "login-password" : undefined}>
              <input id={`signup-${field.key}`} type={field.type} className="signup-input" placeholder={field.placeholder} autoComplete={field.autoComplete} aria-invalid={!!errors[field.key]} aria-describedby={errors[field.key] ? `signup-${field.key}-error` : field.key === "password" ? "signup-password-hint" : undefined} {...register(field.key)}/>
              {field.key === "password" && <button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff/> : <Eye/>}</button>}
            </div>
            {errors[field.key] && <span className="signup-error" id={`signup-${field.key}-error`}>{errors[field.key]?.message}</span>}
          </div>)}
          <span id="signup-password-hint" className="signup-hint">Use at least 8 characters for your password.</span>
          <button className="signup-submit" disabled={busy || created}>{busy ? "Creating account…" : created ? "Account created" : "Create Account"}</button>
        </form>
        <p className="signup-footer"><span>Already have an account? <Link href="/login">Log in</Link></span></p>
      </section>
    </main>
  </div>;
}
