import React, { useRef, useState } from "react";
import toast from "react-hot-toast";
import { pmosApi } from "../services/pmosApi";
import { ContactType, ImportContactRow, ImportRowResult, Property } from "../types/pmos";
import { parseVCards, ParsedVCardContact } from "../utils/vcard";

const MAX_ROWS = 5000;
const PAGE_SIZE = 100;

interface Row extends ParsedVCardContact {
  type_id: string;
  selected: boolean;
  result?: ImportRowResult;
}

type Filter = "all" | "ready" | "duplicate" | "invalid";

const toPayload = (r: Row): ImportContactRow => ({
  name: r.name, type_id: r.type_id, phone: r.phone, email: r.email, mailing_address: r.mailing_address,
  city: r.city, state: r.state, zip: r.zip, notes: r.notes,
  // Ticking a flagged duplicate means "import it anyway"
  allow_duplicate: r.result?.status === "duplicate" ? true : undefined,
});

const statusPill = (r: Row) => {
  const res = r.result;
  if (!res) return <span className="pmos-pill muted">checking…</span>;
  const detail = (text: string) => <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 3, minWidth: 140 }}>{text}</div>;
  if (res.status === "invalid") return <><span className="pmos-pill danger">Problem</span>{detail(res.error ?? "")}</>;
  if (res.status === "duplicate") {
    const d = res.duplicate_of!;
    return <><span className="pmos-pill warn">Duplicate</span>{detail(`Same ${d.reason} as ${d.name}${d.in_file ? " (earlier in this file)" : ""}`)}</>;
  }
  return <span className="pmos-pill">New</span>;
};

export const ContactImport: React.FC<{
  contactTypes: ContactType[];
  properties: Property[];
  onImported: () => void;
}> = ({ contactTypes, properties, onImported }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [defaultType, setDefaultType] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setRows([]);
    setFileName("");
    setPropertyIds([]);
    setFilter("all");
    setVisible(PAGE_SIZE);
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!defaultType) { toast.error("Choose a default contact type first."); return; }
    let parsed: ParsedVCardContact[];
    try {
      parsed = parseVCards(await file.text());
    } catch {
      toast.error("Couldn't read that file. Is it a .vcf contacts export?");
      return;
    }
    if (!parsed.length) { toast.error("No contacts found in that file."); return; }
    if (parsed.length > MAX_ROWS) { toast.error(`That file has ${parsed.length} contacts. The limit is ${MAX_ROWS} per import.`); return; }

    // A vCard CATEGORIES value that matches an existing type name wins over the default
    const typeByName = new Map(contactTypes.map(t => [t.name.toLowerCase(), t.id]));
    const initial: Row[] = parsed.map(c => ({
      ...c,
      type_id: c.categories.map(cat => typeByName.get(cat.toLowerCase())).find(Boolean) ?? defaultType,
      selected: false,
    }));
    setFileName(file.name);
    setRows(initial);
    setFilter("all");
    setVisible(PAGE_SIZE);

    // Dry run: the server validates every row and flags duplicates
    setBusy(true);
    try {
      const { results } = await pmosApi.importContacts({ contacts: initial.map(toPayload), dry_run: true });
      setRows(initial.map((r, i) => ({ ...r, result: results[i], selected: results[i].status === "ready" })));
    } catch (e: any) {
      toast.error(e.message);
      reset();
    } finally {
      setBusy(false);
    }
  };

  const update = (index: number, patch: Partial<Row>) =>
    setRows(rs => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const importable = rows.filter(r => r.result && r.result.status !== "invalid");
  const selected = rows.filter(r => r.selected);
  const counts = {
    all: rows.length,
    ready: rows.filter(r => r.result?.status === "ready").length,
    duplicate: rows.filter(r => r.result?.status === "duplicate").length,
    invalid: rows.filter(r => r.result?.status === "invalid").length,
  };
  const shown = rows.map((r, index) => ({ r, index })).filter(({ r }) => filter === "all" || r.result?.status === filter);
  const allShownSelected = shown.length > 0 && shown.every(({ r }) => r.selected || r.result?.status === "invalid");

  const toggleAllShown = () => {
    const ids = new Set(shown.filter(({ r }) => r.result?.status !== "invalid").map(({ index }) => index));
    setRows(rs => rs.map((r, i) => (ids.has(i) ? { ...r, selected: !allShownSelected } : r)));
  };

  const handleImport = async () => {
    if (!selected.length) { toast.error("Select at least one contact to import."); return; }
    setBusy(true);
    try {
      const { summary } = await pmosApi.importContacts({
        contacts: selected.map(toPayload),
        property_ids: propertyIds.length ? propertyIds : undefined,
      });
      const skipped = summary.duplicate + summary.invalid;
      toast.success(`Imported ${summary.created} contact${summary.created === 1 ? "" : "s"}${skipped ? ` · ${skipped} skipped` : ""}`);
      reset();
      onImported();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const activeProperties = properties.filter(p => p.status !== "archived");

  return (
    <div className="pmos-panel">
      <div className="pmos-panel-title">
        3. Import from vCard (.vcf)
        {rows.length > 0 && <button className="pmos-btn sm" onClick={reset} disabled={busy}>Start over</button>}
      </div>

      {contactTypes.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Create a contact type first (section 1), then come back to import.</div>
      ) : rows.length === 0 ? (
        <>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 12px" }}>
            Upload contacts exported from a phone, Google Contacts or Outlook. You'll see a preview before anything is saved.
          </p>
          <div className="pmos-row2">
            <div className="pmos-field">
              <label>Default contact type</label>
              <select value={defaultType} onChange={e => setDefaultType(e.target.value)}>
                <option value="">Select…</option>
                {contactTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="pmos-field">
              <label>vCard file</label>
              <input
                ref={fileInput}
                type="file"
                accept=".vcf,.vcard,text/vcard,text/x-vcard"
                disabled={!defaultType || busy}
                onChange={e => handleFile(e.target.files?.[0])}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12.5, marginBottom: 10 }}>
            <b>{fileName}</b> · {rows.length} contact{rows.length === 1 ? "" : "s"} found
            {busy && !rows[0]?.result && " · checking for duplicates…"}
          </div>

          <div className="pmos-toolbar">
            {(["all", "ready", "duplicate", "invalid"] as Filter[]).map(f => (
              <button key={f} className={`pmos-seg-btn ${filter === f ? "active" : ""}`} onClick={() => { setFilter(f); setVisible(PAGE_SIZE); }}>
                {{ all: "All", ready: "New", duplicate: "Duplicates", invalid: "Problems" }[f]} ({counts[f]})
              </button>
            ))}
          </div>

          <div className="pmos-table-scroll" style={{ maxHeight: 380, overflowY: "auto", marginBottom: 12 }}>
            <table className="pmos-table">
              <thead>
                <tr>
                  <th style={{ width: 28 }}>
                    <input type="checkbox" aria-label="Select all shown" checked={allShownSelected} onChange={toggleAllShown} style={{ margin: 0 }} />
                  </th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, visible).map(({ r, index }) => {
                  const invalid = r.result?.status === "invalid";
                  return (
                    <tr key={index} style={{ cursor: "default", opacity: invalid ? 0.55 : 1 }}>
                      <td>
                        <input type="checkbox" aria-label={`Import ${r.name || "contact"}`} disabled={invalid || !r.result} checked={r.selected} onChange={e => update(index, { selected: e.target.checked })} style={{ margin: 0 }} />
                      </td>
                      <td style={{ fontWeight: 600 }} title={r.notes || undefined}>{r.name || <i style={{ color: "var(--ink-soft)" }}>No name</i>}</td>
                      <td style={{ color: "var(--ink-soft)" }}>{r.phone || "—"}</td>
                      <td style={{ color: "var(--ink-soft)" }}>{r.email || "—"}</td>
                      <td style={{ color: "var(--ink-soft)" }}>{[r.city, r.state, r.zip].filter(Boolean).join(", ") || "—"}</td>
                      <td>
                        <select value={r.type_id} disabled={invalid} onChange={e => update(index, { type_id: e.target.value })} style={{ fontSize: 12, padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 5, background: "var(--surface)" }}>
                          {contactTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>
                      <td>{statusPill(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shown.length > visible && (
              <div style={{ textAlign: "center", padding: 10 }}>
                <button className="pmos-btn sm" onClick={() => setVisible(v => v + PAGE_SIZE)}>Show more ({shown.length - visible} remaining)</button>
              </div>
            )}
            {shown.length === 0 && <div className="pmos-empty" style={{ padding: 16 }}>Nothing here.</div>}
          </div>

          {activeProperties.length > 0 && (
            <div className="pmos-field">
              <label>Link imported contacts to properties (optional)</label>
              <div className="pmos-check-list">
                {activeProperties.map(p => (
                  <label key={p.id}>
                    <input
                      type="checkbox"
                      checked={propertyIds.includes(p.id)}
                      onChange={() => setPropertyIds(ids => (ids.includes(p.id) ? ids.filter(x => x !== p.id) : [...ids, p.id]))}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button className="pmos-btn primary" onClick={handleImport} disabled={busy || !selected.length}>
              {busy ? "Working…" : `Import ${selected.length} contact${selected.length === 1 ? "" : "s"}`}
            </button>
            <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
              Duplicates are skipped unless you tick them. {importable.length - selected.length > 0 && `${importable.length - selected.length} not selected.`}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
