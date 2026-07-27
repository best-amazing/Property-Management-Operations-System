import React from "react";
import { ActivityItem } from "../types/pmos";

interface Props {
  items: ActivityItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityModal: React.FC<Props> = ({ items, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 w-1/2 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Activity Feed</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">Close</button>
        </div>
        <div className="space-y-4">
          {items.map((item, i) => {
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
          {items.length === 0 && <p className="text-gray-500">No activity yet.</p>}
        </div>
      </div>
    </div>
  );
};
