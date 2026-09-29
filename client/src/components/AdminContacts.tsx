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

  const filtered = contacts.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || c.type_id === filterType;
    return matchSearch && matchType;
  });

  if (loadingContacts || loadingTypes) return <div className="py-8 text-center text-gray-400">Loading…</div>;

  return (
    <div>
      {/* Contact Types Manager */}
      <div className="pmos-admin-card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Contact Types</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {contactTypes.map(t => (
            <span key={t.id} style={{ background: "var(--primary-soft)", color: "var(--primary)", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{t.name}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input className="pmos-field" style={{ flex: 1 }} placeholder="New type name…" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} />
          <button className="pmos-btn primary sm" onClick={handleCreateType}>Add Type</button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ flex: 1, minWidth: 180 }} placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ maxWidth: 180 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {contactTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="pmos-btn primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Contact"}
        </button>
      </div>

      {/* Create Contact Form Modal */}
      {showForm && (
        <div className="pmos-modal-bg show" onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, zIndex: 100 }}>
          <div className="pmos-modal wide" onClick={e => e.stopPropagation()}>
            <h3>Add New Contact</h3>
            <form onSubmit={handleCreateContact} style={{ marginTop: 16 }}>
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
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
                <button type="button" className="pmos-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="pmos-btn primary">Create Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact List */}
      {filtered.map(c => (
        <div key={c.id} className="pmos-admin-row">
          <div className="grow">
            <div className="lbl">{c.name}</div>
            <div className="sub">{c.contact_type?.name} · {[c.city, c.state].filter(Boolean).join(", ")} {c.phone ? `· ${c.phone}` : ""}</div>
          </div>
          <button className="pmos-btn sm ghost-danger" onClick={() => handleArchive(c.id)}>Archive</button>
        </div>
      ))}
      {filtered.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "var(--ink-soft)" }}>No contacts found.</div>}
    </div>
  );
};
