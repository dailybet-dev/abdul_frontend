"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, Boxes, BriefcaseBusiness, ChevronDown, ChevronRight, Contact,
  GraduationCap, Image, LayoutDashboard, LogOut, Mail, Menu, MessageSquare,
  Package, Search, Settings, ShieldCheck, ShoppingCart, Tags, UserRound, X, Zap,
} from "lucide-react";
import { graphqlRequest } from "@/lib/graphql";

type Props = {
  active: "Profile" | "Change Password";
  title: string;
  subtitle: string;
  children: ReactNode;
};

const menu = [
  ["Overview", LayoutDashboard],
  ["Products", Package],
  ["Categories", Boxes],
  ["Subcategories", Tags],
  ["Brands", ShieldCheck],
  ["Orders", ShoppingCart],
  ["Services", BriefcaseBusiness],
  ["Homepage carousel", Image],
  ["Contact submissions", Contact],
  ["Newsletter", Mail],
  ["Training enquiries", GraduationCap],
  ["Settings", Settings],
] as const;

export default function AdminPageShell({ active, title, subtitle, children }: Props) {
  const [mobile, setMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminName, setAdminName] = useState("Administrator");
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    let mounted = true;
    graphqlRequest<{ adminMe: { displayName: string; email: string } }>(
      `query AdminMe { adminMe { displayName email } }`,
    ).then(({ adminMe }) => {
      if (mounted) {
        setAdminName(adminMe.displayName || "Administrator");
        setAdminEmail(adminMe.email || "");
      }
    }).catch(() => {
      // The page remains usable; middleware protects these routes.
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="admin-shell">
      <aside className={"ad-sidebar " + (mobile ? "open" : "")}>
        <div className="ad-brand">
          <span className="ad-brand-mark"><Zap /></span>
          <div><b>ABDUL ICT</b><small>ADMIN CONSOLE</small></div>
          <button className="ad-close-mobile" onClick={() => setMobile(false)} aria-label="Close sidebar"><X /></button>
        </div>
        <div className="ad-nav-label">WORKSPACE</div>
        <nav className="ad-nav" aria-label="Admin navigation">
          {menu.map(([label, Icon]) => (
            <Link key={label} href={label === "Overview" ? "/admin" : `/admin?section=${encodeURIComponent(label)}`} className="ad-nav-item" onClick={() => setMobile(false)}>
              <Icon size={18} /><span>{label}</span><ChevronRight size={14} />
            </Link>
          ))}
        </nav>
        <div className="ad-sidebar-bottom">
          <div className="ad-help"><ShieldCheck /><b>Need a hand?</b><p>Manage your store with confidence.</p><Link href="/contact">Contact support →</Link></div>
          <Link href="/admin/profile" className="ad-profile-link">
            <span className="ad-avatar">{(adminName.trim()[0] || "A").toUpperCase()}</span>
            <span><b>{adminName}</b><small>Manage profile</small></span>
          </Link>
          <Link href="/admin/login?logout=1" className="ad-signout"><LogOut size={15} /> Sign out</Link>
        </div>
      </aside>
      {mobile && <button className="ad-sidebar-scrim" onClick={() => setMobile(false)} aria-label="Close menu" />}
      <main className="ad-main">
        <header className="ad-topbar">
          <button className="ad-menu-btn" onClick={() => setMobile(true)} aria-label="Open admin menu"><Menu /></button>
          <div className="ad-breadcrumb"><Link href="/admin">Workspace</Link><ChevronRight size={14} /><b>{active}</b></div>
          <div className="ad-top-actions">
            <Link href="/" className="ad-view-site">View website ↗</Link>
            <div className="ad-user-menu">
              <button className={"ad-user-trigger " + (profileOpen ? "is-open" : "")} aria-label="Open account menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(v => !v)}>
                <span className="ad-user-icon"><UserRound size={18} /></span><span className="ad-user-name">{adminName}</span><ChevronDown size={14} />
              </button>
              {profileOpen && <>
                <button className="ad-user-dismiss" aria-label="Close account menu" onClick={() => setProfileOpen(false)} />
                <div className="ad-user-dropdown">
                  <div className="ad-user-dropdown-head"><span className="ad-user-icon"><UserRound size={18} /></span><span><b>{adminName}</b><small>{adminEmail || "Admin account"}</small></span></div>
                  <Link href="/admin/profile" onClick={() => setProfileOpen(false)}><UserRound size={16} /> My Profile</Link>
                  <Link href="/admin/reset-password" onClick={() => setProfileOpen(false)}><ShieldCheck size={16} /> Change Password</Link>
                  <Link className="logout" href="/admin/login?logout=1" onClick={() => setProfileOpen(false)}><LogOut size={16} /> Logout</Link>
                </div>
              </>}
            </div>
          </div>
        </header>
        <div className="ad-content">
          <div className="ad-page-heading"><div><div className="ad-eyebrow"><Activity size={12} /> ADMINISTRATION / {active.toUpperCase()}</div><h1>{title}</h1><p>{subtitle}</p></div></div>
          {children}
          <footer className="ad-footer">© {new Date().getFullYear()} Abdul ICT &amp; Electrical Solutions <span>Administrator workspace</span></footer>
        </div>
      </main>
    </div>
  );
}
