import React from "react";
import { ActivityItem } from "../types/pmos";

interface Props {
  items: ActivityItem[];
  setItems: (items: ActivityItem[]) => void;
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
}

export const ActivityModal: React.FC<Props> = ({ items, setItems, isOpen, onClose, loading }) => {
  return (
    <div className={`pmos-modal-bg ${isOpen ? "show" : ""}`} onClick={onClose}>
      <div className="pmos-modal wide" onClick={(e) => e.stopPropagation()}>
        <h3>Activity feed</h3>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="pmos-skel" style={{ width: "70%" }} />
            <div className="pmos-skel" style={{ width: "55%" }} />
            <div className="pmos-skel" style={{ width: "62%" }} />
          </div>
        ) : items.length === 0 ? (
          <div className="pmos-empty" style={{ padding: "28px 0" }}>No activity yet.</div>
        ) : (
          <div className="pmos-notes-list" style={{ marginBottom: 0 }}>
            {items.map((item, i) => {
              const isTransition = item.type === "stage_transition";
              const ticketId = (item as any).ticket_id;
              return (
                <div className="pmos-activity-row" key={isTransition ? `t-${ticketId}-${i}` : (item as any).id}>
                  <div className="txt">
                    <b>{item.author}</b>{" "}
                    {isTransition ? (
                      <>moved <b>{(item as any).ticket_title}</b> {item.text}</>
                    ) : (
                      <>left a note on <b>{(item as any).ticket_title}</b></>
                    )}
                    <div className="meta">
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                      {(item as any).pipeline_label && <span>&middot; {(item as any).pipeline_label}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pmos-modal-actions">
          {items.length > 0 && (
            <button className="pmos-btn" onClick={() => setItems([])}>Clear</button>
          )}
          <button className="pmos-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
