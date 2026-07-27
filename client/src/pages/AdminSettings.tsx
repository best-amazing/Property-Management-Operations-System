import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { pmosApi } from "../services/pmosApi";
import { User, Pipeline } from "../types/pmos";
import { avatarSwatch, initials } from "../utils/ui";

const PALETTE = [
  { name: "Rust", color: "#B23A2E", soft: "#F6DEDA" },
  { name: "Amber", color: "#D98E3B", soft: "#F8E9D3" },
  { name: "Pine", color: "#1F4B43", soft: "#E4ECE9" },
  { name: "Slate", color: "#5B6660", soft: "#E7E9E5" },
  { name: "Plum", color: "#6B3F69", soft: "#EBE0EA" },
  { name: "Teal", color: "#1E6E73", soft: "#DCEBEC" },
  { name: "Coral", color: "#C75450", soft: "#F5DEDC" },
  { name: "Graphite", color: "#33403B", soft: "#E2E6E3" },
];

function TagRow({ name, swatch, sla, onChange, onRemove }: {
  name: string; swatch: string; sla: number; onChange: (d: { name?: string; swatch?: string; sla?: number }) => void; onRemove: () => void;
}) {
  return (
    <div className="pmos-dyn-row tag-row">
      <input className="svc-tag-name" placeholder="e.g. Hot" value={name} onChange={e => onChange({ name: e.target.value })} />
      <select className="svc-tag-swatch" style={{ flex: "0 0 110px" }} value={swatch} onChange={e => onChange({ swatch: e.target.value })}>
        {PALETTE.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
      </select>
      <input className="svc-tag-sla" type="number" min={1} value={sla} onChange={e => onChange({ sla: Math.max(1, parseInt(e.target.value, 10) || 5) })} style={{ flex: "0 0 60px" }} title="SLA days" />
      <button type="button" className="pmos-row-x" onClick={onRemove}>&times;</button>
    </div>
  );
}

export const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activeTab, setActiveTab] = useState<"team" | "services">("team");

  // Team form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "staff">("staff");

  // Services form state
  const [svcName, setSvcName] = useState("");
  const [svcCode, setSvcCode] = useState("");
  const [svcStages, setSvcStages] = useState<string[]>(["", "", ""]);
  const [svcTagLabel, setSvcTagLabel] = useState("Priority");
  const [svcTags, setSvcTags] = useState<{ name: string; swatch: string; sla: number }[]>([
    { name: "Standard", swatch: "Pine", sla: 5 },
    { name: "Rush", swatch: "Amber", sla: 2 },
  ]);
  const [svcCatLabel, setSvcCatLabel] = useState("Category");
  const [svcCatOptions, setSvcCatOptions] = useState("");
  const [svcChecklist, setSvcChecklist] = useState("");

  const load = () => {
    pmosApi.getUsers().then(setUsers).catch(() => navigate("/login"));
    pmosApi.getPipelines().then(setPipelines).catch(() => {});
  };

  useEffect(load, [navigate]);

  const token = localStorage.getItem("token");
  if (!token) { navigate("/login"); return null; }
  let currentRole = "staff";
  try { currentRole = JSON.parse(atob(token.split(".")[1])).role; } catch {}
  if (currentRole !== "admin") { navigate("/"); return null; }

  // Team
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await pmosApi.createUser({ username: newUsername, password: newPassword, display_name: newDisplayName, role: newRole });
    setNewUsername(""); setNewPassword(""); setNewDisplayName("");
    toast.success("Team member created");
    load();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Remove this user?")) return;
    await pmosApi.deleteUser(id);
    load();
  };

  // Services
  const addStage = () => setSvcStages(prev => [...prev, ""]);
  const removeStage = (i: number) => setSvcStages(prev => prev.filter((_, idx) => idx !== i));
  const updateStage = (i: number, val: string) => setSvcStages(prev => prev.map((s, idx) => idx === i ? val : s));

  const addTag = () => setSvcTags(prev => [...prev, { name: "", swatch: "Slate", sla: 5 }]);
  const removeTag = (i: number) => setSvcTags(prev => prev.filter((_, idx) => idx !== i));
  const updateTag = (i: number, d: { name?: string; swatch?: string; sla?: number }) =>
    setSvcTags(prev => prev.map((t, idx) => idx === i ? { ...t, ...d } : t));

  const handleCreatePipeline = async () => {
    const stages = svcStages.map(s => s.trim()).filter(Boolean);
    if (!svcName.trim()) { toast.error("Service name is required."); return; }
    if (stages.length < 2) { toast.error("Add at least 2 stages."); return; }
    const tagOptions = svcTags.filter(t => t.name.trim()).map(t => ({ name: t.name.trim(), swatch: t.swatch, slaDays: t.sla }));
    const finalTagOptions = tagOptions.length ? tagOptions : [{ name: "Standard", swatch: "Pine", slaDays: 5 }];
    const catOptions = svcCatOptions.split(",").map(s => s.trim()).filter(Boolean);
    const defaultChecklist = svcChecklist.split("\n").map(s => s.trim()).filter(Boolean);
    const code = svcCode.trim().toUpperCase() || String.fromCharCode(65 + pipelines.length);

    await pmosApi.createPipeline({
      label: svcName.trim(),
      code,
      stages,
      tag_field: { label: svcTagLabel.trim() || "Priority", options: finalTagOptions },
      category_field: { label: svcCatLabel.trim() || "Category", options: catOptions.length ? catOptions : ["General"] },
      default_checklist: defaultChecklist,
    });
    toast.success("Service created");
    setSvcName(""); setSvcCode(""); setSvcStages(["", "", ""]); setSvcTagLabel("Priority");
    setSvcTags([{ name: "Standard", swatch: "Pine", sla: 5 }, { name: "Rush", swatch: "Amber", sla: 2 }]);
    setSvcCatLabel("Category"); setSvcCatOptions(""); setSvcChecklist("");
    load();
  };

  const handleDeletePipeline = async (id: string) => {
    const p = pipelines.find(p => p.id === id);
    if (!p) return;
    const count = 0; // We don't have ticket count easily here
    if (!confirm(`Delete "${p.label}"? This will also delete all tickets in this service.`)) return;
    await pmosApi.deletePipeline(id);
    load();
  };

  return (
    <div className="pmos-modal-bg show" style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div className="pmos-modal wide" onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <h3>Admin settings</h3>
        <div className="pmos-modal-tabs">
          <button className={`pmos-seg-btn ${activeTab === "team" ? "active" : ""}`} onClick={() => setActiveTab("team")}>Team</button>
          <button className={`pmos-seg-btn ${activeTab === "services" ? "active" : ""}`} onClick={() => setActiveTab("services")}>Services</button>
        </div>

        {activeTab === "team" && (
          <div>
            {users.map(u => {
              const sw = avatarSwatch(u.display_name);
              return (
                <div key={u.id} className="pmos-admin-row">
                  <span className="pmos-avatar" style={{ width: 30, height: 30, fontSize: 12, background: sw.color }}>{initials(u.display_name)}</span>
                  <div className="grow">
                    <div className="lbl">{u.display_name} <span className={`pmos-role-badge ${u.role}`}>{u.role}</span></div>
                    <div className="sub">username: {u.username}</div>
                  </div>
                  <button className="pmos-btn sm ghost-danger" onClick={() => handleDeleteUser(u.id)}>Remove</button>
                </div>
              );
            })}
            <hr className="pmos-divider" />
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Add a team member</div>
            <form onSubmit={handleCreateUser}>
              <div className="pmos-row2">
                <div className="pmos-field"><label>Username</label><input value={newUsername} onChange={e => setNewUsername(e.target.value)} /></div>
                <div className="pmos-field"><label>Display name</label><input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} /></div>
              </div>
              <div className="pmos-row2">
                <div className="pmos-field"><label>Password</label><input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
                <div className="pmos-field"><label>Role</label><select value={newRole} onChange={e => setNewRole(e.target.value as "admin" | "staff")}><option value="staff">Staff</option><option value="admin">Admin</option></select></div>
              </div>
              <button type="submit" className="pmos-btn primary">Add team member</button>
            </form>
          </div>
        )}

        {activeTab === "services" && (
          <div>
            {pipelines.map(p => (
              <div key={p.id} className="pmos-admin-row">
                <span className="pmos-code-badge">{p.code}</span>
                <div className="grow">
                  <div className="lbl">{p.label}</div>
                  <div className="sub">{(p.stages as string[]).length} stages</div>
                </div>
                <button className="pmos-btn sm ghost-danger" onClick={() => handleDeletePipeline(p.id)}>Delete</button>
              </div>
            ))}
            <hr className="pmos-divider" />
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Add a new service</div>
            <div className="pmos-row2">
              <div className="pmos-field"><label>Service name</label><input placeholder="e.g. Renovations" value={svcName} onChange={e => setSvcName(e.target.value)} /></div>
              <div className="pmos-field" style={{ maxWidth: 90 }}><label>Code</label><input maxLength={3} placeholder="auto" value={svcCode} onChange={e => setSvcCode(e.target.value)} /></div>
            </div>
            <div className="pmos-field">
              <label>Stages (in order — the last stage marks a ticket complete)</label>
              <div className="pmos-dyn-rows">
                {svcStages.map((s, i) => (
                  <div key={i} className="pmos-dyn-row">
                    <input className="svc-stage-input" placeholder="Stage name" value={s} onChange={e => updateStage(i, e.target.value)} />
                    <button type="button" className="pmos-row-x" onClick={() => removeStage(i)}>&times;</button>
                  </div>
                ))}
              </div>
              <button type="button" className="pmos-btn sm" onClick={addStage}>+ Add stage</button>
            </div>
            <div className="pmos-row2">
              <div className="pmos-field"><label>Priority field label</label><input value={svcTagLabel} onChange={e => setSvcTagLabel(e.target.value)} /></div>
            </div>
            <div className="pmos-field">
              <label>Priority options &amp; their overdue SLA (days)</label>
              <div className="pmos-dyn-rows">
                {svcTags.map((t, i) => (
                  <TagRow key={i} name={t.name} swatch={t.swatch} sla={t.sla} onChange={d => updateTag(i, d)} onRemove={() => removeTag(i)} />
                ))}
              </div>
              <button type="button" className="pmos-btn sm" onClick={addTag}>+ Add priority option</button>
            </div>
            <div className="pmos-row2">
              <div className="pmos-field"><label>Category field label</label><input value={svcCatLabel} onChange={e => setSvcCatLabel(e.target.value)} /></div>
              <div className="pmos-field"><label>Category options (comma separated)</label><input placeholder="e.g. Roofing, Painting, Landscaping" value={svcCatOptions} onChange={e => setSvcCatOptions(e.target.value)} /></div>
            </div>
            <div className="pmos-field"><label>Default checklist (one item per line)</label><textarea placeholder="One checklist item per line" value={svcChecklist} onChange={e => setSvcChecklist(e.target.value)} /></div>
            <div className="pmos-modal-actions">
              <button className="pmos-btn primary" onClick={handleCreatePipeline}>Create service</button>
            </div>
          </div>
        )}

        <hr className="pmos-divider" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Danger zone</div>
            <div style={{ fontSize: 12, color: "#888" }}>This only affects tickets — your team and services stay as configured.</div>
          </div>
          <button className="pmos-btn sm ghost-danger" onClick={async () => {
            if (!confirm("Reset all tickets back to the demo set? This only affects tickets — your team and services stay as configured.")) return;
            await pmosApi.resetTickets();
            toast.success("Tickets reset to demo set");
          }}>Reset tickets</button>
        </div>

        <div className="pmos-modal-actions">
          <button className="pmos-btn" onClick={() => navigate("/")}>Close</button>
        </div>
      </div>
    </div>
  );
};
