"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Check, Edit3, LoaderCircle, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import AdminPageShell from "../admin-page-shell";
import { graphqlRequest } from "@/lib/graphql";

type Brand = { id: string; name: string; slug: string; createdAt: string; updatedAt: string };
type BrandForm = { name: string; slug: string };
const emptyForm: BrandForm = { name: "", slug: "" };
const BRAND_FIELDS = "id name slug createdAt updatedAt";

function slugify(value: string) {
  return value.toLowerCase().trim().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<BrandForm>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadBrands = useCallback(async () => {
    setLoading(true);
    try {
      const result = await graphqlRequest<{ brands: Brand[] }>(
        `query GetBrands { brands { ${BRAND_FIELDS} } }`,
      );
      setBrands(result.brands);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not load brands." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBrands(); }, [loadBrands]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? brands.filter(brand => [brand.name, brand.slug].some(value => value.toLowerCase().includes(query))) : brands;
  }, [brands, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setNotice(null);
    setModalOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditing(brand);
    setForm({ name: brand.name, slug: brand.slug });
    setSlugTouched(true);
    setNotice(null);
    setModalOpen(true);
  }

  async function saveBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const slug = slugify(form.slug || name);
    if (!name || !slug) {
      setNotice({ type: "error", text: "Enter a brand name." });
      return;
    }
    setSaving(true);
    setNotice(null);
    const input = { name, slug };
    try {
      if (editing) {
        await graphqlRequest<{ updateBrand: Brand }>(
          `mutation UpdateBrand($id: ID!, $input: BrandInput!) { updateBrand(id: $id, input: $input) { ${BRAND_FIELDS} } }`,
          { id: editing.id, input },
        );
      } else {
        await graphqlRequest<{ createBrand: Brand }>(
          `mutation CreateBrand($input: BrandInput!) { createBrand(input: $input) { ${BRAND_FIELDS} } }`,
          { input },
        );
      }
      setModalOpen(false);
      setNotice({ type: "success", text: editing ? "Brand updated successfully." : "Brand created successfully." });
      await loadBrands();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not save this brand." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteBrand(brand: Brand) {
    if (!window.confirm(`Delete “${brand.name}”? This action cannot be undone.`)) return;
    setNotice(null);
    try {
      await graphqlRequest<{ deleteBrand: boolean }>(
        `mutation DeleteBrand($id: ID!) { deleteBrand(id: $id) }`,
        { id: brand.id },
      );
      setBrands(current => current.filter(item => item.id !== brand.id));
      setNotice({ type: "success", text: `“${brand.name}” was deleted.` });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not delete this brand." });
    }
  }

  return (
    <AdminPageShell active="Brands" title="Brands" subtitle="Manage the manufacturers and device brands available across your store.">
      <div className="category-admin-toolbar">
        <label className="category-admin-search">
          <Search size={17} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search brands by name or slug…" aria-label="Search brands" />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" style={{ border: 0, background: "transparent", color: "inherit", display: "grid", placeItems: "center" }}><X size={15} /></button>}
        </label>
        <span className="category-admin-count">{filtered.length} of {brands.length} brands</span>
        <button type="button" className="category-admin-primary" onClick={openCreate}><Plus size={16} /> Create brand</button>
      </div>

      {notice && <div className={"category-admin-alert " + (notice.type === "success" ? "success" : "")} role="status"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={15} /></button></div>}

      <section className="ad-panel ad-orders" aria-label="Brands data table">
        <div className="ad-panel-head">
          <div><h2>Brand directory</h2><p>Brands are stored in the database and can be searched, edited, created, or deleted.</p></div>
          <span className="ad-pill"><ShieldCheck size={13} /> Catalogue</span>
        </div>
        <div className="ad-table-wrap">
          <table className="category-admin-table">
            <thead><tr><th>Brand</th><th>Slug</th><th>Date added</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={4}><div className="category-admin-empty"><LoaderCircle size={20} className="animate-spin" /> Loading brands from database…</div></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={4}><div className="category-admin-empty">{search ? "No brands match your search." : "No brands found. Create your first brand."}</div></td></tr>
              : filtered.map(brand => <tr key={brand.id}>
                <td><div className="category-admin-name"><span className="category-admin-emoji"><ShieldCheck size={19} /></span><span><b>{brand.name}</b><small>Product brand</small></span></div></td>
                <td><code>{brand.slug}</code></td>
                <td>{new Date(brand.createdAt).toLocaleDateString()}</td>
                <td><div className="category-admin-actions">
                  <button type="button" title={`Edit ${brand.name}`} aria-label={`Edit ${brand.name}`} onClick={() => openEdit(brand)}><Edit3 size={15} /></button>
                  <button type="button" className="danger" title={`Delete ${brand.name}`} aria-label={`Delete ${brand.name}`} onClick={() => void deleteBrand(brand)}><Trash2 size={15} /></button>
                </div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && <div className="category-admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>
        <section className="category-admin-modal" role="dialog" aria-modal="true" aria-labelledby="brand-modal-title">
          <div className="category-admin-modal-head"><div><h2 id="brand-modal-title">{editing ? "Edit brand" : "Create brand"}</h2><p>{editing ? "Update the brand details." : "Add a brand to your store catalogue."}</p></div><button type="button" disabled={saving} onClick={() => setModalOpen(false)} aria-label="Close dialog"><X size={18} /></button></div>
          <form className="category-admin-form" onSubmit={saveBrand}>
            <label className="full">Brand name<input required maxLength={100} autoFocus value={form.name} onChange={event => { const name = event.target.value; setForm(current => ({ ...current, name, slug: slugTouched ? current.slug : slugify(name) })); }} placeholder="e.g. SAMSUNG" /></label>
            <label className="full">Slug<input required maxLength={120} value={form.slug} onChange={event => { setSlugTouched(true); setForm(current => ({ ...current, slug: slugify(event.target.value) })); }} placeholder="samsung" /></label>
            {notice?.type === "error" && <div className="category-admin-alert" style={{ gridColumn: "1 / -1", margin: 0 }}>{notice.text}</div>}
            <div className="category-admin-modal-actions" style={{ gridColumn: "1 / -1" }}>
              <button type="button" className="category-admin-secondary" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="category-admin-primary" disabled={saving}>{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}{saving ? "Saving…" : editing ? "Save changes" : "Create brand"}</button>
            </div>
          </form>
        </section>
      </div>}
    </AdminPageShell>
  );
}
