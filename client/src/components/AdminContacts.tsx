import React, { useState } from "react";
import toast from "react-hot-toast";
import { pmosApi } from "../services/pmosApi";
import { CreateContactRequest } from "../types/pmos";
import { useContacts, useContactTypes } from "../hooks/useApi";

export const AdminContacts: React.FC = () => {
  const { data: contacts = [], isLoading: loadingContacts, refetch: refetchContacts } = useContacts();
  const { data: contactTypes = [], isLoading: loadingTypes, refetch: refetchTypes } = useContactTypes();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Form state
  const [form, setForm] = useState<CreateContactRequest>({
    name: "", type_id: "", phone: "", email: "", mailing_address: "", city: "", state: "", zip: "", notes: "",
  });

  const fetchData = async () => {
    refetchContacts();
    refetchTypes();
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    try {
      await pmosApi.createContactType({ name: newTypeName.trim() });
      toast.success("Contact type created");
      setNewTypeName("");
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.type_id) { toast.error("Name and type are required."); return; }
    try {
      await pmosApi.createContact(form);
      toast.success("Contact created");
      setForm({ name: "", type_id: "", phone: "", email: "", mailing_address: "", city: "", state: "", zip: "", notes: "" });
      setShowForm(false);
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Archive this contact?")) return;
    try {
      await pmosApi.archiveContact(id);
      toast.success("Contact archived");
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRestore = async (id: string) => {
    try {
      await pmosApi.updateContact(id, { status: "active" });
      toast.success("Contact restored");
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const filtered = contacts.filter(c => {
    const matchArchived = showArchived ? c.status === "archived" : c.status !== "archived";
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || c.type_id === filterType;
    return matchArchived && matchSearch && matchType;
  });

  return <div className="pmos-empty" style={{ padding: "28px 0" }}>Loading…</div>;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ flex: 1, minWidth: 180, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }} placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ maxWidth: 180, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {contactTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-soft)", cursor: "pointer", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} style={{ width: 14, height: 14, margin: 0 }} />
          Show archived
        </label>
      </div>

      {/* Contact List */}
      <div style={{ marginBottom: 24 }}>
        {filtered.map(c => {
          const isArchived = c.status === "archived";
          return (
            <div key={c.id} className="pmos-admin-row" style={isArchived ? { opacity: 0.5 } : {}}>
              <div className="grow">
                <div className="lbl" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {c.name}
                  {isArchived && <span style={{ fontSize: 10, fontWeight: 600, background: "var(--line)", color: "var(--ink-soft)", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>archived</span>}
                </div>
                <div className="sub">{c.contact_type?.name} · {[c.city, c.state].filter(Boolean).join(", ")} {c.phone ? `· ${c.phone}` : ""}</div>
              </div>
              {isArchived
                ? <button className="pmos-btn sm" onClick={() => handleRestore(c.id)}>Restore</button>
                : <button className="pmos-btn sm ghost-danger" onClick={() => handleArchive(c.id)}>Archive</button>
              }
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 30, color: "var(--ink-soft)" }}>
            {showArchived ? "No archived contacts." : "No contacts found."}
          </div>
        )}
      </div>

      <hr className="pmos-divider" />
      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", marginBottom: 16 }}>Management & Creation</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Contact Types Manager */}
        <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>1. Manage Contact Types</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {contactTypes.map(t => (
              <span key={t.id} style={{ background: "var(--primary-soft)", color: "var(--primary)", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{t.name}</span>
            ))}
            {contactTypes.length === 0 && <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>No types created yet.</span>}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }} placeholder="New type name…" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} />
            <button className="pmos-btn primary sm" onClick={handleCreateType}>Add Type</button>
          </div>
        </div>

        {/* Create Contact Form */}
        <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>2. Add New Contact</div>
          <form onSubmit={handleCreateContact}>
            <div className="pmos-row2">
              <div className="pmos-field"><label>Full Name / Company</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="pmos-field"><label>Contact Type</label>
                <select value={form.type_id} onChange={e => setForm({ ...form, type_id: e.target.value })} required>
                  <option value="">Select…</option>
                  {contactTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="pmos-row2">
              <div className="pmos-field"><label>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="pmos-field"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="pmos-row2">
              <div className="pmos-field"><label>Mailing Address</label><input value={form.mailing_address} onChange={e => setForm({ ...form, mailing_address: e.target.value })} /></div>
            </div>
            <div className="pmos-row2">
              <div className="pmos-field"><label>City</label><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div className="pmos-field"><label>State</label><input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
              <div className="pmos-field"><label>ZIP</label><input value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <div className="pmos-field"><label>Notes</label><textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <button type="submit" className="pmos-btn primary" style={{ marginTop: 8 }}>Create Contact</button>
          </form>
        </div>
      </div>
    </div>
  );
};
