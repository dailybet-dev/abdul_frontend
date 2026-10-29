"use client";

import { useEffect, useState } from "react";
import { LockKeyhole, Save, ShieldCheck, LoaderCircle } from "lucide-react";
import { graphqlRequest } from "@/lib/graphql";
import AdminPageShell from "../admin-page-shell";

type AdminProfile = { id: string; displayName: string; email: string };

export default function AdminProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    graphqlRequest<{ adminMe: AdminProfile }>(
      `query AdminMe { adminMe { id displayName email } }`,
    ).then(data => {
      if (active) {
        setName(data.adminMe.displayName || "Administrator");
        setEmail(data.adminMe.email || "");
      }
    }).catch(e => {
      if (active) setError(e instanceof Error ? e.message : "Unable to load profile. Please sign in again.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMsg("");
    setError("");
    setSaving(true);
    try {
      const data = await graphqlRequest<{ updateAdminProfile: AdminProfile }>(
        `mutation UpdateAdminProfile($input: UpdateProfileInput!) {
          updateAdminProfile(input: $input) { id displayName email }
        }`,
        { input: { displayName: name.trim(), email: email.trim() } },
      );
      setName(data.updateAdminProfile.displayName);
      setEmail(data.updateAdminProfile.email);
      setMsg("Your profile has been updated and saved to the database.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save profile changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPageShell active="Profile" title="My profile" subtitle="Manage your administrator details and account security.">
      <section className="admin-settings-card">
        <div className="admin-settings-card-head"><span><ShieldCheck /></span><div><h2>Personal information</h2><p>Update the name and email associated with your account.</p></div></div>
        <div className="admin-profile-avatar">{(name.trim()[0] || "A").toUpperCase()}</div>
        <form onSubmit={save}>
          <label>Full name<input required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} disabled={loading || saving} /></label>
          <label>Email address<input required type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={loading || saving} /></label>
          <button className="admin-settings-primary" disabled={loading || saving}>{saving ? <LoaderCircle className="animate-spin" /> : <Save />} {saving ? "Saving..." : "Save changes"}</button>
        </form>
        {loading && <p className="admin-auth-message">Loading your profile…</p>}
        {error && <p className="admin-auth-message" role="alert">{error}</p>}
        {msg && <p className="admin-auth-message" role="status">{msg}</p>}
      </section>
      <section className="admin-settings-card"><div className="admin-settings-card-head"><span><LockKeyhole /></span><div><h2>Account security</h2><p>Keep your administrator account protected.</p></div></div><div className="admin-security-row"><span><b>Password</b><small>Change your password using your current password.</small></span><a href="/admin/reset-password">Change password →</a></div></section>
    </AdminPageShell>
  );
}
