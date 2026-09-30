import React, { useState } from "react";
import toast from "react-hot-toast";
import { pmosApi } from "../services/pmosApi";
import { Policy, PolicyAttachment, PolicyCategory, StaffType } from "../types/pmos";
import { useAdminPolicies, usePolicyCategories } from "../hooks/useApi";
import { normalizeAttachments } from "../utils/ui";

interface PolicyForm {
  title: string;
  description: string;
  content: string;
  category_id: string;
  attachments: PolicyAttachment[];
}

interface CategoryForm {
  name: string;
  description: string;
  audience_staff_types: string[];
}

const emptyPolicy = (): PolicyForm => ({ title: "", description: "", content: "", category_id: "", attachments: [] });
const emptyCategory = (): CategoryForm => ({ name: "", description: "", audience_staff_types: [] });

// Swaps an item with its neighbour and returns the reordered id list.
function moved<T extends { id: string }>(items: T[], index: number, dir: -1 | 1): string[] | null {
  const target = index + dir;
  if (target < 0 || target >= items.length) return null;
  const ids = items.map(i => i.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return ids;
}

export const AdminPolicies: React.FC<{ staffTypes: StaffType[] }> = ({ staffTypes }) => {
  const { data: policies = [], isLoading: loadingPolicies, refetch: refetchPolicies } = useAdminPolicies();
  const { data: categories = [], isLoading: loadingCategories, refetch: refetchCategories } = usePolicyCategories();
  const [showArchived, setShowArchived] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [form, setForm] = useState<PolicyForm>(emptyPolicy);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<CategoryForm>(emptyCategory);

  const fetchData = () => {
    refetchPolicies();
    refetchCategories();
  };

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      fetchData();
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    }
  };

  // ── Categories ──────────────────────────────────────────────────────────────
  const startEditCategory = (c: PolicyCategory) => {
    setEditingCatId(c.id);
    setCatForm({ name: c.name, description: c.description ?? "", audience_staff_types: c.audience_staff_types ?? [] });
  };
  const cancelCategory = () => { setEditingCatId(null); setCatForm(emptyCategory()); };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) { toast.error("Category name is required."); return; }
    const ok = editingCatId
      ? await run(() => pmosApi.updatePolicyCategory(editingCatId, catForm), "Category updated")
      : await run(() => pmosApi.createPolicyCategory(catForm), "Category created");
    if (ok) cancelCategory();
  };

  const toggleAudience = (id: string) => {
    const ids = catForm.audience_staff_types;
    setCatForm({ ...catForm, audience_staff_types: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] });
  };

  const moveCategory = (index: number, dir: -1 | 1) => {
    const ids = moved(categories, index, dir);
    if (ids) run(() => pmosApi.reorderPolicyCategories(ids), "Order updated");
  };

  const deleteCategory = (id: string) => {
    if (!confirm("Delete this category?")) return;
    run(() => pmosApi.deletePolicyCategory(id), "Category deleted");
  };

  // ── Policies ────────────────────────────────────────────────────────────────
  const startEditPolicy = (p: Policy) => {
    setEditingPolicyId(p.id);
    setForm({
      title: p.title, description: p.description ?? "", content: p.content, category_id: p.category_id,
      attachments: normalizeAttachments(p.attachments),
    });
    document.getElementById("admin-policy-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const cancelPolicy = () => { setEditingPolicyId(null); setForm(emptyPolicy()); };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.category_id) { toast.error("Title and category are required."); return; }
    const payload = { ...form, attachments: form.attachments.filter(a => a.url.trim()) };
    const ok = editingPolicyId
      ? await run(() => pmosApi.updatePolicy(editingPolicyId, payload), "Policy updated")
      : await run(() => pmosApi.createPolicy(payload), "Policy created as draft");
    if (ok) cancelPolicy();
  };

  const setAttachment = (i: number, patch: Partial<PolicyAttachment>) =>
    setForm({ ...form, attachments: form.attachments.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) });

  const toggleStatus = (p: Policy) => {
    const status = p.status === "published" ? "draft" : "published";
    run(() => pmosApi.updatePolicy(p.id, { status }), status === "published" ? "Policy published" : "Policy unpublished");
  };

  const archive = (id: string) => {
    if (!confirm("Archive this policy?")) return;
    run(() => pmosApi.archivePolicy(id), "Policy archived");
  };

  const movePolicy = (list: Policy[], index: number, dir: -1 | 1) => {
    const ids = moved(list, index, dir);
    if (ids) run(() => pmosApi.reorderPolicies(ids), "Order updated");
  };

  if (loadingPolicies || loadingCategories) return <div className="pmos-empty" style={{ padding: "28px 0" }}>Loading…</div>;

  const visiblePolicies = policies.filter(p => (showArchived ? p.status === "archived" : p.status !== "archived"));
  const audienceLabel = (c: PolicyCategory) => {
    const ids = c.audience_staff_types ?? [];
    if (!ids.length) return "All staff";
    return staffTypes.filter(s => ids.includes(s.id)).map(s => s.name).join(", ") || "Selected staff types";
  };

  return (
    <div>
      <div className="pmos-toolbar" style={{ justifyContent: "flex-end" }}>
        <label className="check">
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} style={{ width: 14, height: 14, margin: 0 }} />
          Show archived
        </label>
      </div>

      {/* Policy list, grouped by category in dashboard order */}
      <div style={{ marginBottom: 24 }}>
        {categories.map(cat => {
          const list = visiblePolicies.filter(p => p.category_id === cat.id);
          if (!list.length) return null;
          return (
            <div key={cat.id} style={{ marginBottom: 14 }}>
              <div className="pmos-kb-group"><div className="lbl">{cat.name}</div></div>
              {list.map((p, i) => {
                const isArchived = p.status === "archived";
                const pill = p.status === "published" ? "" : isArchived ? "danger" : "warn";
                const attachments = normalizeAttachments(p.attachments).length;
                return (
                  <div key={p.id} className="pmos-admin-row" style={isArchived ? { opacity: 0.55 } : {}}>
                    {!showArchived && (
                      <div className="pmos-order-btns">
                        <button title="Move up" disabled={i === 0} onClick={() => movePolicy(list, i, -1)}>▲</button>
                        <button title="Move down" disabled={i === list.length - 1} onClick={() => movePolicy(list, i, 1)}>▼</button>
                      </div>
                    )}
                    <div className="grow">
                      <div className="lbl">{p.title}</div>
                      {p.description && <div className="sub">{p.description}</div>}
                      <div className="sub">
                        Updated {new Date(p.updated_at).toLocaleDateString()}
                        {p.updated_by_name ? ` by ${p.updated_by_name}` : ""}
                        {attachments ? ` · ${attachments} attachment${attachments > 1 ? "s" : ""}` : ""}
                      </div>
                    </div>
                    <span className={`pmos-pill ${pill}`}>{p.status}</span>
                    <button className="pmos-btn sm" onClick={() => startEditPolicy(p)}>Edit</button>
                    {isArchived
                      ? <button className="pmos-btn sm" onClick={() => run(() => pmosApi.updatePolicy(p.id, { status: "draft" }), "Policy restored as draft")}>Restore</button>
                      : <>
                          <button className="pmos-btn sm" onClick={() => toggleStatus(p)}>{p.status === "published" ? "Unpublish" : "Publish"}</button>
                          <button className="pmos-btn sm ghost-danger" onClick={() => archive(p.id)}>Archive</button>
                        </>
                    }
                  </div>
                );
              })}
            </div>
          );
        })}
        {visiblePolicies.length === 0 && (
          <div style={{ textAlign: "center", padding: 30, color: "var(--ink-soft)" }}>
            {showArchived ? "No archived policies." : "No policies created yet."}
          </div>
        )}
      </div>

      <hr className="pmos-divider" />
      <div className="pmos-section-title">Management &amp; Creation</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Category (dashboard section) manager */}
        <div className="pmos-panel">
          <div className="pmos-panel-title">1. Dashboard Sections / Categories</div>
          <div style={{ marginBottom: 14 }}>
            {categories.map((c, i) => (
              <div key={c.id} className="pmos-admin-row">
                <div className="pmos-order-btns">
                  <button title="Move up" disabled={i === 0} onClick={() => moveCategory(i, -1)}>▲</button>
                  <button title="Move down" disabled={i === categories.length - 1} onClick={() => moveCategory(i, 1)}>▼</button>
                </div>
                <div className="grow">
                  <div className="lbl">{c.name}</div>
                  <div className="sub">
                    {c.description ? `${c.description} · ` : ""}Visible to: {audienceLabel(c)} · {c._count?.policies ?? 0} item(s)
                  </div>
                </div>
                <button className="pmos-btn sm" onClick={() => startEditCategory(c)}>Edit</button>
                <button className="pmos-btn sm ghost-danger" onClick={() => deleteCategory(c.id)}>Delete</button>
              </div>
            ))}
            {categories.length === 0 && <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>No categories created yet.</span>}
          </div>
          <form onSubmit={handleSaveCategory}>
            <div className="pmos-row2">
              <div className="pmos-field"><label>{editingCatId ? "Rename Category" : "New Category"}</label><input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Processing Procedures" /></div>
              <div className="pmos-field"><label>Description (optional)</label><input value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} /></div>
            </div>
            {staffTypes.length > 0 && (
              <div className="pmos-field">
                <label>Visible to staff types (none selected = all staff)</label>
                <div className="pmos-check-list">
                  {staffTypes.map(s => (
                    <label key={s.id}>
                      <input type="checkbox" checked={catForm.audience_staff_types.includes(s.id)} onChange={() => toggleAudience(s.id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="pmos-btn primary sm">{editingCatId ? "Save Category" : "Add Category"}</button>
              {editingCatId && <button type="button" className="pmos-btn sm" onClick={cancelCategory}>Cancel</button>}
            </div>
          </form>
        </div>

        {/* Create / Edit Policy Form */}
        <div className="pmos-panel" id="admin-policy-form">
          <div className="pmos-panel-title">
            {editingPolicyId ? `Edit: ${form.title}` : "2. Create New Policy / Procedure"}
            {editingPolicyId && <button className="pmos-btn sm" onClick={cancelPolicy}>Cancel edit</button>}
          </div>
          <form onSubmit={handleSavePolicy}>
            <div className="pmos-row2">
              <div className="pmos-field"><label>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="pmos-field"><label>Category</label>
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} required>
                  <option value="">Select…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="pmos-field"><label>Short Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="One-line summary shown to staff" /></div>
            <div className="pmos-field"><label>Content</label><textarea rows={8} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} style={{ fontFamily: "inherit" }} /></div>
            <div className="pmos-field">
              <label>Supporting Documents (links)</label>
              <div className="pmos-dyn-rows">
                {form.attachments.map((a, i) => (
                  <div key={i} className="pmos-dyn-row">
                    <input placeholder="Document name" value={a.name} onChange={e => setAttachment(i, { name: e.target.value })} />
                    <input placeholder="https://…" value={a.url} onChange={e => setAttachment(i, { url: e.target.value })} />
                    <button type="button" className="pmos-row-x" onClick={() => setForm({ ...form, attachments: form.attachments.filter((_, idx) => idx !== i) })}>×</button>
                  </div>
                ))}
              </div>
              <button type="button" className="pmos-btn sm" onClick={() => setForm({ ...form, attachments: [...form.attachments, { name: "", url: "" }] })}>+ Add document link</button>
            </div>
            <button type="submit" className="pmos-btn primary" style={{ marginTop: 8 }}>{editingPolicyId ? "Save Changes" : "Create (as Draft)"}</button>
          </form>
        </div>
      </div>
    </div>
  );
};
