import React, { useState } from "react";
import toast from "react-hot-toast";
import { pmosApi } from "../services/pmosApi";
import { BulkPropertyMode, BulkUpdateContactsRequest, ContactType, Property } from "../types/pmos";

type Field = "type_id" | "city" | "state" | "zip" | "status";

// Apply the same changes to every selected contact. Only ticked fields are
// changed; leaving a ticked city/state/ZIP blank clears it.
export const ContactBulkEditModal: React.FC<{
  ids: string[];
  contactTypes: ContactType[];
  properties: Pick<Property, "id" | "name" | "city">[];
  cities?: string[];
  states?: string[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ ids, contactTypes, properties, cities = [], states = [], onClose, onSaved }) => {
  const [enabled, setEnabled] = useState<Record<Field, boolean>>({ type_id: false, city: false, state: false, zip: false, status: false });
  const [values, setValues] = useState<Record<Field, string>>({ type_id: "", city: "", state: "", zip: "", status: "active" });
  const [propMode, setPropMode] = useState<BulkPropertyMode | "">("");
  const [propIds, setPropIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (f: Field) => setEnabled(e => ({ ...e, [f]: !e[f] }));
  const setValue = (f: Field, v: string) => setValues(s => ({ ...s, [f]: v }));
  const toggleProp = (id: string) => setPropIds(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  const changedFields = (Object.keys(enabled) as Field[]).filter(f => enabled[f]);
  const nothingToDo = changedFields.length === 0 && !propMode;

  const handleSave = async () => {
    if (enabled.type_id && !values.type_id) { toast.error("Pick a contact type."); return; }
    if (propMode && propMode !== "replace" && propIds.length === 0) { toast.error("Pick at least one property."); return; }
    if (propMode === "replace" && propIds.length === 0 &&
      !confirm(`This removes every property link from ${ids.length} contact(s). Continue?`)) return;
    if (enabled.status && values.status === "archived" && !confirm(`Archive ${ids.length} contact(s)?`)) return;

    const req: BulkUpdateContactsRequest = { ids };
    if (changedFields.length) req.changes = Object.fromEntries(changedFields.map(f => [f, values[f]]));
    if (propMode) req.properties = { mode: propMode, ids: propIds };

    setSaving(true);
    try {
      const { updated } = await pmosApi.bulkUpdateContacts(req);
      toast.success(`Updated ${updated} contact${updated === 1 ? "" : "s"}`);
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const row = (f: Field, label: string, input: React.ReactNode) => (
    <div className="pmos-field">
      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
        <input type="checkbox" checked={enabled[f]} onChange={() => toggle(f)} style={{ width: 14, height: 14, margin: 0 }} />
        Change {label}
      </label>
      {enabled[f] && input}
    </div>
  );

  return (
    <div className="pmos-modal-bg show" onClick={onClose}>
      <div className="pmos-modal wide" onClick={e => e.stopPropagation()}>
        <h3>Edit {ids.length} selected contact{ids.length === 1 ? "" : "s"}</h3>
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 14 }}>
          Tick the fields to change. Everything else stays as it is. A ticked city, state or ZIP left blank is cleared.
        </div>

        {row("type_id", "contact type", (
          <select value={values.type_id} onChange={e => setValue("type_id", e.target.value)}>
            <option value="">Select…</option>
            {contactTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        ))}
        <div className="pmos-row2">
          {row("city", "city", <input list="bulk-contact-cities" value={values.city} onChange={e => setValue("city", e.target.value)} />)}
          {row("state", "state", <input list="bulk-contact-states" value={values.state} onChange={e => setValue("state", e.target.value)} />)}
          {row("zip", "ZIP", <input value={values.zip} onChange={e => setValue("zip", e.target.value)} />)}
        </div>
        <datalist id="bulk-contact-cities">{cities.map(c => <option key={c} value={c} />)}</datalist>
        <datalist id="bulk-contact-states">{states.map(s => <option key={s} value={s} />)}</datalist>
        {row("status", "status", (
          <select value={values.status} onChange={e => setValue("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        ))}

        <div className="pmos-field">
          <label>Associated properties</label>
          <select value={propMode} onChange={e => setPropMode(e.target.value as BulkPropertyMode | "")}>
            <option value="">Keep as they are</option>
            <option value="add">Add these properties</option>
            <option value="remove">Remove these properties</option>
            <option value="replace">Replace with exactly these properties</option>
          </select>
          {propMode && (
            properties.length === 0
              ? <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>No properties yet.</div>
              : (
                <div className="pmos-check-list" style={{ marginTop: 6 }}>
                  {properties.map(p => (
                    <label key={p.id}>
                      <input type="checkbox" checked={propIds.includes(p.id)} onChange={() => toggleProp(p.id)} />
                      {p.name}{p.city ? ` (${p.city})` : ""}
                    </label>
                  ))}
                </div>
              )
          )}
        </div>

        <div className="pmos-modal-actions">
          <button className="pmos-btn" onClick={onClose}>Cancel</button>
          <button className="pmos-btn primary" disabled={saving || nothingToDo} onClick={handleSave}>
            {saving ? "Saving…" : `Update ${ids.length} contact${ids.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
};
