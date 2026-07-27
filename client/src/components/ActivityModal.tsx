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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 w-1/2 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Activity Feed</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">Close</button>
        </div>
        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-500">Loading activity…</p>
          ) : items.length === 0 ? (
            <p className="text-gray-500">No activity yet.</p>
          ) : items.map((item, i) => {
            const isTransition = item.type === "stage_transition";
            return (
              <div key={isTransition ? `t-${(item as any).ticket_id}-${i}` : (item as any).id} className="border-b pb-2">
                <p className="font-semibold">{item.author}</p>
                <p className="text-gray-600">
                  {isTransition
                    ? <>moved <em>{(item as any).ticket_title}</em> {(item as any).text}</>
                    : <>left a note on <em>{(item as any).ticket_title}</em></>
                  }
                </p>
                <div className="text-xs text-gray-400">
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  {(item as any).pipeline_label && <span> &middot; {(item as any).pipeline_label}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {items.length > 0 && (
            <button onClick={() => setItems([])} className="px-3 py-1 text-sm border rounded hover:bg-gray-100">Clear</button>
          )}
          <button onClick={onClose} className="px-3 py-1 text-sm bg-gray-800 text-white rounded hover:bg-gray-700">Close</button>
        </div>
      </div>
    </div>
  );
};
