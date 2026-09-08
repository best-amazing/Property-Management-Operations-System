import React from "react";
import { PipelineField } from "../types/pmos";

const FIELD_TYPES: { value: PipelineField["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
];

// Helper: turn a list of fields into a stable unique key for the ticket form.
export function fieldMeta(item: PipelineField, fallback: string): PipelineField {
  const key = item.key?.trim() || fallback;
  return { ...item, key };
}

export function FieldBuilder({ fields, onChange }: {
  fields: PipelineField[];
  onChange: (fields: PipelineField[]) => void;
}) {
  const update = (i: number, patch: Partial<PipelineField>) =>
    onChange(fields.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  const remove = (i: number) =>
    onChange(fields.filter((_, idx) => idx !== i));

  const add = () =>
    onChange([...fields, { key: "", label: "", type: "text", required: false, options: [] }]);

  return (
    <div className="pmos-field" style={{ margin: 0 }}>
      <label>Ticket form fields — admin picks what appears on the New ticket form</label>
      <div className="pmos-dyn-rows">
        {fields.map((f, i) => (
          <div key={i} className="pmos-dyn-row" style={{ flexWrap: "wrap", gap: 6, border: "1px solid var(--line)", borderRadius: 6, padding: 6 }}>
            <select
              style={{ flex: "0 0 130px" }}
              value={f.type}
              onChange={e => update(i, { type: e.target.value as PipelineField["type"] })}
            >
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              style={{ flex: "1 1 120px" }}
              placeholder="Field label (e.g. Property, Motivation)"
              value={f.label}
              onChange={e => update(i, { label: e.target.value })}
            />
            <input
              style={{ flex: "1 1 90px" }}
              placeholder="key (e.g. motivation)"
              value={f.key}
              onChange={e => update(i, { key: e.target.value })}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, flex: "0 0 auto" }}>
              <input type="checkbox" checked={!!f.required} onChange={e => update(i, { required: e.target.checked })} />
              Required
            </label>
            <button type="button" className="pmos-row-x" onClick={() => remove(i)}>&times;</button>
            {f.type === "select" && (
              <input
                style={{ flex: "1 1 100%", marginTop: 4 }}
                placeholder="Dropdown options, comma separated (e.g. Hot, Warm, Cold)"
                value={(f.options ?? []).join(", ")}
                onChange={e => update(i, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              />
            )}
          </div>
        ))}
      </div>
      <button type="button" className="pmos-btn sm" onClick={add}>+ Add field</button>
    </div>
  );
}
