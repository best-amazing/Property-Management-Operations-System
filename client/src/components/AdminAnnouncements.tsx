import React, { useState } from "react";
import toast from "react-hot-toast";
import { pmosApi } from "../services/pmosApi";
import { Announcement, CreateAnnouncementRequest, User, Team, StaffType } from "../types/pmos";
import { useAdminAnnouncements } from "../hooks/useApi";

export const AdminAnnouncements: React.FC<{ users: User[]; teams: Team[]; staffTypes: StaffType[] }> = ({ users, teams, staffTypes }) => {
  const { data: announcements = [], isLoading: loading, refetch: refetchAnnouncements } = useAdminAnnouncements();
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [form, setForm] = useState<CreateAnnouncementRequest>({
    title: "", content: "", priority: "normal", target_type: "all", target_id: undefined, require_ack: false,
  });
  const [publishLater, setPublishLater] = useState(false);
  const [publishDate, setPublishDate] = useState("");
  const [expiresDate, setExpiresDate] = useState("");

  const fetchData = async () => {
    refetchAnnouncements();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    try {
      const payload: CreateAnnouncementRequest = {
        ...form,
        publish_at: publishLater && publishDate ? new Date(publishDate).toISOString() : undefined,
        expires_at: expiresDate ? new Date(expiresDate).toISOString() : undefined,
      };
      await pmosApi.createAnnouncement(payload);
      toast.success("Announcement created");
      setForm({ title: "", content: "", priority: "normal", target_type: "all", target_id: undefined, require_ack: false });
      setPublishLater(false);
      setPublishDate("");
      setExpiresDate("");
      setShowForm(false);
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const priorityStyle = (p: string) => {
    if (p === "urgent") return { background: "#F6DEDA", color: "#B23A2E" };
    if (p === "important") return { background: "#F8E9D3", color: "#D98E3B" };
    return { background: "#E4ECE9", color: "#1F4B43" };
  };

  const targetLabel = (a: Announcement) => {
    if (a.target_type === "all") return "All Staff";
    if (a.target_type === "user") {
      const u = users.find(u => u.id === a.target_id);
      return u ? u.display_name : "Specific User";
    }
    if (a.target_type === "team") {
      const t = teams.find(t => t.id === a.target_id);
      return t ? `Team: ${t.name}` : "Specific Team";
    }
    if (a.target_type === "staff_type") {
      const st = staffTypes.find(st => st.id === a.target_id);
      return st ? `Type: ${st.name}` : "Specific Staff Type";
    }
    return a.target_type;
  };

  return <div className="pmos-empty" style={{ padding: "28px 0" }}>Loading…</div>;

  return (
    <div>
      {/* Announcements List */}
      <div style={{ marginBottom: 24 }}>
        {announcements.map(a => (
          <div key={a.id} className="pmos-admin-row">
            <div className="grow">
              <div className="lbl">{a.title}</div>
              <div className="sub">{targetLabel(a)} · {new Date(a.created_at).toLocaleDateString()}</div>
            </div>
            <span style={{ ...priorityStyle(a.priority), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, textTransform: "uppercase", whiteSpace: "nowrap" }}>{a.priority}</span>
            {a.require_ack && <span style={{ background: "#DCEBEC", color: "#1E6E73", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500 }}>Ack Required</span>}
          </div>
        ))}
        {announcements.length === 0 && (
          <div style={{ textAlign: "center", padding: 30, color: "var(--ink-soft)" }}>No announcements created yet.</div>
        )}
      </div>

      <hr className="pmos-divider" />
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Create Announcement</div>
      <form onSubmit={handleCreate}>
        <div className="pmos-row2">
          <div className="pmos-field"><label>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="pmos-field"><label>Priority</label>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })}>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <div className="pmos-field"><label>Content</label><textarea rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} style={{ fontFamily: "inherit", width: "100%" }} /></div>

        {/* Targeting */}
        <div className="pmos-row2">
          <div className="pmos-field"><label>Target Audience</label>
            <select value={form.target_type} onChange={e => setForm({ ...form, target_type: e.target.value as any, target_id: undefined })}>
              <option value="all">All Staff</option>
              <option value="user">Specific User</option>
              <option value="team">Specific Team</option>
              <option value="staff_type">Specific Staff Type</option>
            </select>
          </div>
          {form.target_type === "user" && (
            <div className="pmos-field"><label>Select User</label>
              <select value={form.target_id || ""} onChange={e => setForm({ ...form, target_id: e.target.value })}>
                <option value="">Select…</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
              </select>
            </div>
          )}
          {form.target_type === "team" && (
            <div className="pmos-field"><label>Select Team</label>
              <select value={form.target_id || ""} onChange={e => setForm({ ...form, target_id: e.target.value })}>
                <option value="">Select…</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          {form.target_type === "staff_type" && (
            <div className="pmos-field"><label>Select Staff Type</label>
              <select value={form.target_id || ""} onChange={e => setForm({ ...form, target_id: e.target.value })}>
                <option value="">Select…</option>
                {staffTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Scheduling and Options */}
        <div className="pmos-row2">
          <div className="pmos-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.require_ack} onChange={e => setForm({ ...form, require_ack: e.target.checked })} />
            <label style={{ margin: 0 }}>Require acknowledgment</label>
          </div>
          <div className="pmos-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={publishLater} onChange={e => setPublishLater(e.target.checked)} />
            <label style={{ margin: 0 }}>Schedule for later</label>
          </div>
        </div>
        {publishLater && (
          <div className="pmos-row2">
            <div className="pmos-field"><label>Publish Date/Time</label><input type="datetime-local" value={publishDate} onChange={e => setPublishDate(e.target.value)} /></div>
            <div className="pmos-field"><label>Expiration Date (optional)</label><input type="datetime-local" value={expiresDate} onChange={e => setExpiresDate(e.target.value)} /></div>
          </div>
        )}

        <button type="submit" className="pmos-btn primary" style={{ marginTop: 8 }}>
          {publishLater ? "Schedule Announcement" : "Send Announcement"}
        </button>
      </form>
    </div>
  );
};
