import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { pmosApi } from "../services/pmosApi";
import { Contact, ContactFilters, CreateContactRequest } from "../types/pmos";
import { useAdminContactFilterOptions, useContacts, useContactTypes, useProperties } from "../hooks/useApi";

const emptyForm = (): CreateContactRequest => ({
  name: "", type_id: "", phone: "", email: "", mailing_address: "", city: "", state: "", zip: "", notes: "", property_ids: [],
});

export const AdminContacts: React.FC = () => {
  const [filters, setFilters] = useState<ContactFilters>({ status: "active" });
  const [searchInput, setSearchInput] = useState("");
  const { data: contacts = [], isLoading: loadingContacts, refetch: refetchContacts } = useContacts(filters);
  const { data: contactTypes = [], isLoading: loadingTypes, refetch: refetchTypes } = useContactTypes();
  const { data: filterOptions, refetch: refetchOptions } = useAdminContactFilterOptions();
  const { data: properties = [] } = useProperties();
  const [newTypeName, setNewTypeName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateContactRequest>(emptyForm);

  // Debounce free-text search so we don't query on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setFilters(f => ({ ...f, search: searchInput || undefined })), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const setFilter = (key: keyof ContactFilters, value: string) =>
    setFilters(f => ({ ...f, [key]: value || undefined }));

  const fetchData = () => {
    refetchContacts();
    refetchTypes();
    refetchOptions();
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

  const handleRenameType = async (id: string, current: string) => {
    const name = prompt("Rename contact type", current)?.trim();
    if (!name || name === current) return;
    try {
      await pmosApi.updateContactType(id, { name });
      toast.success("Contact type renamed");
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm("Delete this contact type?")) return;
    try {
      await pmosApi.deleteContactType(id);
      toast.success("Contact type deleted");
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const startEdit = (c: Contact) => {
    setEditingId(c.id);
    setForm({
      name: c.name, type_id: c.type_id, phone: c.phone ?? "", email: c.email ?? "",
      mailing_address: c.mailing_address ?? "", city: c.city ?? "", state: c.state ?? "", zip: c.zip ?? "",
      notes: c.notes ?? "", property_ids: (c.properties ?? []).map(p => p.property_id),
    });
    document.getElementById("admin-contact-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.type_id) { toast.error("Name and type are required."); return; }
    try {
      if (editingId) {
        await pmosApi.updateContact(editingId, form);
        toast.success("Contact updated");
      } else {
        await pmosApi.createContact(form);
        toast.success("Contact created");
      }
      cancelEdit();
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const setStatus = async (id: string, status: "active" | "archived") => {
    if (status === "archived" && !confirm("Archive this contact?")) return;
    try {
      await pmosApi.updateContact(id, { status });
      toast.success(status === "archived" ? "Contact archived" : "Contact restored");
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleProperty = (id: string) => {
    const ids = form.property_ids ?? [];
    setForm({ ...form, property_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] });
  };

  if (loadingContacts || loadingTypes) return <div className="pmos-empty" style={{ padding: "28px 0" }}>Loading…</div>;

  const showArchived = filters.status === "archived";
  const activeProperties = properties.filter(p => p.status !== "archived" || form.property_ids?.includes(p.id));

  return (
    <div>
      {/* Toolbar */}
      <div className="pmos-toolbar">
        <input className="search" placeholder="Search name, email, phone, notes…" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        <select value={filters.type_id ?? ""} onChange={e => setFilter("type_id", e.target.value)}>
          <option value="">All types</option>
          {contactTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filters.city ?? ""} onChange={e => setFilter("city", e.target.value)}>
          <option value="">All cities</option>
          {filterOptions?.cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.state ?? ""} onChange={e => setFilter("state", e.target.value)}>
          <option value="">All states</option>
          {filterOptions?.states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.zip ?? ""} onChange={e => setFilter("zip", e.target.value)}>
          <option value="">All ZIPs</option>
          {filterOptions?.zips.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
        <select value={filters.property_id ?? ""} onChange={e => setFilter("property_id", e.target.value)}>
          <option value="">All properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="check">
          <input type="checkbox" checked={showArchived} onChange={e => setFilter("status", e.target.checked ? "archived" : "active")} style={{ width: 14, height: 14, margin: 0 }} />
          Show archived
        </label>
      </div>

      {/* Contact List */}
      <div style={{ marginBottom: 24 }}>
        {contacts.map(c => {
          const isArchived = c.status === "archived";
          const propertyNames = (c.properties ?? []).map(p => p.property?.name).filter(Boolean);
          return (
            <div key={c.id} className="pmos-admin-row" style={isArchived ? { opacity: 0.55 } : {}}>
              <div className="grow">
                <div className="lbl" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {c.name}
                  {isArchived && <span className="pmos-pill muted">archived</span>}
                </div>
                <div className="sub">
                  {[c.contact_type?.name, [c.city, c.state].filter(Boolean).join(", "), c.zip, c.phone, c.email].filter(Boolean).join(" · ")}
                </div>
                {propertyNames.length > 0 && <div className="sub">Properties: {propertyNames.join(", ")}</div>}
              </div>
              <button className="pmos-btn sm" onClick={() => startEdit(c)}>Edit</button>
              {isArchived
                ? <button className="pmos-btn sm" onClick={() => setStatus(c.id, "active")}>Restore</button>
                : <button className="pmos-btn sm ghost-danger" onClick={() => setStatus(c.id, "archived")}>Archive</button>
              }
            </div>
          );
        })}
        {contacts.length === 0 && (
          <div style={{ textAlign: "center", padding: 30, color: "var(--ink-soft)" }}>
            {showArchived ? "No archived contacts match." : "No contacts found."}
          </div>
        )}
      </div>

      <hr className="pmos-divider" />
      <div className="pmos-section-title">Management &amp; Creation</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Contact Types Manager */}
        <div className="pmos-panel">
          <div className="pmos-panel-title">1. Manage Contact Types</div>
          <div className="pmos-chip-row">
            {contactTypes.map(t => (
              <span key={t.id} className="pmos-chip-edit">
                {t.name}{t._count ? ` (${t._count.contacts})` : ""}
                <button title="Rename" onClick={() => handleRenameType(t.id, t.name)}>✎</button>
                <button title="Delete" onClick={() => handleDeleteType(t.id)}>×</button>
              </span>
            ))}
            {contactTypes.length === 0 && <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>No types created yet.</span>}
          </div>
          <div className="pmos-toolbar" style={{ marginBottom: 0 }}>
            <input className="search" placeholder="New type name…" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateType()} />
            <button className="pmos-btn primary sm" onClick={handleCreateType}>Add Type</button>
          </div>
        </div>

        {/* Create / Edit Contact Form */}
        <div className="pmos-panel" id="admin-contact-form">
          <div className="pmos-panel-title">
            {editingId ? `Edit Contact: ${form.name || ""}` : "2. Add New Contact"}
            {editingId && <button className="pmos-btn sm" onClick={cancelEdit}>Cancel edit</button>}
          </div>
          <form onSubmit={handleSave}>
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
            <div className="pmos-field"><label>Mailing Address</label><input value={form.mailing_address} onChange={e => setForm({ ...form, mailing_address: e.target.value })} /></div>
            <div className="pmos-row2">
              <div className="pmos-field"><label>City</label><input list="contact-city-options" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div className="pmos-field"><label>State</label><input list="contact-state-options" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
              <div className="pmos-field"><label>ZIP</label><input value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <datalist id="contact-city-options">{filterOptions?.cities.map(c => <option key={c} value={c} />)}</datalist>
            <datalist id="contact-state-options">{filterOptions?.states.map(s => <option key={s} value={s} />)}</datalist>
            <div className="pmos-field">
              <label>Associated Properties</label>
              {activeProperties.length === 0
                ? <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>No properties yet. Add them in the Properties tab.</div>
                : (
                  <div className="pmos-check-list">
                    {activeProperties.map(p => (
                      <label key={p.id}>
                        <input type="checkbox" checked={form.property_ids?.includes(p.id) ?? false} onChange={() => toggleProperty(p.id)} />
                        {p.name}{p.city ? ` (${p.city})` : ""}
                      </label>
                    ))}
                  </div>
                )}
            </div>
            <div className="pmos-field"><label>Notes</label><textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <button type="submit" className="pmos-btn primary" style={{ marginTop: 8 }}>{editingId ? "Save Changes" : "Create Contact"}</button>
          </form>
        </div>
      </div>
    </div>
  );
};
