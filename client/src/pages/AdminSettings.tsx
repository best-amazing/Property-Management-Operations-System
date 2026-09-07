import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { pmosApi } from "../services/pmosApi";
import { User, Pipeline, Department } from "../types/pmos";
import { avatarSwatch, initials } from "../utils/ui";
import { usePipelines, useUsers, useStaffTypes, useTeams, useDepartments, QUERY_KEYS } from "../hooks/useApi";

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

type AdminTab = "team" | "services" | "departments" | "staffTypes" | "teams";

export const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: users = [], isLoading: usersLoading, isError: usersError } = useUsers();
  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines();
  const { data: staffTypes = [] } = useStaffTypes();
  const { data: teams = [] } = useTeams();
  const { data: departments = [] } = useDepartments();

  const [activeTab, setActiveTab] = useState<AdminTab>("team");

  // ── User form state ────────────────────────────────────────────────────────
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "team_lead" | "staff">("staff");
  const [newStaffTypeId, setNewStaffTypeId] = useState("");
  const [newTeamId, setNewTeamId] = useState("");

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "team_lead" | "staff">("staff");
  const [editPassword, setEditPassword] = useState("");
  const [editStaffTypeId, setEditStaffTypeId] = useState("");
  const [editTeamId, setEditTeamId] = useState("");

  // ── Departments ────────────────────────────────────────────────────────────
  const [newDeptName, setNewDeptName] = useState("");
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState("");

  // ── Staff Types ───────────────────────────────────────────────────────────
  const [newStaffTypeName, setNewStaffTypeName] = useState("");
  const [newStaffTypePerms, setNewStaffTypePerms] = useState<string[]>([]);
  const [newStaffTypeDepts, setNewStaffTypeDepts] = useState<string[]>([]);
  const [newStaffTypePipelines, setNewStaffTypePipelines] = useState<string[]>([]);

  // ── Teams ─────────────────────────────────────────────────────────────────
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLeadId, setNewTeamLeadId] = useState("");

  // ── Pipeline create state ─────────────────────────────────────────────────
  const [svcName, setSvcName] = useState("");
  const [svcCode, setSvcCode] = useState("");
  const [svcDeptId, setSvcDeptId] = useState("");
  const [svcStages, setSvcStages] = useState<string[]>(["", "", ""]);
  const [svcTagLabel, setSvcTagLabel] = useState("Priority");
  const [svcTags, setSvcTags] = useState<{ name: string; swatch: string; sla: number }[]>([
    { name: "Standard", swatch: "Pine", sla: 5 },
    { name: "Rush", swatch: "Amber", sla: 2 },
  ]);
  const [svcCatLabel, setSvcCatLabel] = useState("Category");
  const [svcCatOptions, setSvcCatOptions] = useState("");
  const [svcChecklist, setSvcChecklist] = useState("");

  // ── Pipeline edit state ───────────────────────────────────────────────────
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
  const [editSvcName, setEditSvcName] = useState("");
  const [editSvcCode, setEditSvcCode] = useState("");
  const [editSvcDeptId, setEditSvcDeptId] = useState("");
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

  // ── User handlers ──────────────────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await pmosApi.createUser({
      username: newUsername, password: newPassword, display_name: newDisplayName, role: newRole,
      staff_type_id: newStaffTypeId || undefined, team_id: newTeamId || undefined
    });
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
    setEditStaffTypeId(u.staff_type_id || "");
    setEditTeamId(u.team_id || "");
    setEditPassword("");
  };

  const saveEdit = async () => {
    if (!editingUserId) return;
    await pmosApi.updateUser(editingUserId, {
      display_name: editName, role: editRole,
      staff_type_id: editStaffTypeId || undefined, team_id: editTeamId || undefined,
      ...(editPassword ? { password: editPassword } : {})
    });
    setEditingUserId(null);
    toast.success("Team member updated");
    qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
  };

  // ── Department handlers ────────────────────────────────────────────────────
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) { toast.error("Department name is required."); return; }
    await pmosApi.createDepartment({ name: newDeptName.trim() });
    setNewDeptName("");
    toast.success("Department created");
    qc.invalidateQueries({ queryKey: QUERY_KEYS.departments });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.pipelines });
  };

  const startEditDept = (dept: Department) => {
    setEditingDeptId(dept.id);
    setEditDeptName(dept.name);
  };

  const saveEditDept = async () => {
    if (!editingDeptId || !editDeptName.trim()) return;
    await pmosApi.updateDepartment(editingDeptId, { name: editDeptName.trim() });
    setEditingDeptId(null);
    toast.success("Department updated");
    qc.invalidateQueries({ queryKey: QUERY_KEYS.departments });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.pipelines });
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm("Delete this department? Pipelines assigned to it must be reassigned first.")) return;
    try {
      await pmosApi.deleteDepartment(id);
      toast.success("Department deleted");
      qc.invalidateQueries({ queryKey: QUERY_KEYS.departments });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.pipelines });
    } catch (err: any) {
      toast.error(err.message || "Could not delete department");
    }
  };

  // ── Staff Type handlers ────────────────────────────────────────────────────
  const handleCreateStaffType = async (e: React.FormEvent) => {
    e.preventDefault();
    await pmosApi.createStaffType({
      name: newStaffTypeName,
      permissions: newStaffTypePerms,
      allowed_departments: newStaffTypeDepts,
      allowed_pipelines: newStaffTypePipelines,
    });
    setNewStaffTypeName(""); setNewStaffTypePerms([]); setNewStaffTypeDepts([]); setNewStaffTypePipelines([]);
    toast.success("Staff type created");
    qc.invalidateQueries({ queryKey: QUERY_KEYS.staffTypes });
  };

  const handleDeleteStaffType = async (id: string) => {
    if (!confirm("Remove this staff type?")) return;
    await pmosApi.deleteStaffType(id);
    qc.invalidateQueries({ queryKey: QUERY_KEYS.staffTypes });
  };

  // ── Team Group handlers ───────────────────────────────────────────────────
  const handleCreateTeamGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    await pmosApi.createTeam({ name: newTeamName, lead_id: newTeamLeadId || undefined });
    setNewTeamName(""); setNewTeamLeadId("");
    toast.success("Team created");
    qc.invalidateQueries({ queryKey: QUERY_KEYS.teams });
  };

  const handleDeleteTeamGroup = async (id: string) => {
    if (!confirm("Remove this team?")) return;
    await pmosApi.deleteTeam(id);
    qc.invalidateQueries({ queryKey: QUERY_KEYS.teams });
  };

  // ── Pipeline create handlers ───────────────────────────────────────────────
  const addStage = () => setSvcStages(prev => [...prev, ""]);
  const removeStage = (i: number) => setSvcStages(prev => prev.filter((_, idx) => idx !== i));
  const updateStage = (i: number, val: string) => setSvcStages(prev => prev.map((s, idx) => idx === i ? val : s));

  const addTag = () => setSvcTags(prev => [...prev, { name: "", swatch: "Slate", sla: 5 }]);
  const removeTag = (i: number) => setSvcTags(prev => prev.filter((_, idx) => idx !== i));
  const updateTag = (i: number, d: { name?: string; swatch?: string; sla?: number }) =>
    setSvcTags(prev => prev.map((t, idx) => idx === i ? { ...t, ...d } : t));

  const handleCreatePipeline = async () => {
    const stages = svcStages.map(s => s.trim()).filter(Boolean);
    if (!svcName.trim()) { toast.error("Pipeline name is required."); return; }
    if (!svcDeptId) { toast.error("Please select a Department."); return; }
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
      department_id: svcDeptId,
      tag_field: { label: svcTagLabel.trim() || "Priority", options: finalTagOptions },
      category_field: { label: svcCatLabel.trim() || "Category", options: catOptions.length ? catOptions : ["General"] },
      default_checklist: defaultChecklist,
    });
    toast.success("Pipeline created");
    setSvcName(""); setSvcCode(""); setSvcDeptId(""); setSvcStages(["", "", ""]); setSvcTagLabel("Priority");
    setSvcTags([{ name: "Standard", swatch: "Pine", sla: 5 }, { name: "Rush", swatch: "Amber", sla: 2 }]);
    setSvcCatLabel("Category"); setSvcCatOptions(""); setSvcChecklist("");
    qc.invalidateQueries({ queryKey: QUERY_KEYS.pipelines });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.departments });
  };

  const handleDeletePipeline = async (id: string) => {
    const p = pipelines.find(p => p.id === id);
    if (!p) return;
    if (!confirm(`Delete "${p.label}"? This will also delete all tickets in this pipeline.`)) return;
    await pmosApi.deletePipeline(id);
    qc.invalidateQueries({ queryKey: QUERY_KEYS.pipelines });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.departments });
  };

  // ── Pipeline edit handlers ─────────────────────────────────────────────────
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
    setEditSvcDeptId(p.department_id);
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
    if (!editSvcName.trim()) { toast.error("Pipeline name is required."); return; }
    if (!editSvcDeptId) { toast.error("Please select a Department."); return; }
    if (stages.length < 2) { toast.error("Add at least 2 stages."); return; }
    const tagOptions = editSvcTags.filter(t => t.name.trim()).map(t => ({ name: t.name.trim(), swatch: t.swatch, slaDays: t.sla }));
    const finalTagOptions = tagOptions.length ? tagOptions : [{ name: "Standard", swatch: "Pine", slaDays: 5 }];
    const catOptions = editSvcCatOptions.split(",").map(s => s.trim()).filter(Boolean);
    const defaultChecklist = editSvcChecklist.split("\n").map(s => s.trim()).filter(Boolean);

    await pmosApi.updatePipeline(editingPipelineId, {
      label: editSvcName.trim(),
      code: editSvcCode.trim().toUpperCase(),
      stages,
      department_id: editSvcDeptId,
      tag_field: { label: editSvcTagLabel.trim() || "Priority", options: finalTagOptions },
      category_field: { label: editSvcCatLabel.trim() || "Category", options: catOptions.length ? catOptions : ["General"] },
      default_checklist: defaultChecklist,
    });
    setEditingPipelineId(null);
    toast.success("Pipeline updated");
    qc.invalidateQueries({ queryKey: QUERY_KEYS.pipelines });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.departments });
  };

  // ── Derived: pipelines filtered by selected departments for staff type ──────
  const pipelinesForDepts = (deptIds: string[]) =>
    deptIds.length === 0 ? pipelines : pipelines.filter(p => deptIds.includes(p.department_id));

  return (
    <div className="pmos-modal-bg show" style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div className="pmos-modal wide" onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <h3>Admin settings</h3>
        <div className="pmos-modal-tabs">
          <button className={`pmos-seg-btn ${activeTab === "team" ? "active" : ""}`} onClick={() => setActiveTab("team")}>Users</button>
          <button className={`pmos-seg-btn ${activeTab === "teams" ? "active" : ""}`} onClick={() => setActiveTab("teams")}>Teams</button>
          <button className={`pmos-seg-btn ${activeTab === "staffTypes" ? "active" : ""}`} onClick={() => setActiveTab("staffTypes")}>Staff Types</button>
          <button className={`pmos-seg-btn ${activeTab === "departments" ? "active" : ""}`} onClick={() => setActiveTab("departments")}>Departments</button>
          <button className={`pmos-seg-btn ${activeTab === "services" ? "active" : ""}`} onClick={() => setActiveTab("services")}>Pipelines</button>
        </div>

        {/* ── Users tab ──────────────────────────────────────────────────── */}
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
                      <div className="pmos-field" style={{ margin: 0, width: 100 }}><select value={editRole} onChange={e => setEditRole(e.target.value as any)}><option value="staff">Staff</option><option value="team_lead">Team Lead</option><option value="admin">Admin</option></select></div>
                      <div className="pmos-field" style={{ margin: 0, width: 130 }}>
                        <select value={editStaffTypeId} onChange={e => setEditStaffTypeId(e.target.value)}>
                          <option value="">No Staff Type</option>
                          {staffTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                        </select>
                      </div>
                      <div className="pmos-field" style={{ margin: 0, width: 120 }}>
                        <select value={editTeamId} onChange={e => setEditTeamId(e.target.value)}>
                          <option value="">No Team</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <div className="pmos-field" style={{ margin: 0, flex: "1 1 120px" }}><input value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="New pass..." /></div>
                      <button className="pmos-btn sm" onClick={saveEdit}>Save</button>
                      <button className="pmos-btn sm" onClick={() => setEditingUserId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="grow">
                      <div className="lbl">{u.display_name} <span className={`pmos-role-badge ${u.role}`}>{u.role}</span></div>
                      <div className="sub">
                        {u.username}
                        {u.staff_type && ` • ${u.staff_type.name}`}
                        {u.team && ` • Team: ${u.team.name}`}
                      </div>
                    </div>
                  )}
                  <button className="pmos-btn sm" onClick={() => startEdit(u)} style={{ marginRight: 6 }}>Edit</button>
                  <button className="pmos-btn sm ghost-danger" onClick={() => handleDeleteUser(u.id)}>Remove</button>
                </div>
              );
            })}
            <hr className="pmos-divider" />
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Add a user</div>
            <form onSubmit={handleCreateUser}>
              <div className="pmos-row2">
                <div className="pmos-field"><label>Username (Email)</label><input value={newUsername} onChange={e => setNewUsername(e.target.value)} /></div>
                <div className="pmos-field"><label>Display name</label><input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} /></div>
                <div className="pmos-field"><label>Password</label><input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
              </div>
              <div className="pmos-row2">
                <div className="pmos-field"><label>Role</label><select value={newRole} onChange={e => setNewRole(e.target.value as "admin" | "team_lead" | "staff")}><option value="staff">Staff</option><option value="team_lead">Team Lead</option><option value="admin">Admin</option></select></div>
                <div className="pmos-field">
                  <label>Staff Type</label>
                  <select value={newStaffTypeId} onChange={e => setNewStaffTypeId(e.target.value)}>
                    <option value="">None</option>
                    {staffTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                </div>
                <div className="pmos-field">
                  <label>Team</label>
                  <select value={newTeamId} onChange={e => setNewTeamId(e.target.value)}>
                    <option value="">None</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="pmos-btn primary">Add user</button>
            </form>
          </div>
        )}

        {/* ── Teams tab ──────────────────────────────────────────────────── */}
        {activeTab === "teams" && (
          <div>
            {teams.map(t => (
               <div key={t.id} className="pmos-admin-row">
                 <div className="grow">
                   <div className="lbl">{t.name}</div>
                   <div className="sub">Lead: {t.lead?.display_name || "None"} • Members: {t.members?.length || 0}</div>
                 </div>
                 <button className="pmos-btn sm ghost-danger" onClick={() => handleDeleteTeamGroup(t.id)}>Remove</button>
               </div>
            ))}
            <hr className="pmos-divider" />
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Create Team</div>
            <form onSubmit={handleCreateTeamGroup}>
              <div className="pmos-row2">
                <div className="pmos-field"><label>Team Name</label><input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} /></div>
                <div className="pmos-field">
                  <label>Lead</label>
                  <select value={newTeamLeadId} onChange={e => setNewTeamLeadId(e.target.value)}>
                    <option value="">None</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="pmos-btn primary">Create Team</button>
            </form>
          </div>
        )}

        {/* ── Staff Types tab ────────────────────────────────────────────── */}
        {activeTab === "staffTypes" && (
          <div>
            {staffTypes.map(st => (
               <div key={st.id} className="pmos-admin-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                 <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
                   <div className="grow">
                     <div className="lbl">{st.name}</div>
                     <div className="sub">
                       Permissions: {(st.permissions as string[]).join(", ") || "None"}
                     </div>
                     <div className="sub">
                       Departments: {
                         (st.allowed_departments as string[]).length
                           ? (st.allowed_departments as string[])
                               .map(id => departments.find(d => d.id === id)?.name || id)
                               .join(", ")
                           : "All"
                       }
                     </div>
                     <div className="sub">
                       Pipelines: {
                         (st.allowed_pipelines as string[]).length
                           ? (st.allowed_pipelines as string[])
                               .map(id => pipelines.find(p => p.id === id)?.label || id)
                               .join(", ")
                           : "All within departments"
                       }
                     </div>
                   </div>
                   <button className="pmos-btn sm ghost-danger" onClick={() => handleDeleteStaffType(st.id)}>Remove</button>
                 </div>
               </div>
            ))}
            <hr className="pmos-divider" />
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Create Staff Type</div>
            <form onSubmit={handleCreateStaffType}>
              <div className="pmos-row2">
                <div className="pmos-field"><label>Name</label><input value={newStaffTypeName} onChange={e => setNewStaffTypeName(e.target.value)} /></div>
              </div>
              <div className="pmos-field">
                <label>Permissions</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {["view", "create", "edit", "comment", "change_status"].map(p => (
                    <label key={p} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <input type="checkbox" checked={newStaffTypePerms.includes(p)} onChange={e => {
                        if (e.target.checked) setNewStaffTypePerms([...newStaffTypePerms, p]);
                        else setNewStaffTypePerms(newStaffTypePerms.filter(x => x !== p));
                      }} />
                      {p}
                    </label>
                  ))}
                </div>
              </div>

              {/* Department access */}
              <div className="pmos-field">
                <label>Allowed Departments <span style={{ fontWeight: 400, color: "var(--ink-soft)", fontSize: 12 }}>(leave empty = all departments)</span></label>
                <div className="pmos-stafftype-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxHeight: 150, overflowY: "auto", border: "1px solid var(--line)", padding: 12, borderRadius: 6, background: "var(--bg)" }}>
                  {departments.length === 0
                    ? <span style={{ color: "var(--ink-soft)", fontSize: 13, gridColumn: "1 / -1" }}>No departments yet — create one first.</span>
                    : departments.map(d => (
                        <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", color: "var(--ink)" }}>
                          <input type="checkbox" checked={newStaffTypeDepts.includes(d.id)} onChange={e => {
                            if (e.target.checked) {
                              setNewStaffTypeDepts([...newStaffTypeDepts, d.id]);
                            } else {
                              setNewStaffTypeDepts(newStaffTypeDepts.filter(x => x !== d.id));
                              // Also uncheck pipelines that belonged to this dept
                              const deptPipelineIds = pipelines.filter(p => p.department_id === d.id).map(p => p.id);
                              setNewStaffTypePipelines(newStaffTypePipelines.filter(x => !deptPipelineIds.includes(x)));
                            }
                          }} style={{ width: 16, height: 16, margin: 0 }} />
                          {d.name}
                        </label>
                      ))
                  }
                </div>
              </div>

              {/* Pipeline access — filtered by selected depts */}
              <div className="pmos-field">
                <label>
                  Allowed Pipelines
                  <span style={{ fontWeight: 400, color: "var(--ink-soft)", fontSize: 12 }}>
                    {newStaffTypeDepts.length > 0 ? " (within selected departments)" : " (leave empty = all pipelines)"}
                  </span>
                </label>
                <div className="pmos-stafftype-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxHeight: 200, overflowY: "auto", border: "1px solid var(--line)", padding: 12, borderRadius: 6, background: "var(--bg)" }}>
                  {pipelinesForDepts(newStaffTypeDepts).length === 0
                    ? <span style={{ color: "var(--ink-soft)", fontSize: 13, gridColumn: "1 / -1" }}>No pipelines in selected departments.</span>
                    : pipelinesForDepts(newStaffTypeDepts).map(p => (
                        <label key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", color: "var(--ink)" }}>
                          <input type="checkbox" checked={newStaffTypePipelines.includes(p.id)} onChange={e => {
                            if (e.target.checked) setNewStaffTypePipelines([...newStaffTypePipelines, p.id]);
                            else setNewStaffTypePipelines(newStaffTypePipelines.filter(x => x !== p.id));
                          }} style={{ width: 16, height: 16, margin: 0, marginTop: 2 }} />
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span>{p.label}</span>
                            <span style={{ color: "var(--ink-soft)", fontSize: 11, fontWeight: 400 }}>
                              {departments.find(d => d.id === p.department_id)?.name}
                            </span>
                          </div>
                        </label>
                      ))
                  }
                </div>
              </div>

              <button type="submit" className="pmos-btn primary">Create Staff Type</button>
            </form>
          </div>
        )}

        {/* ── Departments tab ────────────────────────────────────────────── */}
        {activeTab === "departments" && (
          <div>
            {departments.map(dept => {
              const deptPipelines = pipelines.filter(p => p.department_id === dept.id);
              const isEditing = editingDeptId === dept.id;
              return (
                <div key={dept.id} className="pmos-admin-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                  <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 8, flex: 1, alignItems: "center" }}>
                        <div className="pmos-field" style={{ margin: 0, flex: 1 }}>
                          <input value={editDeptName} onChange={e => setEditDeptName(e.target.value)} placeholder="Department name" />
                        </div>
                        <button className="pmos-btn sm primary" onClick={saveEditDept}>Save</button>
                        <button className="pmos-btn sm" onClick={() => setEditingDeptId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div className="grow">
                          <div className="lbl">{dept.name}</div>
                          <div className="sub">{deptPipelines.length} pipeline{deptPipelines.length !== 1 ? "s" : ""}</div>
                        </div>
                        <button className="pmos-btn sm" style={{ marginRight: 6 }} onClick={() => startEditDept(dept)}>Edit</button>
                        <button className="pmos-btn sm ghost-danger" onClick={() => handleDeleteDept(dept.id)}>Delete</button>
                      </>
                    )}
                  </div>
                  {!isEditing && deptPipelines.length > 0 && (
                    <div style={{ paddingLeft: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {deptPipelines.map(p => (
                        <span key={p.id} className="pmos-code-badge" style={{ fontSize: 11 }}>
                          {p.code} · {p.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <hr className="pmos-divider" />
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Create Department</div>
            <form onSubmit={handleCreateDept} className="pmos-row2">
              <div className="pmos-field"><input placeholder="e.g. Acquisition Department" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} /></div>
              <button type="submit" className="pmos-btn primary" style={{ marginTop: 0 }}>Create</button>
            </form>
          </div>
        )}

        {/* ── Pipelines tab ─────────────────────────────────────────────── */}
        {activeTab === "services" && (
          <div>
            {pipelinesLoading ? (
              <div className="pmos-note-empty" style={{ textAlign: "center", padding: 24 }}>Loading pipelines…</div>
            ) : pipelines.map(p => {
              const isEditing = editingPipelineId === p.id;
              const deptName = p.department?.name ?? departments.find(d => d.id === p.department_id)?.name ?? "—";
              return (
                <div key={p.id} className="pmos-admin-row" style={{ flexWrap: "wrap" }}>
                  {isEditing ? (
                    <div className="grow" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div className="pmos-row2">
                        <div className="pmos-field" style={{ margin: 0 }}><label>Pipeline name</label><input value={editSvcName} onChange={e => setEditSvcName(e.target.value)} /></div>
                        <div className="pmos-field" style={{ margin: 0, maxWidth: 90 }}><label>Code</label><input maxLength={3} value={editSvcCode} onChange={e => setEditSvcCode(e.target.value)} /></div>
                        <div className="pmos-field" style={{ margin: 0, flex: "1 1 160px" }}>
                          <label>Department</label>
                          <select value={editSvcDeptId} onChange={e => setEditSvcDeptId(e.target.value)}>
                            <option value="">— Select Department —</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
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
                        <div className="sub">{(p.stages as string[]).length} stages • {deptName}</div>
                      </div>
                      <button className="pmos-btn sm" onClick={() => startEditPipeline(p)} style={{ marginRight: 6 }}>Edit</button>
                      <button className="pmos-btn sm ghost-danger" onClick={() => handleDeletePipeline(p.id)}>Delete</button>
                    </>
                  )}
                </div>
              );
            })}
            <hr className="pmos-divider" />
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Add a new pipeline</div>
            <div className="pmos-row2">
              <div className="pmos-field"><label>Pipeline name</label><input placeholder="e.g. Maintenance & Vendors" value={svcName} onChange={e => setSvcName(e.target.value)} /></div>
              <div className="pmos-field" style={{ maxWidth: 90 }}><label>Code</label><input maxLength={3} placeholder="auto" value={svcCode} onChange={e => setSvcCode(e.target.value)} /></div>
              <div className="pmos-field" style={{ flex: "1 1 180px" }}>
                <label>Department <span style={{ color: "#c00" }}>*</span></label>
                <select value={svcDeptId} onChange={e => setSvcDeptId(e.target.value)}>
                  <option value="">— Select Department —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            {departments.length === 0 && (
              <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>
                ⚠ No departments exist yet. Go to the <button className="pmos-btn sm" onClick={() => setActiveTab("departments")} style={{ display: "inline", padding: "2px 8px" }}>Departments</button> tab to create one first.
              </div>
            )}
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
              <button className="pmos-btn primary" onClick={handleCreatePipeline}>Create pipeline</button>
            </div>
          </div>
        )}

        <hr className="pmos-divider" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Danger zone</div>
            <div style={{ fontSize: 12, color: "#888" }}>This only affects tickets — your team, departments and pipelines stay as configured.</div>
          </div>
          <button className="pmos-btn sm ghost-danger" onClick={async () => {
            if (!confirm("Reset all tickets back to the demo set? This only affects tickets.")) return;
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
