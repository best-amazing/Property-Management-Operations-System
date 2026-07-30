import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { pmosApi } from "../services/pmosApi";
import { User, Pipeline } from "../types/pmos";
import { avatarSwatch, initials } from "../utils/ui";
import { usePipelines, useUsers, QUERY_KEYS } from "../hooks/useApi";

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
  const qc = useQueryClient();
  const { data: users = [], isLoading: usersLoading, isError: usersError } = useUsers();
  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines();
  const [activeTab, setActiveTab] = useState<"team" | "services">("team");

  // Team form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "staff">("staff");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "staff">("staff");
  const [editPassword, setEditPassword] = useState("");

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

  // Edit service state
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
  const [editSvcName, setEditSvcName] = useState("");
  const [editSvcCode, setEditSvcCode] = useState("");
  const [editSvcStages, setEditSvcStages] = useState<string[]>([]);
  const [editSvcTagLabel, setEditSvcTagLabel] = useState("Priority");
  const [editSvcTags, setEditSvcTags] = useState<{ name: string; swatch: string; sla: number }[]>([]);
  const [editSvcCatLabel, setEditSvcCatLabel] = useState("Category");
  const [editSvcCatOptions, setEditSvcCatOptions] = useState("");
  const [editSvcChecklist, setEditSvcChecklist] = useState("");

  useEffect(() => {
    if (usersError) navigate("/login");
  }, [usersError, navigate]);

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
    qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Remove this user?")) return;
    await pmosApi.deleteUser(id);
    qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
  };

  const startEdit = (u: User) => {
    setEditingUserId(u.id);
    setEditName(u.display_name);
    setEditRole(u.role);
    setEditPassword("");
  };

  const saveEdit = async () => {
    if (!editingUserId) return;
    await pmosApi.updateUser(editingUserId, { display_name: editName, role: editRole, ...(editPassword ? { password: editPassword } : {}) });
    setEditingUserId(null);
    toast.success("Team member updated");
    qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
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
    qc.invalidateQueries({ queryKey: QUERY_KEYS.pipelines });
  };

  const handleDeletePipeline = async (id: string) => {
    const p = pipelines.find(p => p.id === id);
    if (!p) return;
    const count = 0; // We don't have ticket count easily here
    if (!confirm(`Delete "${p.label}"? This will also delete all tickets in this service.`)) return;
    await pmosApi.deletePipeline(id);
    qc.invalidateQueries({ queryKey: QUERY_KEYS.pipelines });
  };

  // Edit pipeline handlers
  const addEditStage = () => setEditSvcStages(prev => [...prev, ""]);
  const removeEditStage = (i: number) => setEditSvcStages(prev => prev.filter((_, idx) => idx !== i));
  const updateEditStage = (i: number, val: string) => setEditSvcStages(prev => prev.map((s, idx) => idx === i ? val : s));

  const addEditTag = () => setEditSvcTags(prev => [...prev, { name: "", swatch: "Slate", sla: 5 }]);
  const removeEditTag = (i: number) => setEditSvcTags(prev => prev.filter((_, idx) => idx !== i));
  const updateEditTag = (i: number, d: { name?: string; swatch?: string; sla?: number }) =>
    setEditSvcTags(prev => prev.map((t, idx) => idx === i ? { ...t, ...d } : t));

  const startEditPipeline = (p: Pipeline) => {
    setEditingPipelineId(p.id);
    setEditSvcName(p.label);
    setEditSvcCode(p.code);
    setEditSvcStages(p.stages as string[]);
    setEditSvcTagLabel((p.tag_field as any)?.label ?? "Priority");
    setEditSvcTags(((p.tag_field as any)?.options ?? []).map((o: any) => ({
      name: o.name, swatch: o.swatch ?? "Slate", sla: o.slaDays ?? 5,
    })));
    setEditSvcCatLabel((p.category_field as any)?.label ?? "Category");
    setEditSvcCatOptions(((p.category_field as any)?.options ?? []).join(", "));
    setEditSvcChecklist((p.default_checklist ?? []).join("\n"));
  };

  const handleUpdatePipeline = async () => {
    if (!editingPipelineId) return;
    const stages = editSvcStages.map(s => s.trim()).filter(Boolean);
    if (!editSvcName.trim()) { toast.error("Service name is required."); return; }
    if (stages.length < 2) { toast.error("Add at least 2 stages."); return; }
    const tagOptions = editSvcTags.filter(t => t.name.trim()).map(t => ({ name: t.name.trim(), swatch: t.swatch, slaDays: t.sla }));
    const finalTagOptions = tagOptions.length ? tagOptions : [{ name: "Standard", swatch: "Pine", slaDays: 5 }];
    const catOptions = editSvcCatOptions.split(",").map(s => s.trim()).filter(Boolean);
    const defaultChecklist = editSvcChecklist.split("\n").map(s => s.trim()).filter(Boolean);

    await pmosApi.updatePipeline(editingPipelineId, {
      label: editSvcName.trim(),
      code: editSvcCode.trim().toUpperCase(),
      stages,
      tag_field: { label: editSvcTagLabel.trim() || "Priority", options: finalTagOptions },
      category_field: { label: editSvcCatLabel.trim() || "Category", options: catOptions.length ? catOptions : ["General"] },
      default_checklist: defaultChecklist,
    });
    setEditingPipelineId(null);
    toast.success("Service updated");
    qc.invalidateQueries({ queryKey: QUERY_KEYS.pipelines });
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
            {usersLoading ? (
              <div className="pmos-note-empty" style={{ textAlign: "center", padding: 24 }}>Loading team members…</div>
            ) : users.map(u => {
              const sw = avatarSwatch(u.display_name);
              const isEditing = editingUserId === u.id;
              return (
                <div key={u.id} className="pmos-admin-row">
                  <span className="pmos-avatar" style={{ width: 30, height: 30, fontSize: 12, background: sw.color }}>{initials(u.display_name)}</span>
                  {isEditing ? (
                    <div className="grow" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <div className="pmos-field" style={{ margin: 0, flex: "1 1 140px" }}><input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" /></div>
                      <div className="pmos-field" style={{ margin: 0, width: 100 }}><select value={editRole} onChange={e => setEditRole(e.target.value as any)}><option value="staff">Staff</option><option value="admin">Admin</option></select></div>
                      <div className="pmos-field" style={{ margin: 0, flex: "1 1 120px" }}><input value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="New password (leave blank)" /></div>
                      <button className="pmos-btn sm" onClick={saveEdit}>Save</button>
                      <button className="pmos-btn sm" onClick={() => setEditingUserId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="grow">
                      <div className="lbl">{u.display_name} <span className={`pmos-role-badge ${u.role}`}>{u.role}</span></div>
                      <div className="sub">username: {u.username}</div>
                    </div>
                  )}
                  <button className="pmos-btn sm" onClick={() => startEdit(u)} style={{ marginRight: 6 }}>Edit</button>
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
            {pipelinesLoading ? (
              <div className="pmos-note-empty" style={{ textAlign: "center", padding: 24 }}>Loading services…</div>
            ) : pipelines.map(p => {
              const isEditing = editingPipelineId === p.id;
              return (
                <div key={p.id} className="pmos-admin-row" style={{ flexWrap: "wrap" }}>
                  {isEditing ? (
                    <div className="grow" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div className="pmos-row2">
                        <div className="pmos-field" style={{ margin: 0 }}><label>Service name</label><input value={editSvcName} onChange={e => setEditSvcName(e.target.value)} /></div>
                        <div className="pmos-field" style={{ margin: 0, maxWidth: 90 }}><label>Code</label><input maxLength={3} value={editSvcCode} onChange={e => setEditSvcCode(e.target.value)} /></div>
                      </div>
                      <div className="pmos-field" style={{ margin: 0 }}>
                        <label>Stages</label>
                        <div className="pmos-dyn-rows">
                          {editSvcStages.map((s, i) => (
                            <div key={i} className="pmos-dyn-row">
                              <input className="svc-stage-input" placeholder="Stage name" value={s} onChange={e => updateEditStage(i, e.target.value)} />
                              <button type="button" className="pmos-row-x" onClick={() => removeEditStage(i)}>&times;</button>
                            </div>
                          ))}
                        </div>
                        <button type="button" className="pmos-btn sm" onClick={addEditStage}>+ Add stage</button>
                      </div>
                      <div className="pmos-row2">
                        <div className="pmos-field" style={{ margin: 0 }}><label>Priority label</label><input value={editSvcTagLabel} onChange={e => setEditSvcTagLabel(e.target.value)} /></div>
                      </div>
                      <div className="pmos-field" style={{ margin: 0 }}>
                        <label>Priority options &amp; SLA (days)</label>
                        <div className="pmos-dyn-rows">
                          {editSvcTags.map((t, i) => (
                            <TagRow key={i} name={t.name} swatch={t.swatch} sla={t.sla} onChange={d => updateEditTag(i, d)} onRemove={() => removeEditTag(i)} />
                          ))}
                        </div>
                        <button type="button" className="pmos-btn sm" onClick={addEditTag}>+ Add priority option</button>
                      </div>
                      <div className="pmos-row2">
                        <div className="pmos-field" style={{ margin: 0 }}><label>Category label</label><input value={editSvcCatLabel} onChange={e => setEditSvcCatLabel(e.target.value)} /></div>
                        <div className="pmos-field" style={{ margin: 0 }}><label>Category options (comma separated)</label><input value={editSvcCatOptions} onChange={e => setEditSvcCatOptions(e.target.value)} /></div>
                      </div>
                      <div className="pmos-field" style={{ margin: 0 }}><label>Default checklist (one per line)</label><textarea value={editSvcChecklist} onChange={e => setEditSvcChecklist(e.target.value)} /></div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="pmos-btn primary sm" onClick={handleUpdatePipeline}>Save</button>
                        <button className="pmos-btn sm" onClick={() => setEditingPipelineId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="pmos-code-badge">{p.code}</span>
                      <div className="grow">
                        <div className="lbl">{p.label}</div>
                        <div className="sub">{(p.stages as string[]).length} stages</div>
                      </div>
                      <button className="pmos-btn sm" onClick={() => startEditPipeline(p)} style={{ marginRight: 6 }}>Edit</button>
                      <button className="pmos-btn sm ghost-danger" onClick={() => handleDeletePipeline(p.id)}>Delete</button>
                    </>
                  )}
                </div>
              );
            })}
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
