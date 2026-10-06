import React, { useState } from "react";
import toast from "react-hot-toast";
import { pmosApi } from "../services/pmosApi";
import { Contact, ContactType, CreateContactRequest, Property } from "../types/pmos";

type PropertyOption = Pick<Property, "id" | "name" | "city">;

// Edit one contact's details: name, contact info, the fields the directory
// filters on (type, city, state, ZIP, properties) and notes.
export const ContactEditModal: React.FC<{
  contact: Contact;
  contactTypes: ContactType[];
  properties: PropertyOption[];
  cities?: string[];
  states?: string[];
  onClose: () => void;
  onSaved: (contact: Contact) => void;
}> = ({ contact, contactTypes, properties, cities = [], states = [], onClose, onSaved }) => {
  const [form, setForm] = useState<CreateContactRequest>({
    name: contact.name, type_id: contact.type_id, phone: contact.phone ?? "", email: contact.email ?? "",
    mailing_address: contact.mailing_address ?? "", city: contact.city ?? "", state: contact.state ?? "", zip: contact.zip ?? "",
    notes: contact.notes ?? "", property_ids: (contact.properties ?? []).map(p => p.property_id),
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof CreateContactRequest, value: string) => setForm(f => ({ ...f, [key]: value }));
  const toggleProperty = (id: string) => {
    const ids = form.property_ids ?? [];
    setForm({ ...form, property_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] });
  };

  // Keep properties the contact is already linked to visible, even if archived
  const linked = (contact.properties ?? []).filter(p => !properties.some(o => o.id === p.property_id))
    .map(p => ({ id: p.property_id, name: p.property?.name ?? "Archived property", city: undefined }));
  const propertyOptions: PropertyOption[] = [...properties, ...linked];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.type_id) { toast.error("Name and type are required."); return; }
    setSaving(true);
    try {
      const saved = await pmosApi.updateContact(contact.id, form);
      toast.success("Contact updated");
      onSaved(saved);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pmos-modal-bg show" onClick={onClose}>
      <div className="pmos-modal wide" onClick={e => e.stopPropagation()}>
        <h3>Edit contact</h3>
        <form onSubmit={handleSave}>
          <div className="pmos-row2">
            <div className="pmos-field"><label>Full Name / Company</label><input value={form.name} onChange={e => set("name", e.target.value)} required autoFocus /></div>
            <div className="pmos-field"><label>Contact Type</label>
              <select value={form.type_id} onChange={e => set("type_id", e.target.value)} required>
                <option value="">Select…</option>
                {contactTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="pmos-row2">
            <div className="pmos-field"><label>Phone</label><input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
            <div className="pmos-field"><label>Email</label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
          </div>
          <div className="pmos-field"><label>Mailing Address</label><input value={form.mailing_address} onChange={e => set("mailing_address", e.target.value)} /></div>
          <div className="pmos-row2">
            <div className="pmos-field"><label>City</label><input list="edit-contact-cities" value={form.city} onChange={e => set("city", e.target.value)} /></div>
            <div className="pmos-field"><label>State</label><input list="edit-contact-states" value={form.state} onChange={e => set("state", e.target.value)} /></div>
            <div className="pmos-field"><label>ZIP</label><input value={form.zip} onChange={e => set("zip", e.target.value)} /></div>
          </div>
          <datalist id="edit-contact-cities">{cities.map(c => <option key={c} value={c} />)}</datalist>
          <datalist id="edit-contact-states">{states.map(s => <option key={s} value={s} />)}</datalist>
          <div className="pmos-field">
            <label>Associated Properties</label>
            {propertyOptions.length === 0
              ? <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>No properties yet. Add them in Admin settings → Properties.</div>
              : (
                <div className="pmos-check-list">
                  {propertyOptions.map(p => (
                    <label key={p.id}>
                      <input type="checkbox" checked={form.property_ids?.includes(p.id) ?? false} onChange={() => toggleProperty(p.id)} />
                      {p.name}{p.city ? ` (${p.city})` : ""}
                    </label>
                  ))}
                </div>
              )}
          </div>
          <div className="pmos-field"><label>Notes</label><textarea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          <div className="pmos-modal-actions">
            <button type="button" className="pmos-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="pmos-btn primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
