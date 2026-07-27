import React, { useState, useEffect } from "react";
import { Ticket, Note } from "../types/pmos";
import { pmosApi } from "../services/pmosApi";

interface Props {
  ticket: Ticket | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const TicketDrawer: React.FC<Props> = ({ ticket, onClose, onUpdated }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [checklist, setChecklist] = useState(ticket?.checklist || []);

  useEffect(() => {
    if (ticket) {
      pmosApi.getNotes(ticket.id).then(setNotes);
      setChecklist(ticket.checklist || []);
    }
  }, [ticket]);

  if (!ticket) return null;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    await pmosApi.createNote(ticket.id, { text: newNoteText });
    setNewNoteText("");
    pmosApi.getNotes(ticket.id).then(setNotes);
  };

  const handleChecklistToggle = async (index: number) => {
    const updated = checklist.map((item, i) => i === index ? { ...item, done: !item.done } : item);
    setChecklist(updated);
    await pmosApi.updateChecklist(ticket.id, updated);
    onUpdated();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
      <div className="w-1/3 bg-white h-full p-6 shadow-lg overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{ticket.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black text-xl">&times;</button>
        </div>
        <p className="text-gray-600 mb-4">{ticket.property} {ticket.unit ? `- ${ticket.unit}` : ""}</p>
        <p className="text-sm text-gray-500 mb-4">Assigned to: {ticket.assigned_to || "Unassigned"}</p>
        <p className="text-sm text-gray-500 mb-4">Tag: {ticket.tag || "-"} | Category: {ticket.category || "-"}</p>

        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-2">Checklist</h3>
          <ul className="space-y-2">
            {checklist.map((item, idx) => (
              <li key={idx} className="flex items-center space-x-2">
                <input type="checkbox" checked={item.done} onChange={() => handleChecklistToggle(idx)} />
                <span className={item.done ? "line-through text-gray-400" : ""}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-2">Notes</h3>
          <ul className="space-y-3 mb-3">
            {notes.map(n => (
              <li key={n.id} className="border-b pb-2">
                <p className="font-semibold text-sm">{n.author}</p>
                <p className="text-gray-600">{n.text}</p>
                <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={handleAddNote} className="flex space-x-2">
            <input className="border p-2 rounded flex-1 text-sm" placeholder="Add a note..." value={newNoteText} onChange={e => setNewNoteText(e.target.value)} />
            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Add</button>
          </form>
        </div>
      </div>
    </div>
  );
};
