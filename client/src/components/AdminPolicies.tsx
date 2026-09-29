import React, { useState } from "react";
import toast from "react-hot-toast";
import { pmosApi } from "../services/pmosApi";
import { Policy, CreatePolicyRequest2 } from "../types/pmos";
import { useAdminPolicies, usePolicyCategories } from "../hooks/useApi";

export const AdminPolicies: React.FC = () => {
  const { data: policies = [], isLoading: loadingPolicies, refetch: refetchPolicies } = useAdminPolicies();
  const { data: categories = [], isLoading: loadingCategories, refetch: refetchCategories } = usePolicyCategories();
  const [showForm, setShowForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // Form state
  const [form, setForm] = useState<CreatePolicyRequest2>({ title: "", content: "", category_id: "" });

  const fetchData = async () => {
    refetchPolicies();
    refetchCategories();
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await pmosApi.createPolicyCategory({ name: newCatName.trim() });
      toast.success("Category created");
      setNewCatName("");
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.category_id) { toast.error("Title and category are required."); return; }
    try {
      await pmosApi.createPolicy(form);
      toast.success("Policy created as draft");
      setForm({ title: "", content: "", category_id: "" });
      setShowForm(false);
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleStatus = async (policy: Policy) => {
    const newStatus = policy.status === "published" ? "draft" : "published";
    try {
      await pmosApi.updatePolicy(policy.id, { status: newStatus });
      toast.success(newStatus === "published" ? "Policy published" : "Policy unpublished");
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Archive this policy?")) return;
    try {
      await pmosApi.archivePolicy(id);
      toast.success("Policy archived");
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const statusColor = (s: string) => {
    if (s === "published") return { background: "#E4ECE9", color: "#1F4B43" };
    if (s === "archived") return { background: "#F6DEDA", color: "#B23A2E" };
    return { background: "#F8E9D3", color: "#D98E3B" };
  };

  if (loadingPolicies || loadingCategories) return <div className="py-8 text-center text-gray-400">Loading…</div>;

  return (
    <div>
      {/* Category Manager */}
      <div className="pmos-admin-card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Policy Categories</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {categories.map(c => (
            <span key={c.id} style={{ background: "var(--primary-soft)", color: "var(--primary)", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{c.name}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input className="pmos-field" style={{ flex: 1 }} placeholder="New category name…" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
          <button className="pmos-btn primary sm" onClick={handleCreateCategory}>Add Category</button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, justifyContent: "flex-end" }}>
        <button className="pmos-btn primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Create Policy"}
        </button>
      </div>

      {/* Create Policy Form Modal */}
      {showForm && (
        <div className="pmos-modal-bg show" onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, zIndex: 100 }}>
          <div className="pmos-modal wide" onClick={e => e.stopPropagation()}>
            <h3>Create Policy</h3>
            <form onSubmit={handleCreatePolicy} style={{ marginTop: 16 }}>
              <div className="pmos-row2">
                <div className="pmos-field"><label>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
                <div className="pmos-field"><label>Category</label>
                  <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} required>
                    <option value="">Select…</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pmos-field"><label>Content</label><textarea rows={8} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} style={{ fontFamily: "inherit", width: "100%" }} /></div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
                <button type="button" className="pmos-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="pmos-btn primary">Create (as Draft)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Policy List */}
      {policies.filter(p => p.status !== "archived").map(p => (
        <div key={p.id} className="pmos-admin-row">
          <div className="grow">
            <div className="lbl">{p.title}</div>
            <div className="sub">{p.category?.name || "Uncategorized"} · Updated {new Date(p.updated_at).toLocaleDateString()}</div>
          </div>
          <span style={{ ...statusColor(p.status), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{p.status}</span>
          <button className="pmos-btn sm" onClick={() => toggleStatus(p)}>{p.status === "published" ? "Unpublish" : "Publish"}</button>
          <button className="pmos-btn sm ghost-danger" onClick={() => handleArchive(p.id)}>Archive</button>
        </div>
      ))}
      {policies.filter(p => p.status !== "archived").length === 0 && (
        <div style={{ textAlign: "center", padding: 30, color: "var(--ink-soft)" }}>No policies created yet.</div>
      )}
    </div>
  );
};
