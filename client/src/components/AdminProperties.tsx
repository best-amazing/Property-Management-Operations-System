import React, { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { pmosApi } from "../services/pmosApi";
import { Property, SavePropertyRequest, User } from "../types/pmos";
import { QUERY_KEYS, useProperties } from "../hooks/useApi";

const emptyForm = (): SavePropertyRequest => ({ name: "", address: "", city: "", state: "", zip: "", staff_ids: [] });

export const AdminProperties: React.FC<{ users: User[] }> = ({ users }) => {
  const qc = useQueryClient();
  const { data: properties = [], isLoading } = useProperties();
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SavePropertyRequest>(emptyForm);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.properties });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.contactFilterOptions });
  };

  const startEdit = (p: Property) => {
    setEditingId(p.id);
    setForm({
      name: p.name, address: p.address ?? "", city: p.city ?? "", state: p.state ?? "", zip: p.zip ?? "",
      staff_ids: (p.staff ?? []).map(s => s.user_id),
    });
    document.getElementById("admin-property-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error("Property name is required."); return; }
    try {
      if (editingId) {
        await pmosApi.updateProperty(editingId, form);
        toast.success("Property updated");
      } else {
        await pmosApi.createProperty(form);
        toast.success("Property created");
      }
      cancelEdit();
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const setStatus = async (id: string, status: "active" | "archived") => {
    if (status === "archived" && !confirm("Archive this property?")) return;
    try {
      await pmosApi.updateProperty(id, { status });
      toast.success(status === "archived" ? "Property archived" : "Property restored");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleStaff = (id: string) => {
    const ids = form.staff_ids ?? [];
    setForm({ ...form, staff_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] });
  };

  if (isLoading) return <div className="pmos-empty" style={{ padding: "28px 0" }}>Loading…</div>;

  const q = search.trim().toLowerCase();
  const visible = properties.filter(p =>
    (showArchived ? p.status === "archived" : p.status !== "archived") &&
    (!q || [p.name, p.address, p.city, p.state, p.zip].some(v => v?.toLowerCase().includes(q)))
  );

  return (
    <div>
      <div className="pmos-toolbar">
        <input className="search" placeholder="Search properties…" value={search} onChange={e => setSearch(e.target.value)} />
        <label className="check">
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} style={{ width: 14, height: 14, margin: 0 }} />
          Show archived
        </label>
      </div>

      <div style={{ marginBottom: 24 }}>
        {visible.map(p => {
          const isArchived = p.status === "archived";
          const staff = (p.staff ?? []).map(s => s.user?.display_name).filter(Boolean);
          const contacts = (p.contacts ?? []).map(c => c.contact?.name).filter(Boolean);
          return (
            <div key={p.id} className="pmos-admin-row" style={isArchived ? { opacity: 0.55 } : {}}>
              <div className="grow">
                <div className="lbl" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {p.name}
                  {isArchived && <span className="pmos-pill muted">archived</span>}
                </div>
                <div className="sub">{[p.address, [p.city, p.state].filter(Boolean).join(", "), p.zip].filter(Boolean).join(" · ") || "No address"}</div>
                <div className="sub">
                  Staff: {staff.length ? staff.join(", ") : "none"} · Contacts: {contacts.length ? contacts.join(", ") : "none"}
                </div>
              </div>
              <button className="pmos-btn sm" onClick={() => startEdit(p)}>Edit</button>
              {isArchived
                ? <button className="pmos-btn sm" onClick={() => setStatus(p.id, "active")}>Restore</button>
                : <button className="pmos-btn sm ghost-danger" onClick={() => setStatus(p.id, "archived")}>Archive</button>
              }
            </div>
          );
        })}
        {visible.length === 0 && (
          <div style={{ textAlign: "center", padding: 30, color: "var(--ink-soft)" }}>
            {showArchived ? "No archived properties." : "No properties yet."}
          </div>
        )}
      </div>

      <hr className="pmos-divider" />
      <div className="pmos-panel" id="admin-property-form">
        <div className="pmos-panel-title">
          {editingId ? `Edit Property: ${form.name || ""}` : "Add New Property"}
          {editingId && <button className="pmos-btn sm" onClick={cancelEdit}>Cancel edit</button>}
        </div>
        <form onSubmit={handleSave}>
          <div className="pmos-row2">
            <div className="pmos-field"><label>Property Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="pmos-field"><label>Street Address</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <div className="pmos-row2">
            <div className="pmos-field"><label>City</label><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            <div className="pmos-field"><label>State</label><input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
            <div className="pmos-field"><label>ZIP</label><input value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} /></div>
          </div>
          <div className="pmos-field">
            <label>Assigned Staff</label>
            <div className="pmos-check-list">
              {users.map(u => (
                <label key={u.id}>
                  <input type="checkbox" checked={form.staff_ids?.includes(u.id) ?? false} onChange={() => toggleStaff(u.id)} />
                  {u.display_name}
                </label>
              ))}
              {users.length === 0 && <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>No users yet.</span>}
            </div>
          </div>
          <button type="submit" className="pmos-btn primary" style={{ marginTop: 8 }}>{editingId ? "Save Changes" : "Create Property"}</button>
        </form>
      </div>
    </div>
  );
};
