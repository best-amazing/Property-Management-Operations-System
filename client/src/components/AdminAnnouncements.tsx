import React, { useState } from "react";
import toast from "react-hot-toast";
import { pmosApi } from "../services/pmosApi";
import {
  Announcement, AnnouncementPriority, AnnouncementReceipt, AnnouncementTargetType,
  CreateAnnouncementRequest, User, Team, StaffType,
} from "../types/pmos";
import { useAdminAnnouncements } from "../hooks/useApi";

interface FormState {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  target_type: AnnouncementTargetType;
  target_ids: string[];
  require_ack: boolean;
  publishLater: boolean;
  publishDate: string;
  expiresDate: string;
}

const emptyForm = (): FormState => ({
  title: "", content: "", priority: "normal", target_type: "all", target_ids: [], require_ack: false,
  publishLater: false, publishDate: "", expiresDate: "",
});

// ISO string → value for <input type="datetime-local"> in local time
const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

const priorityPill = (p: string) => (p === "urgent" ? "danger" : p === "important" ? "warn" : "");
const statusPill = (s: string) => (s === "sent" ? "" : s === "scheduled" ? "warn" : "muted");
const receiptPill = (s: string) => (s === "acknowledged" ? "" : s === "viewed" ? "" : s === "delivered" ? "warn" : "muted");

export const AdminAnnouncements: React.FC<{ users: User[]; teams: Team[]; staffTypes: StaffType[] }> = ({ users, teams, staffTypes }) => {
  const { data: announcements = [], isLoading: loading, refetch } = useAdminAnnouncements();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [statusFor, setStatusFor] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<AnnouncementReceipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);

  const locked = editing?.status === "sent"; // audience & schedule fixed once sent

  const targetOptions: { id: string; label: string }[] =
    form.target_type === "user" ? users.map(u => ({ id: u.id, label: u.display_name }))
    : form.target_type === "team" ? teams.map(t => ({ id: t.id, label: t.name }))
    : form.target_type === "staff_type" ? staffTypes.map(s => ({ id: s.id, label: s.name }))
    : [];

  const toggleTarget = (id: string) =>
    setForm(f => ({ ...f, target_ids: f.target_ids.includes(id) ? f.target_ids.filter(x => x !== id) : [...f.target_ids, id] }));

  const startEdit = (a: Announcement) => {
    setEditing(a);
    const ids = a.target_ids ?? (a.target_id ? [a.target_id] : []);
    setForm({
      title: a.title, content: a.content, priority: a.priority, target_type: a.target_type, target_ids: ids,
      require_ack: a.require_ack, publishLater: a.status === "scheduled", publishDate: toLocalInput(a.publish_at),
      expiresDate: toLocalInput(a.expires_at),
    });
    document.getElementById("admin-announcement-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    if (!locked && form.target_type !== "all" && !form.target_ids.length) { toast.error("Select at least one recipient."); return; }
    if (form.publishLater && !form.publishDate) { toast.error("Choose a publish date/time."); return; }

    const payload: CreateAnnouncementRequest = {
      title: form.title,
      content: form.content,
      priority: form.priority,
      target_type: form.target_type,
      target_ids: form.target_type === "all" ? [] : form.target_ids,
      require_ack: form.require_ack,
      publish_at: form.publishLater ? new Date(form.publishDate).toISOString() : null,
      expires_at: form.expiresDate ? new Date(form.expiresDate).toISOString() : null,
    };
    try {
      if (editing) {
        await pmosApi.updateAnnouncement(editing.id, payload);
        toast.success("Announcement updated");
      } else {
        const created = await pmosApi.createAnnouncement(payload);
        toast.success(created.status === "scheduled" ? "Announcement scheduled" : `Announcement sent to ${created.stats?.total ?? 0} staff`);
      }
      cancelEdit();
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCancel = async (a: Announcement) => {
    const msg = a.status === "scheduled"
      ? "Cancel this scheduled announcement? It will not be sent."
      : "Withdraw this announcement? It will be removed from staff dashboards.";
    if (!confirm(msg)) return;
    try {
      await pmosApi.cancelAnnouncement(a.id);
      toast.success(a.status === "scheduled" ? "Announcement cancelled" : "Announcement withdrawn");
      if (editing?.id === a.id) cancelEdit();
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleStatusView = async (id: string) => {
    if (statusFor === id) { setStatusFor(null); return; }
    setStatusFor(id);
    setLoadingReceipts(true);
    try {
      setReceipts(await pmosApi.getAnnouncementReceipts(id));
    } catch (e: any) {
      toast.error(e.message);
      setReceipts([]);
    } finally {
      setLoadingReceipts(false);
    }
  };

  if (loading) return <div className="pmos-empty" style={{ padding: "28px 0" }}>Loading…</div>;

  return (
    <div>
      {/* Announcements List */}
      <div style={{ marginBottom: 24 }}>
        {announcements.map(a => (
          <div key={a.id} style={{ borderBottom: "1px dashed var(--line)" }}>
            <div className="pmos-admin-row" style={{ borderBottom: "none", opacity: a.status === "cancelled" ? 0.55 : 1 }}>
              <div className="grow">
                <div className="lbl" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {a.title}
                  <span className={`pmos-pill ${priorityPill(a.priority)}`}>{a.priority}</span>
                  <span className={`pmos-pill ${statusPill(a.status)}`}>{a.status}</span>
                  {a.require_ack && <span className="pmos-pill muted">Ack required</span>}
                </div>
                <div className="sub">
                  {a.audience ?? a.target_type} · From {a.created_by_name ?? "Admin"} ·{" "}
                  {a.status === "scheduled" ? `Publishes ${fmt(a.publish_at)}` : `Published ${fmt(a.dispatched_at ?? a.publish_at)}`}
                  {a.expires_at ? ` · Expires ${fmt(a.expires_at)}` : ""}
                </div>
                {a.status !== "scheduled" && a.stats && a.stats.total > 0 && (
                  <div className="pmos-stat-row" style={{ marginTop: 3 }}>
                    <span><b>{a.stats.total}</b> sent</span>
                    <span><b>{a.stats.total - a.stats.sent}</b> delivered</span>
                    <span><b>{a.stats.viewed + a.stats.acknowledged}</b> viewed</span>
                    {a.require_ack && <span><b>{a.stats.acknowledged}</b> acknowledged</span>}
                  </div>
                )}
              </div>
              {a.status === "sent" && <button className="pmos-btn sm" onClick={() => toggleStatusView(a.id)}>{statusFor === a.id ? "Hide status" : "View status"}</button>}
              {a.status !== "cancelled" && <button className="pmos-btn sm" onClick={() => startEdit(a)}>Edit</button>}
              {a.status !== "cancelled" && (
                <button className="pmos-btn sm ghost-danger" onClick={() => handleCancel(a)}>{a.status === "scheduled" ? "Cancel" : "Withdraw"}</button>
              )}
            </div>

            {statusFor === a.id && (
              <div className="pmos-panel" style={{ margin: "0 0 10px", padding: 10 }}>
                {loadingReceipts ? <div className="pmos-empty">Loading…</div> : receipts.length === 0 ? (
                  <div className="pmos-empty">No recipients.</div>
                ) : receipts.map(r => (
                  <div key={r.id} className="pmos-admin-row" style={{ padding: "5px 0" }}>
                    <div className="grow">
                      <div className="lbl" style={{ fontSize: 12.5 }}>{r.user?.display_name ?? r.user_id}</div>
                      <div className="sub">
                        Sent {fmt(r.sent_at)}
                        {r.delivered_at ? ` · Delivered ${fmt(r.delivered_at)}` : ""}
                        {r.viewed_at ? ` · Viewed ${fmt(r.viewed_at)}` : ""}
                        {r.ack_at ? ` · Acknowledged ${fmt(r.ack_at)}` : ""}
                      </div>
                    </div>
                    <span className={`pmos-pill ${receiptPill(r.status)}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {announcements.length === 0 && (
          <div style={{ textAlign: "center", padding: 30, color: "var(--ink-soft)" }}>No announcements created yet.</div>
        )}
      </div>

      <hr className="pmos-divider" />
      <div className="pmos-panel" id="admin-announcement-form">
        <div className="pmos-panel-title">
          {editing ? `Edit Announcement${locked ? " (already sent — audience and schedule are fixed)" : ""}` : "Create Announcement"}
          {editing && <button className="pmos-btn sm" onClick={cancelEdit}>Cancel edit</button>}
        </div>
        <form onSubmit={handleSave}>
          <div className="pmos-row2">
            <div className="pmos-field"><label>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="pmos-field"><label>Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as AnnouncementPriority })}>
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="pmos-field"><label>Message</label><textarea rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} style={{ fontFamily: "inherit" }} /></div>

          {/* Targeting */}
          <div className="pmos-field"><label>Audience</label>
            <select disabled={locked} value={form.target_type} onChange={e => setForm({ ...form, target_type: e.target.value as AnnouncementTargetType, target_ids: [] })}>
              <option value="all">All Staff</option>
              <option value="user">Specific Staff Member(s)</option>
              <option value="team">Team(s)</option>
              <option value="staff_type">Staff Type(s)</option>
            </select>
          </div>
          {form.target_type !== "all" && (
            <div className="pmos-field">
              <label>Recipients ({form.target_ids.length} selected)</label>
              <div className="pmos-check-list">
                {targetOptions.map(o => (
                  <label key={o.id}>
                    <input type="checkbox" disabled={locked} checked={form.target_ids.includes(o.id)} onChange={() => toggleTarget(o.id)} />
                    {o.label}
                  </label>
                ))}
                {targetOptions.length === 0 && <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Nothing to select yet.</span>}
              </div>
            </div>
          )}

          {/* Options & scheduling */}
          <div className="pmos-row2" style={{ marginBottom: 12 }}>
            <label className="pmos-inline-check">
              <input type="checkbox" disabled={locked} checked={form.require_ack} onChange={e => setForm({ ...form, require_ack: e.target.checked })} />
              Require acknowledgment
            </label>
            <label className="pmos-inline-check">
              <input type="checkbox" disabled={locked} checked={form.publishLater} onChange={e => setForm({ ...form, publishLater: e.target.checked })} />
              Schedule for later
            </label>
          </div>
          <div className="pmos-row2">
            {form.publishLater && (
              <div className="pmos-field"><label>Publish Date/Time</label><input type="datetime-local" disabled={locked} value={form.publishDate} onChange={e => setForm({ ...form, publishDate: e.target.value })} /></div>
            )}
            <div className="pmos-field"><label>Expires (optional)</label><input type="datetime-local" value={form.expiresDate} onChange={e => setForm({ ...form, expiresDate: e.target.value })} /></div>
          </div>

          <button type="submit" className="pmos-btn primary" style={{ marginTop: 8 }}>
            {editing ? "Save Changes" : form.publishLater ? "Schedule Announcement" : "Send Announcement"}
          </button>
        </form>
      </div>
    </div>
  );
};
