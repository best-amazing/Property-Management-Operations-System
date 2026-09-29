import React, { useState, useEffect } from "react";
import { pmosApi } from "../services/pmosApi";
import { Pipeline, Ticket } from "../types/pmos";
import { Navbar } from "../components/Navbar";
import { fmtDate } from "../utils/ui";

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

  const activePipeline = pipelines.find(p => p.id === activePipelineId);

  return (
    <div className="pmos-page">
      <Navbar />
      <div className="pmos-page-body">
        <div className="pmos-page-head">
          <div>
            <div className="pmos-page-title">Ticket history</div>
            <div className="pmos-page-sub">
              {tickets.length} completed {tickets.length === 1 ? "ticket" : "tickets"}
              {activePipeline ? ` in ${activePipeline.label}` : ""}
            </div>
          </div>
          <div className="pmos-field" style={{ marginBottom: 0, minWidth: 200 }}>
            <label htmlFor="history-pipeline">Pipeline</label>
            <select id="history-pipeline" value={activePipelineId} onChange={e => setActivePipelineId(e.target.value)}>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <div className="pmos-history-wrap">
          <table className="pmos-history-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Property</th>
                <th>Tag</th>
                <th>Assigned</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--ink-soft)", fontStyle: "italic" }}>
                    No completed tickets yet.
                  </td>
                </tr>
              ) : (
                tickets.map(t => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>{[t.property, t.unit].filter(Boolean).join(" · ")}</td>
                    <td>{t.tag ?? "—"}</td>
                    <td>{t.assigned_to ?? "—"}</td>
                    <td>{t.completed_at ? fmtDate(t.completed_at) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
