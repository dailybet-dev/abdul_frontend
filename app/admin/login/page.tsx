"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Zap } from "lucide-react";
import { graphqlRequest } from "@/lib/graphql";

type LoginData = {
  login: { success: boolean; admin: { id: string; email: string; displayName: string } };
};

export default function AdminLogin() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const data = await graphqlRequest<LoginData>(
        `mutation AdminLogin($input: LoginInput!) {
          login(input: $input) {
            success
            admin { id email displayName }
          }
        }`,
        { input: { email: email.trim(), password } },
      );
      if (!data.login.success) {
        setMessage("Unable to sign in. Check your email and password, then try again.");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/admin";
      const destination = next.startsWith("/admin") && !next.startsWith("//") && next !== "/admin/login"
        ? next
        : "/admin";
      window.location.assign(destination);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-auth">
      <header className="admin-auth-brand">
        <Link href="/admin/login"><span><Zap /></span><b>ABDUL ICT <small>ADMIN</small></b></Link>
        <Link href="/"><ArrowLeft size={15} /> Back to website</Link>
      </header>
      <div className="admin-auth-layout">
        <section className="admin-auth-promo">
          <span className="admin-auth-tag"><ShieldCheck size={15} /> SECURE ADMINISTRATION</span>
          <h1>Power your business.<br /><em>Control every</em><br />connection.</h1>
          <p>Your command centre for products, orders, services and customer enquiries — built for the people who keep everything running.</p>
          <div className="admin-tech-visual" aria-hidden="true">
            <div className="admin-tech-orbit admin-tech-orbit-one"></div>
            <div className="admin-tech-orbit admin-tech-orbit-two"></div>
            <div className="admin-tech-grid"></div>
            <div className="admin-tech-camera">
              <div className="admin-camera-mount"></div>
              <div className="admin-camera-body"><div className="admin-camera-top"></div><div className="admin-camera-lens"><span></span></div><i></i><b></b></div>
              <div className="admin-camera-status"><span></span> SYSTEM ONLINE</div>
            </div>
            <div className="admin-tech-scan"></div>
            <span className="admin-tech-node admin-tech-node-a">SECURE / 24·7</span>
            <span className="admin-tech-node admin-tech-node-b">LIVE MONITORING</span>
            <span className="admin-tech-cross admin-tech-cross-a">+</span><span className="admin-tech-cross admin-tech-cross-b">+</span>
          </div>
          <div className="admin-auth-feature"><span><LockKeyhole /></span><div><b>Protected workspace</b><small>Private access for authorised administrators</small></div></div>
          <div className="admin-auth-feature"><span><Zap /></span><div><b>Everything in one place</b><small>Manage your operations with confidence</small></div></div>
        </section>
        <section className="admin-auth-card">
          <div className="admin-auth-card-icon"><LockKeyhole /></div>
          <span className="admin-auth-kicker">WELCOME BACK</span>
          <h2>Sign in to your account</h2>
          <p>Enter your administrator credentials to continue.</p>
          <form onSubmit={submit}>
            <label>Email address <small className="admin-auth-hint">Use your administrator email</small>
              <div className="admin-auth-input"><Mail /><input autoComplete="username" required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email address" autoCapitalize="none" autoCorrect="off" /></div>
            </label>
            <label>Password <small className="admin-auth-hint">Enter your secure password</small>
              <div className="admin-auth-input"><LockKeyhole /><input autoComplete="current-password" required minLength={12} type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" /><button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button></div>
            </label>
            <div className="admin-auth-forgot"><span>Use your administrator account.</span><Link href="/admin/reset-password">Forgot password?</Link></div>
            <button className="admin-auth-submit" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in to dashboard →"}</button>
            {message && <div className="admin-auth-message" role="alert">{message}</div>}
          </form>
          <div className="admin-auth-card-foot"><ShieldCheck /> Never share your administrator password.</div>
        </section>
      </div>
    </main>
  );
}
