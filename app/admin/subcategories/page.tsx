"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Check, Edit3, Layers3, LoaderCircle, Plus, Search, Trash2, X } from "lucide-react";
import AdminPageShell from "../admin-page-shell";
import { graphqlRequest } from "@/lib/graphql";

type ParentCategory = { id: string; name: string };
type Subcategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  categoryId: string | null;
  category: ParentCategory | null;
  createdAt: string;
  updatedAt: string;
};
type SubcategoryForm = {
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  categoryId: string;
};
const emptyForm: SubcategoryForm = { name: "", slug: "", description: "", sortOrder: "0", categoryId: "" };
const SUBCATEGORY_FIELDS = "id name slug description sortOrder categoryId category { id name } createdAt updatedAt";

function slugify(value: string) {
  return value.toLowerCase().trim().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminSubcategoriesPage() {
  const [items, setItems] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<ParentCategory[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subcategory | null>(null);
  const [form, setForm] = useState<SubcategoryForm>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subcategoriesResult, categoriesResult] = await Promise.all([
        graphqlRequest<{ subcategories: Subcategory[] }>(
          `query GetSubcategories { subcategories { ${SUBCATEGORY_FIELDS} } }`,
        ),
        graphqlRequest<{ categories: ParentCategory[] }>(
          `query GetCategoryOptions { categories { id name } }`,
        ),
      ]);
      setItems(subcategoriesResult.subcategories);
      setCategories(categoriesResult.categories);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not load subcategories." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(item => [
      item.name, item.slug, item.description, item.category?.name || "",
    ].some(value => value.toLowerCase().includes(query)));
  }, [items, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setNotice(null);
    setModalOpen(true);
  }

  function openEdit(item: Subcategory) {
    setEditing(item);
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description || "",
      sortOrder: String(item.sortOrder ?? 0),
      categoryId: item.categoryId || "",
    });
    setSlugTouched(true);
    setNotice(null);
    setModalOpen(true);
  }

  async function saveSubcategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const slug = slugify(form.slug || name);
    if (!name || !slug) {
      setNotice({ type: "error", text: "Enter a subcategory name and a valid slug." });
      return;
    }
    setSaving(true);
    setNotice(null);
    const input = {
      name,
      slug,
      description: form.description.trim(),
      sortOrder: Number.isFinite(Number(form.sortOrder)) ? Number(form.sortOrder) : 0,
      categoryId: form.categoryId || null,
    };
    try {
      if (editing) {
        await graphqlRequest<{ updateSubcategory: Subcategory }>(
          `mutation UpdateSubcategory($id: ID!, $input: SubcategoryInput!) {
            updateSubcategory(id: $id, input: $input) { ${SUBCATEGORY_FIELDS} }
          }`,
          { id: editing.id, input },
        );
        setNotice({ type: "success", text: "Subcategory updated successfully." });
      } else {
        await graphqlRequest<{ createSubcategory: Subcategory }>(
          `mutation CreateSubcategory($input: SubcategoryInput!) {
            createSubcategory(input: $input) { ${SUBCATEGORY_FIELDS} }
          }`,
          { input },
        );
        setNotice({ type: "success", text: "Subcategory created successfully." });
      }
      setModalOpen(false);
      await loadData();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not save this subcategory." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubcategory(item: Subcategory) {
    if (!window.confirm(`Delete “${item.name}”? This action cannot be undone.`)) return;
    setNotice(null);
    try {
      await graphqlRequest<{ deleteSubcategory: boolean }>(
        `mutation DeleteSubcategory($id: ID!) { deleteSubcategory(id: $id) }`,
        { id: item.id },
      );
      setItems(current => current.filter(row => row.id !== item.id));
      setNotice({ type: "success", text: `“${item.name}” was deleted.` });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not delete this subcategory." });
    }
  }

  return (
    <AdminPageShell active="Subcategories" title="Subcategories" subtitle="Manage product conditions, deals, and subcategory labels in your store.">
      <div className="category-admin-toolbar">
        <label className="category-admin-search">
          <Search size={17} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name, slug, parent category…" aria-label="Search subcategories" />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" style={{ border: 0, background: "transparent", color: "inherit", display: "grid", placeItems: "center" }}><X size={15} /></button>}
        </label>
        <span className="category-admin-count">{filtered.length} of {items.length} subcategories</span>
        <button type="button" className="category-admin-primary" onClick={openCreate}><Plus size={16} /> Add subcategory</button>
      </div>

      {notice && <div className={"category-admin-alert " + (notice.type === "success" ? "success" : "")} role="status"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={15} /></button></div>}

      <section className="ad-panel ad-orders" aria-label="Subcategories data table">
        <div className="ad-panel-head">
          <div><h2>Subcategory data</h2><p>Records are saved in PostgreSQL and can optionally be assigned to a parent category.</p></div>
          <span className="ad-pill"><Layers3 size={13} /> Catalog</span>
        </div>
        <div className="ad-table-wrap">
          <table className="category-admin-table">
            <thead><tr><th>Subcategory</th><th>Slug</th><th>Parent category</th><th>Order</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5}><div className="category-admin-empty"><LoaderCircle size={20} className="animate-spin" /> Loading subcategories from database…</div></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5}><div className="category-admin-empty">{search ? "No subcategories match your search." : "No subcategories found. Add your first subcategory."}</div></td></tr>
              : filtered.map(item => <tr key={item.id}>
                <td><div className="category-admin-name"><span className="category-admin-emoji"><Layers3 size={19} /></span><span><b>{item.name}</b><small>{item.description || "No description added"}</small></span></div></td>
                <td><code>{item.slug}</code></td>
                <td>{item.category?.name || <span style={{ color: "#8a99af" }}>Not assigned</span>}</td>
                <td>{item.sortOrder}</td>
                <td><div className="category-admin-actions">
                  <button type="button" title={`Edit ${item.name}`} aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}><Edit3 size={15} /></button>
                  <button type="button" className="danger" title={`Delete ${item.name}`} aria-label={`Delete ${item.name}`} onClick={() => void deleteSubcategory(item)}><Trash2 size={15} /></button>
                </div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && <div className="category-admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>
        <section className="category-admin-modal" role="dialog" aria-modal="true" aria-labelledby="subcategory-modal-title">
          <div className="category-admin-modal-head"><div><h2 id="subcategory-modal-title">{editing ? "Update subcategory" : "Create subcategory"}</h2><p>{editing ? "Edit the selected subcategory details." : "Add a subcategory to your catalogue."}</p></div><button type="button" disabled={saving} onClick={() => setModalOpen(false)} aria-label="Close dialog"><X size={18} /></button></div>
          <form className="category-admin-form" onSubmit={saveSubcategory}>
            <label className="full">Subcategory name<input required maxLength={100} value={form.name} onChange={event => { const name = event.target.value; setForm(current => ({ ...current, name, slug: slugTouched ? current.slug : slugify(name) })); }} placeholder="e.g. UK-USED" /></label>
            <label>Slug<input required maxLength={120} value={form.slug} onChange={event => { setSlugTouched(true); setForm(current => ({ ...current, slug: slugify(event.target.value) })); }} placeholder="uk-used" /></label>
            <label>Display order<input type="number" min={0} max={10000} value={form.sortOrder} onChange={event => setForm(current => ({ ...current, sortOrder: event.target.value }))} /></label>
            <label className="full">Parent category (optional)
              <select value={form.categoryId} onChange={event => setForm(current => ({ ...current, categoryId: event.target.value }))}>
                <option value="">Not assigned / general label</option>
                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="full">Description (optional)<textarea maxLength={500} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Short details about this subcategory…" /></label>
            {notice?.type === "error" && <div className="category-admin-alert" style={{ gridColumn: "1 / -1", margin: 0 }}>{notice.text}</div>}
            <div className="category-admin-modal-actions" style={{ gridColumn: "1 / -1" }}>
              <button type="button" className="category-admin-secondary" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="category-admin-primary" disabled={saving}>{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}{saving ? "Saving…" : editing ? "Save changes" : "Create subcategory"}</button>
            </div>
          </form>
        </section>
      </div>}
    </AdminPageShell>
  );
}
