import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useMyAnnouncements } from "../hooks/useApi";
import { pmosApi } from "../services/pmosApi";
import { AnnouncementReceipt } from "../types/pmos";

export const AnnouncementsBell: React.FC = () => {
  const { data: receipts = [], refetch } = useMyAnnouncements();
  const [open, setOpen] = useState(false);
  const [urgentPopup, setUrgentPopup] = useState<AnnouncementReceipt | null>(null);
  const ref = useRef<HTMLDivElement>(null);

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
        r.status === "delivered" // hasn't been viewed yet
    );
    if (urgent && !urgentPopup) {
      setUrgentPopup(urgent);
    }
  }, [receipts, urgentPopup]);

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
      if (urgentPopup?.id === id) setUrgentPopup(null);
      refetch();
    } catch (err: any) {
      toast.error("Failed to acknowledge: " + err.message);
    }
  };

  const priorityColor = (p?: string) => {
    if (p === "urgent") return "text-red-600 bg-red-100 border-red-200";
    if (p === "important") return "text-orange-600 bg-orange-100 border-orange-200";
    return "text-indigo-600 bg-indigo-50 border-indigo-100";
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-300 hover:text-white focus:outline-none transition-colors"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 max-h-[80vh] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {receipts.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">You have no new notifications.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {receipts.map((receipt) => {
                  const ann = receipt.announcement;
                  if (!ann) return null;
                  const isUnread = receipt.status === "delivered";
                  const needsAck = ann.require_ack && receipt.status !== "acknowledged";

                  return (
                    <li
                      key={receipt.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${isUnread ? "bg-indigo-50/30" : ""}`}
                      onClick={() => {
                        if (isUnread && !needsAck) handleMarkViewed(ann.id);
                      }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${priorityColor(ann.priority)}`}>
                          {ann.priority}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(ann.publish_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className={`text-sm ${isUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                        {ann.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{ann.content}</p>
                      
                      <div className="mt-3 flex justify-end gap-2">
                        {needsAck ? (
                          <button
                            onClick={(e) => handleAcknowledge(ann.id, e)}
                            className="text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
                          >
                            Acknowledge
                          </button>
                        ) : isUnread ? (
                          <button
                            onClick={(e) => handleMarkViewed(ann.id, e)}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            Mark as Read
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Urgent Popup Modal */}
      {urgentPopup && urgentPopup.announcement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-red-500 animate-in fade-in zoom-in duration-300">
            <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-3">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-lg font-bold text-red-800">Urgent Announcement</h2>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{urgentPopup.announcement.title}</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{urgentPopup.announcement.content}</p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              {urgentPopup.announcement.require_ack ? (
                <button
                  onClick={() => handleAcknowledge(urgentPopup.announcement!.id)}
                  className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  I Acknowledge
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleMarkViewed(urgentPopup.announcement!.id);
                    setUrgentPopup(null);
                  }}
                  className="bg-gray-800 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
