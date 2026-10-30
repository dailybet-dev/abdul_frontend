"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Check, Edit3, ExternalLink, LoaderCircle, Plus, Search, Trash2, X } from "lucide-react";
import AdminPageShell from "../admin-page-shell";
import { graphqlRequest } from "@/lib/graphql";
import { uploadAdminFile } from "@/lib/admin-upload";

type Service = {
  id: string; title: string; slug: string; category: string; description: string;
  homeDescription: string; imageUrl: string; icon: string; whatsappMessage: string;
  intro: string; detailDescription: string; detailItems: string[]; sortOrder: number;
  isActive: boolean; createdAt: string; updatedAt: string;
};
type FormState = Omit<Service, "id" | "createdAt" | "updatedAt" | "detailItems"> & { detailItemsText: string };
const emptyForm: FormState = {
  title: "", slug: "", category: "ICT & Electrical", description: "", homeDescription: "",
  imageUrl: "", icon: "Wrench", whatsappMessage: "", intro: "", detailDescription: "",
  detailItemsText: "", sortOrder: 0, isActive: true,
};
const FIELDS = "id title slug category description homeDescription imageUrl icon whatsappMessage intro detailDescription detailItems sortOrder isActive createdAt updatedAt";
function slugify(value: string) {
  return value.toLowerCase().trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function toForm(service: Service): FormState {
  return {
    title: service.title, slug: service.slug, category: service.category || "", description: service.description || "",
    homeDescription: service.homeDescription || "", imageUrl: service.imageUrl || "", icon: service.icon || "Wrench",
    whatsappMessage: service.whatsappMessage || "", intro: service.intro || "",
    detailDescription: service.detailDescription || "", detailItemsText: (service.detailItems || []).join("\n"),
    sortOrder: service.sortOrder ?? 0, isActive: service.isActive,
  };
}
export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const result = await graphqlRequest<{ services: Service[] }>(
        `query AdminServices { services { ${FIELDS} } }`,
      );
      setServices(result.services);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not load services from the database." });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void loadServices(); }, [loadServices]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return services;
    return services.filter(service =>
      [service.title, service.slug, service.category, service.description]
        .some(value => (value || "").toLowerCase().includes(query)),
    );
  }, [services, search]);

  function openCreate() {
    setEditing(null); setForm(emptyForm); setSlugTouched(false); setNotice(null); setModalOpen(true);
  }
  function openEdit(service: Service) {
    setEditing(service); setForm(toForm(service)); setSlugTouched(true); setNotice(null); setModalOpen(true);
  }
  function change<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (key === "imageUrl") setImagePreviewFailed(false);
    setForm(current => ({ ...current, [key]: value, ...(key === "title" && !slugTouched ? { slug: slugify(String(value)) } : {}) }));
  }
  async function uploadServiceImage(file?: File) {
    if (!file) return;
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
    if (!allowedTypes.has(file.type)) {
      setNotice({ type: "error", text: "Choose a JPG, PNG, WebP, GIF or AVIF image." });
      return;
    }
    if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
      setNotice({ type: "error", text: "Service images must be smaller than 8 MB." });
      return;
    }
    setUploadingImage(true);
    setNotice(null);
    try {
      const uploaded = await uploadAdminFile(file);
      change("imageUrl", uploaded.url);
      setNotice({ type: "success", text: "Service image uploaded to GitHub. Save the service to apply it." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not upload service image." });
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    const slug = slugify(form.slug || title);
    if (!title || !slug) { setNotice({ type: "error", text: "Enter a service title and valid URL slug." }); return; }
    setSaving(true); setNotice(null);
    const input = {
      title, slug, category: form.category.trim(), description: form.description.trim(),
      homeDescription: form.homeDescription.trim(), imageUrl: form.imageUrl.trim(), icon: form.icon.trim(),
      whatsappMessage: form.whatsappMessage.trim(), intro: form.intro.trim(),
      detailDescription: form.detailDescription.trim(),
      detailItems: form.detailItemsText.split("\n").map(item => item.trim()).filter(Boolean),
      sortOrder: Number(form.sortOrder), isActive: form.isActive,
    };
    try {
      if (editing) {
        await graphqlRequest<{ updateService: Service }>(
          `mutation UpdateService($id: ID!, $input: ServiceInput!) { updateService(id: $id, input: $input) { ${FIELDS} } }`,
          { id: editing.id, input },
        );
        setNotice({ type: "success", text: `“${title}” was updated successfully.` });
      } else {
        await graphqlRequest<{ createService: Service }>(
          `mutation CreateService($input: ServiceInput!) { createService(input: $input) { ${FIELDS} } }`,
          { input },
        );
        setNotice({ type: "success", text: `“${title}” was created successfully.` });
      }
      setModalOpen(false);
      await loadServices();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not save this service." });
    } finally { setSaving(false); }
  }
  async function deleteService(service: Service) {
    if (!window.confirm(`Delete “${service.title}”? This permanently removes it from the database and public service listings.`)) return;
    setNotice(null);
    try {
      await graphqlRequest<{ deleteService: boolean }>(
        `mutation DeleteService($id: ID!) { deleteService(id: $id) }`, { id: service.id },
      );
      setServices(current => current.filter(item => item.id !== service.id));
      setNotice({ type: "success", text: `“${service.title}” was deleted.` });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not delete this service." });
    }
  }

  return <AdminPageShell active="Services" title="Services" subtitle="Manage the services displayed on the homepage and Our Services page. Changes are saved to the database.">
    <div className="category-admin-toolbar">
      <label className="category-admin-search"><Search size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search services by title, category or description…" aria-label="Search services"/>{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" style={{ border: 0, background: "transparent", color: "inherit", display: "grid", placeItems: "center" }}><X size={15}/></button>}</label>
      <span className="category-admin-count">{filtered.length} of {services.length} services</span>
      <button type="button" className="category-admin-primary" onClick={openCreate}><Plus size={16}/> Add service</button>
    </div>
    {notice && <div className={"category-admin-alert " + (notice.type === "success" ? "success" : "")} role="status"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={15}/></button></div>}
    <div className="product-summary-row">
      <div className="product-summary-card"><span className="product-summary-icon"><BriefcaseBusiness size={20}/></span><div><small>Total services</small><b>{services.length}</b></div></div>
      <div className="product-summary-card"><span className="product-summary-icon green"><Check size={20}/></span><div><small>Visible on website</small><b>{services.filter(service => service.isActive).length}</b></div></div>
      <div className="product-summary-card"><span className="product-summary-icon orange"><X size={20}/></span><div><small>Hidden services</small><b>{services.filter(service => !service.isActive).length}</b></div></div>
    </div>
    <section className="ad-panel ad-orders" aria-label="Services database table">
      <div className="ad-panel-head"><div><h2>Service catalogue</h2><p>Edit details and images without changing the website card design.</p></div><span className="ad-pill">Live database</span></div>
      <div className="ad-table-wrap"><table className="category-admin-table product-table"><thead><tr><th>Service</th><th>Category</th><th>URL slug</th><th>Order</th><th>Website status</th><th>Actions</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={6}><div className="category-admin-empty"><LoaderCircle size={20} className="animate-spin"/> Loading services from database…</div></td></tr>
          : !filtered.length ? <tr><td colSpan={6}><div className="category-admin-empty">{search ? "No services match your search." : "No services found in the database."}</div></td></tr>
          : filtered.map(service => <tr key={service.id}>
            <td><div className="product-table-name">{service.imageUrl ? <img src={service.imageUrl} alt="" loading="lazy"/> : <span className="product-table-placeholder"><BriefcaseBusiness size={20}/></span>}<span><b>{service.title}</b><small>{service.description || "No description"}</small></span></div></td>
            <td>{service.category || "—"}</td><td><code>{service.slug}</code></td><td>{service.sortOrder}</td>
            <td><span className={"category-admin-status " + (!service.isActive ? "inactive" : "")}>{service.isActive ? "Visible" : "Hidden"}</span></td>
            <td><div className="category-admin-actions"><button type="button" title={`Edit ${service.title}`} aria-label={`Edit ${service.title}`} onClick={() => openEdit(service)}><Edit3 size={15}/></button><button type="button" title={`Open public service page for ${service.title}`} aria-label={`Open ${service.title} on website`} onClick={() => window.open("/services/" + service.slug, "_blank", "noopener,noreferrer")}><ExternalLink size={15}/></button><button type="button" className="danger" title={`Delete ${service.title}`} aria-label={`Delete ${service.title}`} onClick={() => void deleteService(service)}><Trash2 size={15}/></button></div></td>
          </tr>)}
        </tbody></table></div>
    </section>
    {modalOpen && <div className="category-admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>
      <form className="category-admin-modal service-admin-modal" onSubmit={saveService}>
        <button type="button" className="category-admin-modal-close" onClick={() => setModalOpen(false)} disabled={saving} aria-label="Close form"><X size={18}/></button>
        <div className="category-admin-modal-heading"><span className="category-admin-emoji"><BriefcaseBusiness size={20}/></span><div><h2>{editing ? "Edit service" : "Add service"}</h2><p>Manage card content and service detail information.</p></div></div>
        <div className="service-form-grid">
          <label>Service title *<input required value={form.title} onChange={event => change("title", event.target.value)} placeholder="e.g. CCTV Camera Installation"/></label>
          <label>URL slug *<input required value={form.slug} onChange={event => { setSlugTouched(true); change("slug", event.target.value); }} placeholder="cctv-camera-installation"/></label>
          <label>Category / eyebrow<input value={form.category} onChange={event => change("category", event.target.value)} placeholder="Security solutions"/></label>
          <label>Icon key<input value={form.icon} onChange={event => change("icon", event.target.value)} placeholder="Camera, Zap, Monitor…"/></label>
          <div className="service-form-wide"><label>Service image URL (filled automatically) *<input required readOnly value={form.imageUrl} placeholder="Choose an image below; its GitHub URL will appear here" aria-describedby="service-image-help"/></label><label className="service-image-upload-control"> <span>{uploadingImage ? "Uploading image to GitHub…" : "Choose image from device"}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={uploadingImage || saving} onChange={event => { void uploadServiceImage(event.target.files?.[0]); event.currentTarget.value = ""; }}/></label><small id="service-image-help">Select an image from your device. It is uploaded to the configured GitHub repository and its URL is filled in automatically. JPG, PNG, WebP, GIF or AVIF · max 8 MB.</small></div>
          {form.imageUrl && <div className="service-image-preview service-form-wide">{imagePreviewFailed ? <span role="status">The image URL could not be previewed. Check the URL or upload the image again.</span> : <><img src={form.imageUrl} alt="Service preview" onError={() => setImagePreviewFailed(true)}/><span>Image preview · this image will be saved with the service</span></>}</div>}
          <label className="service-form-wide">Services page card description *<textarea required rows={2} value={form.description} onChange={event => change("description", event.target.value)} placeholder="Short description shown on the Our Services page"/></label>
          <label className="service-form-wide">Homepage card description *<textarea required rows={2} value={form.homeDescription} onChange={event => change("homeDescription", event.target.value)} placeholder="Short description shown on the homepage"/></label>
          <label className="service-form-wide">WhatsApp enquiry message<textarea rows={2} value={form.whatsappMessage} onChange={event => change("whatsappMessage", event.target.value)} placeholder="Message prefilled when customer taps WhatsApp"/></label>
          <label className="service-form-wide">Service introduction<textarea rows={2} value={form.intro} onChange={event => change("intro", event.target.value)} placeholder="Introductory detail copy"/></label>
          <label className="service-form-wide">Detailed description<textarea rows={3} value={form.detailDescription} onChange={event => change("detailDescription", event.target.value)} placeholder="More information about this service"/></label>
          <label className="service-form-wide">Service details (one item per line)<textarea rows={4} value={form.detailItemsText} onChange={event => change("detailItemsText", event.target.value)} placeholder={"Diagnostics and troubleshooting\nInstallation enquiries\nQuotation and support"}/></label>
          <label>Sort order<input type="number" min="0" step="1" required value={form.sortOrder} onChange={event => change("sortOrder", Number(event.target.value))}/></label>
          <label className="service-active-toggle"><input type="checkbox" checked={form.isActive} onChange={event => change("isActive", event.target.checked)}/> Show this service on the website</label>
        </div>
        <div className="category-admin-modal-actions"><button type="button" className="category-admin-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button><button type="submit" className="category-admin-primary" disabled={saving || uploadingImage}>{saving ? <><LoaderCircle size={16} className="animate-spin"/> Saving…</> : <><Check size={16}/>{editing ? "Save changes" : "Create service"}</>}</button></div>
      </form>
    </div>}
  </AdminPageShell>;
}
