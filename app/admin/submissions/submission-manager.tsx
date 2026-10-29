"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, LoaderCircle, Mail, MessageSquare, Phone, RefreshCw, Search, Trash2, UserRound, Users, X } from "lucide-react";
import AdminPageShell from "../admin-page-shell";
import { graphqlRequest } from "@/lib/graphql";

type Kind = "contacts" | "newsletter" | "training";
type Row = {
  id: string; email: string; status: string; createdAt?: string; updatedAt?: string;
  subscribedAt?: string; unsubscribedAt?: string | null; source?: string;
  name?: string; phone?: string; service?: string; message?: string;
  fullName?: string; course?: string; level?: string; schedule?: string; startDate?: string; goal?: string; notes?: string;
  adminNote?: string;
};
const ENQUIRY_STATUSES = ["NEW", "IN_PROGRESS", "REPLIED", "ARCHIVED"];
const FIELDS = {
  contacts: "id name email phone service message status adminNote createdAt updatedAt",
  newsletter: "id email status source subscribedAt unsubscribedAt createdAt updatedAt",
  training: "id fullName phone email course level schedule startDate goal notes status adminNote createdAt updatedAt",
};
const TITLES = { contacts: "Contact submissions", newsletter: "Newsletter subscriptions", training: "Training enquiries" };
const DESCRIPTIONS = {
  contacts: "Read website messages, follow up with customers, add internal notes and track each enquiry.",
  newsletter: "Manage the email list collected through the website newsletter form.",
  training: "Review student course requests, contact students and track follow-up progress.",
};
const QUERY_NAMES = { contacts: "contactSubmissions", newsletter: "newsletterSubscriptions", training: "trainingEnquiries" };
const UPDATE_NAMES = { contacts: "updateContactSubmission", newsletter: "updateNewsletterSubscription", training: "updateTrainingEnquiry" };
const DELETE_NAMES = { contacts: "deleteContactSubmission", newsletter: "deleteNewsletterSubscription", training: "deleteTrainingEnquiry" };
const dateText = (value?: string) => value ? new Date(value).toLocaleString() : "—";
const labelStatus = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const whatsappNumber = (value: string) => { const digits = value.replace(/\D/g, ""); if (digits.startsWith("256")) return digits; if (digits.startsWith("0")) return "256" + digits.slice(1); return digits; };

export default function SubmissionManager({ kind }: { kind: Kind }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = `query SubmissionList($search:String,$status:String){ ${QUERY_NAMES[kind]}(search:$search,status:$status){ ${FIELDS[kind]} } }`;
      const data = await graphqlRequest<Record<string, Row[]>>(query, { search, status: statusFilter });
      const next = data[QUERY_NAMES[kind]] || [];
      setRows(next);
      setDraftStatus(Object.fromEntries(next.map(row => [row.id, row.status])));
      setDraftNotes(Object.fromEntries(next.map(row => [row.id, row.adminNote || ""])));
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not load records from the database." });
    } finally { setLoading(false); }
  }, [kind, search, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    total: rows.length,
    new: rows.filter(row => row.status === "NEW").length,
    active: rows.filter(row => kind === "newsletter" ? row.status === "ACTIVE" : row.status === "IN_PROGRESS").length,
  }), [rows, kind]);

  async function saveRow(row: Row) {
    const status = draftStatus[row.id] || row.status;
    const adminNote = draftNotes[row.id] ?? row.adminNote ?? "";
    setSavingId(row.id); setNotice(null);
    try {
      if (kind === "newsletter") {
        await graphqlRequest(`mutation UpdateSubscription($id:ID!,$status:String!){updateNewsletterSubscription(id:$id,status:$status){id status}}`, { id: row.id, status });
      } else if (kind === "contacts") {
        await graphqlRequest(`mutation UpdateContact($id:ID!,$status:String!,$adminNote:String){updateContactSubmission(id:$id,status:$status,adminNote:$adminNote){id status adminNote}}`, { id: row.id, status, adminNote });
      } else {
        await graphqlRequest(`mutation UpdateTraining($id:ID!,$status:String!,$adminNote:String){updateTrainingEnquiry(id:$id,status:$status,adminNote:$adminNote){id status adminNote}}`, { id: row.id, status, adminNote });
      }
      setNotice({ type: "success", text: kind === "newsletter" ? "Subscription status updated." : "Status and internal notes saved." });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not save changes." });
    } finally { setSavingId(""); }
  }

  async function deleteRow(row: Row) {
    const identity = kind === "contacts" ? row.name : kind === "training" ? row.fullName : row.email;
    if (!window.confirm(`Permanently delete this record for ${identity || row.email}? This cannot be undone.`)) return;
    setSavingId(row.id); setNotice(null);
    try {
      await graphqlRequest(`mutation DeleteSubmission($id:ID!){${DELETE_NAMES[kind]}(id:$id)}`, { id: row.id });
      setRows(current => current.filter(item => item.id !== row.id));
      setNotice({ type: "success", text: "Record deleted." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not delete this record." });
    } finally { setSavingId(""); }
  }

  function exportCsv() {
    const cols = kind === "contacts" ? ["name","email","phone","service","message","status","adminNote","createdAt"]
      : kind === "training" ? ["fullName","phone","email","course","level","schedule","startDate","goal","notes","status","adminNote","createdAt"]
      : ["email","status","source","subscribedAt","unsubscribedAt"];
    const escape = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
    const csv = [cols.join(","), ...rows.map(row => cols.map(col => escape((row as any)[col])).join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `abdul-${kind}-${new Date().toISOString().slice(0,10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  function person(row: Row) { return kind === "contacts" ? row.name : kind === "training" ? row.fullName : row.email; }
  function statusSelect(row: Row) {
    const options = kind === "newsletter" ? ["ACTIVE", "UNSUBSCRIBED"] : ENQUIRY_STATUSES;
    return <select aria-label={`Status for ${person(row)}`} value={draftStatus[row.id] || row.status} onChange={event => setDraftStatus(old => ({ ...old, [row.id]: event.target.value }))}>{options.map(value => <option value={value} key={value}>{labelStatus(value)}</option>)}</select>;
  }

  return <AdminPageShell active={kind === "contacts" ? "Contact submissions" : kind === "newsletter" ? "Newsletter" : "Training enquiries"} title={TITLES[kind]} subtitle={DESCRIPTIONS[kind]}>
    <section className="submission-stats">
      <article><span>Total matching records</span><b>{counts.total}</b></article>
      {kind !== "newsletter" && <article><span>New / unreviewed</span><b>{counts.new}</b></article>}
      <article><span>{kind === "newsletter" ? "Active subscribers" : "In progress"}</span><b>{counts.active}</b></article>
    </section>
    <div className="submission-toolbar">
      <label className="submission-search"><Search size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder={kind === "newsletter" ? "Search email addresses…" : "Search names, email, phone or details…"} /></label>
      <select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
        <option value="">All statuses</option>
        {(kind === "newsletter" ? ["ACTIVE","UNSUBSCRIBED"] : ENQUIRY_STATUSES).map(value => <option value={value} key={value}>{labelStatus(value)}</option>)}
      </select>
      <button type="button" onClick={() => void load()} disabled={loading} className="submission-secondary"><RefreshCw size={15}/> Refresh</button>
      <button type="button" onClick={exportCsv} className="submission-primary"><Download size={15}/> Export CSV</button>
    </div>
    {notice && <div className={"submission-alert " + notice.type} role="status">{notice.text}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"><X size={15}/></button></div>}
    {loading ? <div className="submission-empty"><LoaderCircle className="submission-spin"/> Loading records from the database…</div>
      : rows.length === 0 ? <div className="submission-empty"><Users size={30}/><b>No records found</b><span>Website submissions will appear here as soon as customers send them.</span></div>
      : <div className="submission-list">{rows.map(row => <article className="submission-card" key={row.id}>
        <div className="submission-card-top">
          <div className="submission-avatar">{kind === "newsletter" ? <Mail/> : kind === "training" ? <UserRound/> : <MessageSquare/>}</div>
          <div className="submission-main-identity"><h3>{person(row) || "Unnamed submission"}</h3><p>{kind === "newsletter" ? row.email : <>{row.email || "No email supplied"}{row.phone && <> · {row.phone}</>}</>}</p><small>{kind === "newsletter" ? "Subscribed " + dateText(row.subscribedAt) : "Received " + dateText(row.createdAt)}</small></div>
          <span className={"submission-status status-" + row.status.toLowerCase().replaceAll("_","-")}>{labelStatus(row.status)}</span>
        </div>
        {kind === "contacts" && <div className="submission-summary"><span><b>Service:</b> {row.service}</span><p>{row.message}</p></div>}
        {kind === "training" && <div className="submission-summary submission-training-summary"><span><b>Course:</b> {row.course}</span><span><b>Level:</b> {row.level}</span><span><b>Preferred time:</b> {row.schedule}</span>{row.startDate && <span><b>Start date:</b> {row.startDate}</span>}{row.goal && <p><b>Learning goal:</b> {row.goal}</p>}{row.notes && <p><b>Additional notes:</b> {row.notes}</p>}</div>}
        {kind === "newsletter" && <div className="submission-summary"><span><b>Source:</b> {row.source || "website"}</span>{row.unsubscribedAt && <span><b>Unsubscribed:</b> {dateText(row.unsubscribedAt)}</span>}</div>}
        <div className="submission-actions">
          {row.email && <a href={`mailto:${row.email}`}><Mail size={15}/> Email</a>}
          {row.phone && <a href={`tel:${row.phone.replace(/[^+\d]/g,"")}`}><Phone size={15}/> Call</a>}
          {row.phone && <a href={`https://wa.me/${whatsappNumber(row.phone)}`} target="_blank" rel="noreferrer"><ExternalLink size={15}/> WhatsApp</a>}
          <button type="button" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>{expanded === row.id ? "Hide actions" : "Manage record"}</button>
        </div>
        {expanded === row.id && <div className="submission-management">
          <label>Status{statusSelect(row)}</label>
          {kind !== "newsletter" && <label>Internal notes (not visible to the customer)<textarea rows={3} value={draftNotes[row.id] ?? row.adminNote ?? ""} onChange={event => setDraftNotes(old => ({ ...old, [row.id]: event.target.value }))} placeholder="Record follow-up details or next steps…"/></label>}
          <div><button type="button" className="submission-primary" disabled={savingId === row.id} onClick={() => void saveRow(row)}>{savingId === row.id ? "Saving…" : kind === "newsletter" ? "Save subscription status" : "Save changes"}</button><button type="button" className="submission-danger" disabled={savingId === row.id} onClick={() => void deleteRow(row)}><Trash2 size={15}/> Delete record</button></div>
        </div>}
      </article>)}</div>}
  </AdminPageShell>;
}
