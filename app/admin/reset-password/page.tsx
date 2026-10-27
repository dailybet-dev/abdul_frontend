"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, LockKeyhole, Zap, LoaderCircle } from "lucide-react";

export default function ChangeAdminPassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [changed, setChanged] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (newPassword.length < 12) {
      setError("Your new password must contain at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new password and confirmation do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/backend/auth/change-password", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "Could not change your password.");
      setChanged(true);
      setMessage("Your password has been changed and saved securely. For your protection, all administrator sessions have been signed out.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="admin-reset-page">
    <header><Link href="/admin"><span><Zap /></span> ABDUL ICT <small>ADMIN</small></Link><Link href="/admin"><ArrowLeft /> Dashboard</Link></header>
    <section className="admin-reset-card">
      <div className="admin-reset-icon">{changed ? <CheckCircle2 /> : <KeyRound />}</div>
      <span className="admin-auth-kicker">{changed ? "PASSWORD UPDATED" : "ACCOUNT SECURITY"}</span>
      <h1>{changed ? "Password changed" : "Change password"}</h1>
      <p>{changed ? "Your new password is active. Sign in again with your new credentials." : "Confirm your current password and choose a strong new password. It must be at least 12 characters long."}</p>
      {changed ? <><p className="admin-auth-message" role="status">{message}</p><Link className="admin-auth-submit" href="/admin/login">Continue to sign in →</Link></> : <form onSubmit={submit}>
        <label>Current password<div className="admin-auth-input"><LockKeyhole /><input required type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div></label>
        <label>New password<div className="admin-auth-input"><KeyRound /><input required type="password" minLength={12} maxLength={200} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div></label>
        <label>Confirm new password<div className="admin-auth-input"><KeyRound /><input required type="password" minLength={12} maxLength={200} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div></label>
        {error && <p className="admin-auth-message" role="alert">{error}</p>}
        <button className="admin-auth-submit" disabled={loading}>{loading ? <><LoaderCircle className="animate-spin" /> Updating password…</> : "Update password →"}</button>
      </form>}
      {!changed && <small className="admin-reset-note">Changing your password signs out all active administrator sessions.</small>}
    </section>
  </main>;
}
