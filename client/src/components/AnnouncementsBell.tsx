import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useMyAnnouncements } from "../hooks/useApi";
import { pmosApi } from "../services/pmosApi";
import { AnnouncementReceipt } from "../types/pmos";

/* ── Design tokens (from index.css :root) ── */
const T = {
  bg: "#ECEEEA",
  surface: "#FFFFFF",
  ink: "#1B2421",
  inkSoft: "#5B6660",
  primary: "#1F4B43",
  primarySoft: "#E4ECE9",
  accent: "#D98E3B",
  accentSoft: "#F8E9D3",
  danger: "#B23A2E",
  dangerSoft: "#F6DEDA",
  line: "#D3D6CD",
  radius: "9px",
  shadow: "0 2px 6px rgba(27,36,33,0.06)",
  shadowLg: "0 10px 30px rgba(27,36,33,0.16)",
  font: "'IBM Plex Sans', sans-serif",
  fontDisplay: "'Space Grotesk', sans-serif",
};

export const AnnouncementsBell: React.FC = () => {
  const { data: receipts = [], refetch } = useMyAnnouncements();
  const [open, setOpen] = useState(false);
  const [urgentPopup, setUrgentPopup] = useState<AnnouncementReceipt | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dismissedRef = useRef<Set<string>>(new Set());

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Check for urgent announcements to pop up
  useEffect(() => {
    const urgent = receipts.find(
      (r) =>
        r.announcement?.priority === "urgent" &&
        r.status === "delivered" &&
        !dismissedRef.current.has(r.id)
    );
    if (urgent && !urgentPopup) {
      setUrgentPopup(urgent);
    }
  }, [receipts, urgentPopup]);

  // Close the urgent popup on Escape + lock background scroll
  useEffect(() => {
    if (!urgentPopup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeUrgentPopup();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [urgentPopup]);

  const unreadCount = receipts.filter((r) => r.status === "delivered").length;

  const handleMarkViewed = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await pmosApi.markAnnouncementViewed(id);
      refetch();
    } catch (err: any) {
      toast.error("Failed to mark viewed: " + err.message);
    }
  };

  const handleAcknowledge = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await pmosApi.acknowledgeAnnouncement(id);
      toast.success("Announcement acknowledged");
      if (urgentPopup?.announcement?.id === id) {
        dismissedRef.current.add(urgentPopup.id);
        setUrgentPopup(null);
      }
      refetch();
    } catch (err: any) {
      toast.error("Failed to acknowledge: " + err.message);
    }
  };

  // Always-available escape hatch: dismiss the popup and mark it read so the
  // auto-trigger does not immediately re-open it. Acknowledgement is still
  // required, and remains pending in the notifications dropdown.
  const closeUrgentPopup = () => {
    const popup = urgentPopup;
    if (!popup) return;
    dismissedRef.current.add(popup.id);
    setUrgentPopup(null);
    if (popup.announcement?.id) handleMarkViewed(popup.announcement.id);
  };

  const priorityStyle = (p?: string): React.CSSProperties => {
    if (p === "urgent") return { background: T.dangerSoft, color: T.danger, border: `1px solid ${T.danger}` };
    if (p === "important") return { background: T.accentSoft, color: T.accent, border: `1px solid ${T.accent}` };
    return { background: T.primarySoft, color: T.primary, border: `1px solid ${T.primary}` };
  };

  return (
    <div style={{ position: "relative" }} ref={ref}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="pmos-btn sm"
        style={{ position: "relative", padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            width: 16, height: 16, borderRadius: "50%",
            background: T.danger, color: "#fff",
            fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          width: 340, maxHeight: "70vh",
          background: T.surface, borderRadius: T.radius,
          border: `1px solid ${T.line}`, boxShadow: T.shadowLg,
          zIndex: 50, display: "flex", flexDirection: "column",
          overflow: "hidden", fontFamily: T.font,
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px", borderBottom: `1px solid ${T.line}`,
            background: T.bg,
            fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 14, color: T.ink,
          }}>
            Notifications
          </div>
          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {receipts.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center", fontSize: 12.5, color: T.inkSoft }}>
                No notifications yet.
              </div>
            ) : (
              receipts.map((receipt) => {
                const ann = receipt.announcement;
                if (!ann) return null;
                const isUnread = receipt.status === "delivered";
                const needsAck = ann.require_ack && receipt.status !== "acknowledged";

                return (
                  <div
                    key={receipt.id}
                    onClick={() => { if (isUnread && !needsAck) handleMarkViewed(ann.id); }}
                    style={{
                      padding: "12px 16px",
                      borderBottom: `1px dashed ${T.line}`,
                      background: isUnread ? T.primarySoft : "transparent",
                      cursor: isUnread ? "pointer" : "default",
                      transition: "background 0.12s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4,
                        padding: "2px 7px", borderRadius: 20,
                        ...priorityStyle(ann.priority),
                      }}>
                        {ann.priority}
                      </span>
                      <span style={{ fontSize: 10.5, color: T.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {new Date(ann.publish_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{
                      fontFamily: T.fontDisplay, fontSize: 13, fontWeight: isUnread ? 700 : 600,
                      color: T.ink, marginBottom: 3,
                    }}>
                      {ann.title}
                    </div>
                    <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                      {ann.content.length > 100 ? ann.content.slice(0, 100) + "…" : ann.content}
                    </div>
                    {(needsAck || isUnread) && (
                      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        {needsAck ? (
                          <button
                            className="pmos-btn primary"
                            style={{ fontSize: 11, padding: "5px 12px" }}
                            onClick={(e) => handleAcknowledge(ann.id, e)}
                          >
                            Acknowledge
                          </button>
                        ) : (
                          <button
                            className="pmos-btn sm"
                            style={{ fontSize: 11 }}
                            onClick={(e) => handleMarkViewed(ann.id, e)}
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Urgent Popup Modal */}
      {urgentPopup && urgentPopup.announcement && (
        <>
          {/* Overlay */}
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(27,36,33,0.45)",
            }}
            onClick={closeUrgentPopup}
          />
          {/* Modal */}
          <div style={{
            position: "fixed", inset: 0, zIndex: 101,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Urgent announcement"
              style={{
                background: T.surface, borderRadius: 14,
                boxShadow: T.shadowLg, maxWidth: 440, width: "100%",
                border: `2px solid ${T.danger}`, overflow: "hidden",
                fontFamily: T.font,
              }}
            >
              {/* Header */}
              <div style={{
                background: T.dangerSoft, padding: "14px 20px",
                borderBottom: `1px solid ${T.danger}`,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={T.danger} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span style={{
                  flex: 1,
                  fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 16,
                  color: T.danger,
                }}>
                  Urgent Announcement
                </span>
                <button
                  className="pmos-x"
                  aria-label="Close announcement"
                  onClick={closeUrgentPopup}
                  style={{ color: T.danger, fontSize: 22, fontWeight: 700 }}
                >
                  &times;
                </button>
              </div>
              {/* Body */}
              <div style={{ padding: "20px 24px" }}>
                <h3 style={{
                  fontFamily: T.fontDisplay, fontSize: 18, fontWeight: 700,
                  color: T.ink, margin: "0 0 8px",
                }}>
                  {urgentPopup.announcement.title}
                </h3>
                <p style={{
                  fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55,
                  margin: 0, whiteSpace: "pre-wrap",
                }}>
                  {urgentPopup.announcement.content}
                </p>
              </div>
              {/* Footer */}
              <div style={{
                padding: "14px 24px", background: T.bg,
                borderTop: `1px solid ${T.line}`,
                display: "flex", justifyContent: "flex-end", gap: 8,
              }}>
                <button
                  className="pmos-btn"
                  style={{ fontWeight: 700, padding: "8px 20px" }}
                  onClick={closeUrgentPopup}
                >
                  {urgentPopup.announcement.require_ack ? "Close" : "Dismiss"}
                </button>
                {urgentPopup.announcement.require_ack && (
                  <button
                    className="pmos-btn"
                    style={{
                      background: T.danger, color: "#fff", borderColor: T.danger,
                      fontWeight: 700, padding: "8px 20px",
                    }}
                    onClick={() => handleAcknowledge(urgentPopup.announcement!.id)}
                  >
                    I Acknowledge
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
