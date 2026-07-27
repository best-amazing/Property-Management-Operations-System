import React, { useState, useEffect } from "react";
import { pmosApi } from "../services/pmosApi";
import { Pipeline, Ticket } from "../types/pmos";

export const History: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    pmosApi.getPipelines().then(data => {
      setPipelines(data);
      if (data.length > 0) setActivePipelineId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (activePipelineId) {
      pmosApi.getTickets(activePipelineId).then(data => {
        setTickets(data.filter(t => t.completed_at));
      });
    }
  }, [activePipelineId]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Ticket History</h1>
        <select className="border p-2 rounded" value={activePipelineId} onChange={e => setActivePipelineId(e.target.value)}>
          {pipelines.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {tickets.length === 0 ? (
        <p className="text-gray-500">No completed tickets yet.</p>
      ) : (
        <table className="w-full bg-white rounded shadow">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Property</th>
              <th className="p-3 text-left">Assigned To</th>
              <th className="p-3 text-left">Completed</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id} className="border-b">
                <td className="p-3">{t.title}</td>
                <td className="p-3">{t.property} {t.unit}</td>
                <td className="p-3">{t.assigned_to || "-"}</td>
                <td className="p-3">{t.completed_at ? new Date(t.completed_at).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
