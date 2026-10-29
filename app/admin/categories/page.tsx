"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Check, Edit3, LoaderCircle, Plus, Search, Trash2, X } from "lucide-react";
import AdminPageShell from "../admin-page-shell";
import { graphqlRequest } from "@/lib/graphql";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type CategoryForm = {
  name: string;
  slug: string;
  icon: string;
  description: string;
  sortOrder: string;
};

const emptyForm: CategoryForm = {
  name: "", slug: "", icon: "📦", description: "", sortOrder: "0",
};

const CATEGORY_FIELDS = "id name slug icon description sortOrder createdAt updatedAt";

function slugify(value: string) {
  return value.toLowerCase().trim().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const result = await graphqlRequest<{ categories: Category[] }>(
        `query GetCategories { categories { ${CATEGORY_FIELDS} } }`,
      );
      setCategories(result.categories);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not load categories." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCategories(); }, [loadCategories]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter(category =>
      [category.name, category.slug, category.icon, category.description]
        .some(value => value.toLowerCase().includes(query)),
    );
  }, [categories, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setNotice(null);
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      icon: category.icon || "📦",
      description: category.description || "",
      sortOrder: String(category.sortOrder ?? 0),
    });
    setSlugTouched(true);
    setNotice(null);
    setModalOpen(true);
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const slug = slugify(form.slug || name);
    if (!name || !slug) {
      setNotice({ type: "error", text: "Enter a category name and a valid slug." });
      return;
    }
    setSaving(true);
    setNotice(null);
    const input = {
      name,
      slug,
      icon: form.icon.trim() || "📦",
      description: form.description.trim(),
      sortOrder: Number.isFinite(Number(form.sortOrder)) ? Number(form.sortOrder) : 0,
    };
    try {
      if (editing) {
        await graphqlRequest<{ updateCategory: Category }>(
          `mutation UpdateCategory($id: ID!, $input: CategoryInput!) {
            updateCategory(id: $id, input: $input) { ${CATEGORY_FIELDS} }
          }`,
          { id: editing.id, input },
        );
        setNotice({ type: "success", text: "Category updated successfully." });
      } else {
        await graphqlRequest<{ createCategory: Category }>(
          `mutation CreateCategory($input: CategoryInput!) {
            createCategory(input: $input) { ${CATEGORY_FIELDS} }
          }`,
          { input },
        );
        setNotice({ type: "success", text: "Category created successfully." });
      }
      setModalOpen(false);
      await loadCategories();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not save this category." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Delete “${category.name}”? This action cannot be undone.`)) return;
    setNotice(null);
    try {
      await graphqlRequest<{ deleteCategory: boolean }>(
        `mutation DeleteCategory($id: ID!) { deleteCategory(id: $id) }`,
        { id: category.id },
      );
      setCategories(current => current.filter(item => item.id !== category.id));
      setNotice({ type: "success", text: `“${category.name}” was deleted.` });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not delete this category." });
    }
  }

  return (
    <AdminPageShell active="Categories" title="Categories" subtitle="Manage the product categories displayed across your online store.">
      <div className="category-admin-toolbar">
        <label className="category-admin-search">
          <Search size={17} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by category name, slug or description…" aria-label="Search categories" />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" style={{ border: 0, background: "transparent", color: "inherit", display: "grid", placeItems: "center" }}><X size={15} /></button>}
        </label>
        <span className="category-admin-count">{filtered.length} of {categories.length} categories</span>
        <button type="button" className="category-admin-primary" onClick={openCreate}><Plus size={16} /> Add category</button>
      </div>

      {notice && <div className={"category-admin-alert " + (notice.type === "success" ? "success" : "")} role="status">
        <span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={15} /></button>
      </div>}

      <section className="ad-panel ad-orders" aria-label="Categories data table">
        <div className="ad-panel-head">
          <div><h2>Product categories</h2><p>These categories are saved in the database and can be edited at any time.</p></div>
          <span className="ad-pill"><Boxes size={13} /> Catalog</span>
        </div>
        <div className="ad-table-wrap">
          <table className="category-admin-table">
            <thead><tr><th>Category</th><th>Slug</th><th>Sort order</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5}><div className="category-admin-empty"><LoaderCircle size={20} className="animate-spin" /> Loading categories from database…</div></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5}><div className="category-admin-empty">{search ? "No categories match your search." : "No categories found. Add your first category."}</div></td></tr>
              : filtered.map(category => <tr key={category.id}>
                <td><div className="category-admin-name"><span className="category-admin-emoji">{category.icon || "📦"}</span><span><b>{category.name}</b><small>{category.description || "No description added"}</small></span></div></td>
                <td><code>{category.slug}</code></td>
                <td>{category.sortOrder}</td>
                <td><span className="category-admin-status">Active</span></td>
                <td><div className="category-admin-actions">
                  <button type="button" title={`Edit ${category.name}`} aria-label={`Edit ${category.name}`} onClick={() => openEdit(category)}><Edit3 size={15} /></button>
                  <button type="button" className="danger" title={`Delete ${category.name}`} aria-label={`Delete ${category.name}`} onClick={() => void deleteCategory(category)}><Trash2 size={15} /></button>
                </div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && <div className="category-admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>
        <section className="category-admin-modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
          <div className="category-admin-modal-head"><div><h2 id="category-modal-title">{editing ? "Edit category" : "Add category"}</h2><p>{editing ? "Update the category details below." : "Create a category for your product catalogue."}</p></div><button type="button" disabled={saving} onClick={() => setModalOpen(false)} aria-label="Close dialog"><X size={18} /></button></div>
          <form className="category-admin-form" onSubmit={saveCategory}>
            <label className="full">Category name<input required maxLength={100} value={form.name} onChange={event => { const name = event.target.value; setForm(current => ({ ...current, name, slug: slugTouched ? current.slug : slugify(name) })); }} placeholder="e.g. MOBILE PHONES" /></label>
            <label>Slug<input required maxLength={120} value={form.slug} onChange={event => { setSlugTouched(true); setForm(current => ({ ...current, slug: slugify(event.target.value) })); }} placeholder="mobile-phones" /></label>
            <label>Icon / emoji<input maxLength={12} value={form.icon} onChange={event => setForm(current => ({ ...current, icon: event.target.value }))} placeholder="📱" /></label>
            <label>Display order<input type="number" min={0} max={10000} value={form.sortOrder} onChange={event => setForm(current => ({ ...current, sortOrder: event.target.value }))} /></label>
            <label className="full">Description (optional)<textarea maxLength={500} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="A short description for this category…" /></label>
            {notice?.type === "error" && <div className="category-admin-alert" style={{ gridColumn: "1 / -1", margin: 0 }}>{notice.text}</div>}
            <div className="category-admin-modal-actions" style={{ gridColumn: "1 / -1" }}>
              <button type="button" className="category-admin-secondary" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="category-admin-primary" disabled={saving}>{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}{saving ? "Saving…" : editing ? "Save changes" : "Create category"}</button>
            </div>
          </form>
        </section>
      </div>}
    </AdminPageShell>
  );
}
