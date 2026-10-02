import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { pmosApi } from "../services/pmosApi";
import { Navbar } from "../components/Navbar";
import { normalizeAttachments } from "../utils/ui";
import { useMyAnnouncements } from "../hooks/useApi";
import { AnnouncementReceipt, Policy } from "../types/pmos";

type View = { kind: "overview" } | { kind: "announcements" } | { kind: "policy"; policy: Policy };

export const KnowledgeDashboard: React.FC = () => {
  const navigate = useNavigate();
  // Send logged-out visitors to the login page
  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/login");
  }, [navigate]);
  const [view, setView] = useState<View>({ kind: "overview" });
  const { data: categories = [], isLoading: loading } = useQuery({
    queryKey: ["dashboardPolicies"],
    queryFn: pmosApi.getDashboardPolicies,
  });
  const { data: receipts = [], refetch: refetchAnnouncements } = useMyAnnouncements();
  const { data: myProperties = [] } = useQuery({
    queryKey: ["myProperties"],
    queryFn: pmosApi.getMyProperties,
    staleTime: 5 * 60 * 1000,
  });

  const important = receipts.filter(r =>
    r.announcement && (r.announcement.priority !== "normal" || (r.announcement.require_ack && r.status !== "acknowledged"))
  );

  const acknowledge = async (id: string) => {
    try {
      await pmosApi.acknowledgeAnnouncement(id);
      toast.success("Announcement acknowledged");
      refetchAnnouncements();
    } catch (e: any) { toast.error(e.message); }
  };

  const markRead = async (r: AnnouncementReceipt) => {
    if (r.status !== "delivered" && r.status !== "sent") return;
    try {
      await pmosApi.markAnnouncementViewed(r.announcement_id);
      refetchAnnouncements();
    } catch { /* non-critical */ }
  };

  const renderAnnouncement = (r: AnnouncementReceipt) => {
    const a = r.announcement!;
    const needsAck = a.require_ack && r.status !== "acknowledged";
    const unread = r.status === "delivered" || r.status === "sent";
    return (
      <div key={r.id} className={`pmos-ann-card ${a.priority}`} onClick={() => !needsAck && markRead(r)}>
        <div className="t">
          {a.title}
          {a.priority !== "normal" && <span className={`pmos-pill ${a.priority === "urgent" ? "danger" : "warn"}`}>{a.priority}</span>}
          {unread && <span className="pmos-pill">new</span>}
        </div>
        <div className="c">{a.content}</div>
        <div className="m">
          <span>From {a.created_by_name ?? "Admin"}</span>
          {a.audience && <span>To {a.audience}</span>}
          <span>{new Date(a.publish_at).toLocaleString()}</span>
          {r.status === "acknowledged" && r.ack_at && <span>✓ Acknowledged {new Date(r.ack_at).toLocaleString()}</span>}
          {needsAck && <button className="pmos-btn primary sm" onClick={() => acknowledge(a.id)}>Acknowledge</button>}
        </div>
      </div>
    );
  };

  const selectedId = view.kind === "policy" ? view.policy.id : null;

  return (
    <div className="pmos-page">
      <Navbar />

      <div className="pmos-kb-layout">
        {/* Sidebar: fixed entries + admin-configured sections */}
        <div className="pmos-kb-side">
          <div className="pmos-kb-side-title">Property management</div>
          <div className="pmos-kb-group">
            <button className={`pmos-kb-item ${view.kind === "overview" ? "active" : ""}`} onClick={() => setView({ kind: "overview" })}>
              Overview
            </button>
            <button className={`pmos-kb-item ${view.kind === "announcements" ? "active" : ""}`} onClick={() => setView({ kind: "announcements" })}>
              Announcements{receipts.length ? ` (${receipts.length})` : ""}
            </button>
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="pmos-skel" style={{ width: "72%" }} />
              <div className="pmos-skel" style={{ width: "58%" }} />
              <div className="pmos-skel" style={{ width: "65%" }} />
            </div>
          ) : (
            <>
              {categories.map((cat) => (
                <div className="pmos-kb-group" key={cat.id}>
                  <div className="lbl" title={cat.description ?? undefined}>{cat.name}</div>
                  {(cat.policies ?? []).map((policy) => (
                    <button
                      key={policy.id}
                      onClick={() => setView({ kind: "policy", policy: { ...policy, category: cat } })}
                      className={`pmos-kb-item ${selectedId === policy.id ? "active" : ""}`}
                    >
                      {policy.title}
                    </button>
                  ))}
                </div>
              ))}
              {categories.length === 0 && <div className="pmos-empty">No documentation published yet.</div>}
            </>
          )}
        </div>

        {/* Main Content Area */}
        <div className="pmos-kb-main">
          {view.kind === "policy" && (
            <div className="pmos-doc">
              <h1>{view.policy.title}</h1>
              <div className="meta">
                <span className="pmos-chip">{view.policy.category?.name || "Documentation"}</span>
                <span>Last updated: {new Date(view.policy.updated_at).toLocaleDateString()}</span>
              </div>
              {view.policy.description && (
                <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 0, fontStyle: "italic" }}>{view.policy.description}</p>
              )}
              <div className="body">{view.policy.content}</div>
              {normalizeAttachments(view.policy.attachments).length > 0 && (
                <div className="pmos-attach-list">
                  <div className="pmos-kb-group" style={{ marginBottom: 0 }}><div className="lbl">Supporting documents</div></div>
                  {normalizeAttachments(view.policy.attachments).map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5" />
                      </svg>
                      {a.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {view.kind === "announcements" && (
            <div style={{ maxWidth: 780, margin: "0 auto" }}>
              <div className="pmos-page-title" style={{ marginBottom: 12 }}>Announcements</div>
              {receipts.filter(r => r.announcement).map(renderAnnouncement)}
              {receipts.length === 0 && <div className="pmos-empty">No announcements right now.</div>}
            </div>
          )}

          {view.kind === "overview" && (
            <div style={{ maxWidth: 780, margin: "0 auto" }}>
              <div className="pmos-page-title" style={{ marginBottom: 4 }}>Property management dashboard</div>
              <div className="pmos-page-sub" style={{ marginBottom: 18 }}>Company policies, procedures and messages from the admin team.</div>

              {important.length > 0 && (
                <>
                  <div className="pmos-kb-group"><div className="lbl">Important messages</div></div>
                  {important.map(renderAnnouncement)}
                </>
              )}

              {receipts.filter(r => !important.includes(r)).length > 0 && (
                <>
                  <div className="pmos-kb-group" style={{ marginTop: 18 }}><div className="lbl">Recent announcements</div></div>
                  {receipts.filter(r => r.announcement && !important.includes(r)).slice(0, 3).map(renderAnnouncement)}
                  {receipts.length > 3 && (
                    <button className="pmos-btn sm" onClick={() => setView({ kind: "announcements" })}>View all announcements</button>
                  )}
                </>
              )}

              {myProperties.length > 0 && (
                <>
                  <div className="pmos-kb-group" style={{ marginTop: 18 }}><div className="lbl">My assigned properties</div></div>
                  <div className="pmos-chip-row">
                    {myProperties.map(p => (
                      <span key={p.id} className="pmos-chip" style={{ fontSize: 11.5, padding: "4px 10px" }}>
                        {p.name}{p.city ? ` · ${p.city}` : ""}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <div className="pmos-kb-group" style={{ marginTop: 18 }}><div className="lbl">Sections</div></div>
              {categories.map(cat => (
                <div key={cat.id} className="pmos-admin-row">
                  <div className="grow">
                    <div className="lbl">{cat.name}</div>
                    <div className="sub">{cat.description ? `${cat.description} · ` : ""}{cat.policies?.length ?? 0} document(s)</div>
                  </div>
                  {cat.policies?.[0] && (
                    <button className="pmos-btn sm" onClick={() => setView({ kind: "policy", policy: { ...cat.policies![0], category: cat } })}>Open</button>
                  )}
                </div>
              ))}
              {!loading && categories.length === 0 && <div className="pmos-empty">No documentation published yet.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
