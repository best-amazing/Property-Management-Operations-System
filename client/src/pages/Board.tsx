import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { pmosApi } from "../services/pmosApi";
import { Pipeline, Ticket, User, Note, NoteActivity, ActivityItem } from "../types/pmos";
import { avatarSwatch, initials, ageDays, fmtDate } from "../utils/ui";
import { usePipelines, useTickets, useUsers, QUERY_KEYS } from "../hooks/useApi";

/* ── helpers ── */
function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  const sw = avatarSwatch(name);
  return (
    <span
      className="pmos-avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), background: sw.color }}
    >
      {initials(name)}
    </span>
  );
}

/* ── Draggable ticket card ── */
function TicketCard({ ticket, pipeline, index, onOpen }: {
  ticket: Ticket; pipeline: Pipeline; index: number; onOpen: () => void;
}) {
  const tagOpt = (pipeline.tag_field as any)?.options?.find((o: any) => o.name === ticket.tag);
  const sw = tagOpt ? avatarSwatch(tagOpt.swatch || tagOpt.name) : null;
  const age = ageDays(ticket.stage_entered_at);
  const slaDays = tagOpt?.slaDays ?? 7;
  const overdue = ticket.stage_index < (pipeline.stages as string[]).length - 1 && age >= slaDays;

  return (
    <Draggable draggableId={ticket.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`pmos-card ${snapshot.isDragging ? "dragging" : ""}`}
          style={{ ...provided.draggableProps.style, "--tag-color": sw?.color, "--tag-soft": sw?.soft } as any}
          onClick={onOpen}
        >
          <div className="ctitle">{ticket.title}</div>
          <div className="cmeta">
            {ticket.tag && sw && (
              <span className="pmos-tag" style={{ background: sw.soft, color: sw.color }}>{ticket.tag}</span>
            )}
            {ticket.category && <span className="pmos-cat">{ticket.category}</span>}
          </div>
          <div className="cfoot">
            {ticket.assigned_to ? (
              <div className="who">
                <Avatar name={ticket.assigned_to} size={18} />
                <span className="nm">{ticket.assigned_to}</span>
              </div>
            ) : <span />}
            <span className={`age mono ${overdue ? "flag" : ""}`}>{age}d</span>
          </div>
        </div>
      )}
    </Draggable>
  );
}

/* ── Droppable board column ── */
function BoardColumn({ pipeline, stage, stageIndex, tickets, onOpen, onAddTicket }: {
  pipeline: Pipeline; stage: string; stageIndex: number; tickets: Ticket[]; onOpen: (t: Ticket) => void; onAddTicket: () => void;
}) {
  return (
    <div className="pmos-col">
      <div className="pmos-col-head">
        <div className="name">
          <span>{stage}</span>
          <span className="count mono">{tickets.length}</span>
        </div>
      </div>
      <Droppable droppableId={String(stageIndex)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`pmos-col-body ${snapshot.isDraggingOver ? "drag-over" : ""}`}
          >
            {tickets.map((t, i) => (
              <TicketCard key={t.id} ticket={t} pipeline={pipeline} index={i} onOpen={() => onOpen(t)} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <button className="pmos-add-stage" onClick={onAddTicket}>+ Add ticket here</button>
    </div>
  );
}

/* ── Ticket drawer ── */
function TicketDrawer({ ticket, pipeline, users, onClose, onDeleted }: {
  ticket: Ticket | null; pipeline: Pipeline | null; users: User[]; onClose: () => void; onDeleted: (id: string) => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [title, setTitle] = useState("");
  const [property, setProperty] = useState("");
  const [unit, setUnit] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [tag, setTag] = useState("");
  const [checklist, setChecklist] = useState<any[]>([]);
  const [stageIndex, setStageIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const user = JSON.parse(localStorage.getItem("pmos_user") || "null");

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title);
      setProperty(ticket.property ?? "");
      setUnit(ticket.unit ?? "");
      setAssignedTo(ticket.assigned_to ?? "");
      setTag(ticket.tag ?? "");
      setChecklist(ticket.checklist as any[]);
      setStageIndex(ticket.stage_index);
      pmosApi.getNotes(ticket.id).then(setNotes).catch(() => {});
    } else {
      setNotes([]); setTitle(""); setProperty(""); setUnit(""); setAssignedTo(""); setTag(""); setChecklist([]);
    }
  }, [ticket]);

  const addNote = async () => {
    if (!ticket || !noteText.trim()) return;
    const note = await pmosApi.createNote(ticket.id, { text: noteText.trim() });
    setNotes(prev => [...prev, note]);
    setNoteText("");
  };

  const saveNote = async (noteId: string) => {
    if (!editingNoteText.trim()) return;
    await pmosApi.request(`/client/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify({ text: editingNoteText.trim() }),
    });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, text: editingNoteText.trim() } : n));
    setEditingNoteId(null);
  };

  const deleteTicket = async () => {
    if (!ticket || !confirm("Delete this ticket?")) return;
    await pmosApi.deleteTicket(ticket.id);
    onDeleted(ticket.id);
    onClose();
  };

  const save = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      await pmosApi.updateTicket(ticket.id, { title, property, unit, assigned_to: assignedTo, tag, stage_index: stageIndex });
      if (checklist.length > 0) {
        await pmosApi.updateChecklist(ticket.id, checklist);
      }
      (window as any).__pmos_refresh?.();
      onClose();
    } catch (e: any) {
      alert("Save failed: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const toggleChecklist = (i: number) => {
    setChecklist(prev => prev.map((item, idx) => idx === i ? { ...item, done: !item.done } : item));
  };

  const stages = pipeline?.stages as string[] | undefined;
  const age = ticket ? ageDays(ticket.stage_entered_at) : 0;

  return (
    <>
      <div className={`pmos-overlay ${ticket ? "show" : ""}`} onClick={onClose} />
      <div className={`pmos-drawer ${ticket ? "show" : ""}`}>
        <div className="pmos-drawer-head">
          <button className="pmos-x" onClick={onClose}>×</button>
        </div>

        {ticket && pipeline && (
          <div className="pmos-drawer-body">
            <div className="pmos-field">
              <label>Renter / Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="pmos-row2">
              <div className="pmos-field">
                <label>Property</label>
                <input value={property} onChange={e => setProperty(e.target.value)} />
              </div>
              <div className="pmos-field">
                <label>Unit</label>
                <input value={unit} onChange={e => setUnit(e.target.value)} />
              </div>
            </div>
            <div className="pmos-field">
              <label>Stage</label>
              <select value={stageIndex} onChange={e => setStageIndex(Number(e.target.value))}>
                {(stages ?? []).map((s, i) => <option key={i} value={i}>{s}</option>)}
              </select>
            </div>
            <div className="pmos-row2">
              <div className="pmos-field">
                <label>Assigned to</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                  <option value="">—</option>
                  {users.map(u => <option key={u.id} value={u.display_name}>{u.display_name}</option>)}
                </select>
              </div>
              <div className="pmos-field">
                <label>{(pipeline.tag_field as any)?.label ?? "Tag"}</label>
                <select value={tag} onChange={e => setTag(e.target.value)}>
                  <option value="">—</option>
                  {((pipeline.tag_field as any)?.options ?? []).map((o: any) => (
                    <option key={o.name} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="pmos-field">
              <label>Checklist</label>
              <div className="pmos-checklist">
                {checklist.length === 0 ? (
                  <div className="pmos-note-empty">No checklist defined for this service.</div>
                ) : checklist.map((item, i) => (
                  <label key={i}>
                    <input type="checkbox" checked={item.done} onChange={() => toggleChecklist(i)} /> {item.label}
                  </label>
                ))}
              </div>
            </div>
            <hr className="pmos-divider" />
            <div className="pmos-field">
              <label>Notes</label>
            </div>
            <div className="pmos-notes-list">
              {notes.length === 0 && <div className="pmos-note-empty">No notes yet.</div>}
              {notes.map(n => (
                <div key={n.id} className="pmos-note">
                  <div className="meta">
                    <span className="author">{n.author}</span>
                    <span>{fmtDate(n.created_at)}</span>
                  </div>
                  {editingNoteId === n.id ? (
                    <div className="pmos-note-form">
                      <textarea
                        value={editingNoteText}
                        onChange={e => setEditingNoteText(e.target.value)}
                        className="pmos-field"
                        style={{ width: "100%", fontSize: 13, padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 6 }}
                      />
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button className="pmos-btn primary sm" onClick={() => saveNote(n.id)}>Save</button>
                        <button className="pmos-btn sm" onClick={() => setEditingNoteId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="txt">
                      {n.text}
                      <button className="pmos-btn sm" style={{ marginLeft: 8 }} onClick={() => { setEditingNoteId(n.id); setEditingNoteText(n.text); }}>Edit</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="pmos-note-form">
              <textarea
                placeholder="Add a note…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                style={{ width: "100%", fontSize: 13, padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--bg)" }}
              />
              <button className="pmos-btn primary sm" onClick={addNote}>Add note</button>
            </div>
          </div>
        )}

        <div className="pmos-drawer-foot">
          <button className="pmos-btn ghost-danger" onClick={deleteTicket}>Delete ticket</button>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{age}d old</span>
          <button className="pmos-btn primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </>
  );
}

/* ── Activity modal (notes + stage transitions) ── */
function ActivityModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      pmosApi.getActivity().then(setActivity).catch(() => {}).finally(() => setLoading(false));
    }
  }, [isOpen]);

  return (
    <div className={`pmos-modal-bg ${isOpen ? "show" : ""}`} onClick={onClose}>
      <div className="pmos-modal wide" onClick={e => e.stopPropagation()}>
        <h3>Recent activity</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: "60vh", overflowY: "auto" }}>
          {loading ? (
            <div className="pmos-note-empty" style={{ textAlign: "center", padding: 24 }}>Loading activity…</div>
          ) : activity.length === 0 ? (
            <div className="pmos-note-empty">No activity yet.</div>
          ) : activity.map((item, i) => {
            const isTransition = "type" in item && item.type === "stage_transition";
            const key = isTransition ? `t-${(item as any).ticket_id}-${i}` : (item as NoteActivity).id;
            const ticketTitle = (item as any).ticket_title || "";
            const pipelineLabel = (item as any).pipeline_label || "";
            return (
              <div key={key} className="pmos-activity-row">
                <Avatar name={item.author} size={26} />
                <div>
                  <div className="txt">
                    <b>{item.author}</b>
                    {isTransition
                      ? <> moved <em>{ticketTitle}</em> {item.text}</>
                      : <> left a note on <em>{ticketTitle}</em></>
                    }
                  </div>
                  <div className="meta">
                    <span>{fmtDate(item.created_at)}</span>
                    {pipelineLabel && <span>{pipelineLabel}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pmos-modal-actions">
          <button className="pmos-btn" onClick={() => setActivity([])}>Clear</button>
          <button className="pmos-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── New ticket modal ── */
function NewTicketModal({ pipeline, stageIndex = 0, users, onClose, onCreated }: {
  pipeline: Pipeline | null; stageIndex?: number; users: User[]; onClose: () => void; onCreated: (t: Ticket) => void;
}) {
  const [title, setTitle] = useState("");
  const [property, setProperty] = useState("");
  const [unit, setUnit] = useState("");
  const [tag, setTag] = useState("");
  const [category, setCategory] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const create = async () => {
    if (!pipeline || !title.trim()) return;
    const ticket = await pmosApi.createTicket({ title, property, unit, tag, category, assigned_to: assignedTo, pipeline_id: pipeline.id, stage_index: stageIndex });
    onCreated(ticket);
    onClose();
  };

  if (!pipeline) return null;
  const tagOptions = (pipeline.tag_field as any)?.options ?? [];
  const catOptions = (pipeline.category_field as any)?.options ?? [];

  return (
    <div className="pmos-modal-bg show" onClick={onClose}>
      <div className="pmos-modal" onClick={e => e.stopPropagation()}>
        <h3>New ticket</h3>
        <div className="pmos-field">
          <label>Title</label>
          <input
            id="n-title"
            placeholder="e.g. Maplewood #5A — Jane Doe"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div className="pmos-row2">
          <div className="pmos-field">
            <label>Property</label>
            <input id="n-property" value={property} onChange={e => setProperty(e.target.value)} />
          </div>
          <div className="pmos-field">
            <label>Unit</label>
            <input id="n-unit" value={unit} onChange={e => setUnit(e.target.value)} />
          </div>
        </div>
        <div className="pmos-row2">
          <div className="pmos-field">
            <label>{(pipeline.tag_field as any)?.label ?? "Tag"}</label>
            <select id="n-tag" value={tag} onChange={e => setTag(e.target.value)}>
              {tagOptions.map((o: any) => <option key={o.name} value={o.name}>{o.name}</option>)}
            </select>
          </div>
          <div className="pmos-field">
            <label>{(pipeline.category_field as any)?.label ?? "Category"}</label>
            <select id="n-category" value={category} onChange={e => setCategory(e.target.value)}>
              {catOptions.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="pmos-field">
          <label>Assigned To</label>
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
            <option value="">—</option>
            {users.map(u => <option key={u.id} value={u.display_name}>{u.display_name}</option>)}
          </select>
        </div>
        <div className="pmos-field">
          <label>Starting stage</label>
          <input value={(pipeline.stages as string[])[stageIndex] || ""} disabled />
        </div>
        <div className="pmos-modal-actions">
          <button className="pmos-btn" onClick={onClose}>Cancel</button>
          <button className="pmos-btn primary" onClick={create}>Create ticket</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   Board page (main app view)
═══════════════════════════════════ */
export const Board: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"board" | "history">("board");
  const [filterMine, setFilterMine] = useState(false);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicketStage, setNewTicketStage] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});

  const { data: pipelines = [] } = usePipelines();
  const { data: tickets = [], isLoading: ticketsLoading } = useTickets(activePipelineId, filterMine);

  // Persist per-pipeline ticket counts across tab switches
  useEffect(() => {
    if (activePipelineId) {
      setPipelineCounts(prev => ({ ...prev, [activePipelineId]: tickets.length }));
    }
  }, [activePipelineId, tickets.length]);
  const { data: users = [] } = useUsers();

  const activePipeline = pipelines.find(p => p.id === activePipelineId) ?? null;

  const refreshTickets = useCallback(() => {
    if (activePipelineId) qc.invalidateQueries({ queryKey: QUERY_KEYS.tickets(activePipelineId, filterMine) });
  }, [activePipelineId, filterMine, qc]);

  // Expose refresh globally so TicketDrawer can trigger it
  useEffect(() => {
    (window as any).__pmos_refresh = refreshTickets;
    return () => { delete (window as any).__pmos_refresh; };
  }, [refreshTickets]);

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser(payload);
      localStorage.setItem("pmos_user", JSON.stringify(payload));
    } catch { navigate("/login"); }
  }, [navigate]);

  useEffect(() => {
    if (pipelines.length > 0 && !activePipelineId) setActivePipelineId(pipelines[0].id);
  }, [pipelines, activePipelineId]);

  const getTicketsKey = () => activePipelineId ? QUERY_KEYS.tickets(activePipelineId, filterMine) : [];

  const handleTicketDeleted = (id: string) => {
    qc.setQueryData<Ticket[]>(getTicketsKey(), prev => prev?.filter(t => t.id !== id) ?? []);
  };
  const handleTicketCreated = (t: Ticket) => {
    qc.setQueryData<Ticket[]>(getTicketsKey(), prev => prev ? [...prev, t] : [t]);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("pmos_user");
    navigate("/login");
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !activePipeline) return;
    const sourceStage = parseInt(result.source.droppableId, 10);
    const destStage = parseInt(result.destination.droppableId, 10);
    if (sourceStage === destStage) return;

    const ticketId = result.draggableId;
    const stages = activePipeline.stages as string[];
    if (destStage < 0 || destStage >= stages.length) return;

    // Optimistic update
    qc.setQueryData<Ticket[]>(getTicketsKey(), prev =>
      prev?.map(t => t.id === ticketId ? { ...t, stage_index: destStage } : t) ?? []
    );

    try {
      await pmosApi.updateTicket(ticketId, { stage_index: destStage });
      refreshTickets();
    } catch {
      refreshTickets();
    }
  };

  const stages = activePipeline ? (activePipeline.stages as string[]) : [];
  const tagOpts = activePipeline ? (activePipeline.tag_field as any)?.options ?? [] : [];
  const slaNoteText = tagOpts.map((o: any) => `${o.name} ${o.slaDays}d`).join(' · ');

  const visibleTickets = filterMine && user
    ? tickets.filter(t => t.assigned_to === user.display_name)
    : tickets;

  const completedTickets = tickets.filter(t => t.completed_at);

  const open = visibleTickets.filter(t => !t.completed_at).length;
  const overdue = visibleTickets.filter(t => {
    if (t.completed_at) return false;
    const opt = tagOpts.find((o: any) => o.name === t.tag);
    return opt && ageDays(t.stage_entered_at) >= opt.slaDays;
  }).length;

  if (!user) return null;

  const sw = avatarSwatch(user.display_name);

  return (
    <div id="pmos-root">
      {/* ── Top bar ── */}
      <div className="pmos-topbar">
        <div className="pmos-title-row">
          <div className="pmos-title">PMOS Pipeline Board</div>
          <div className="pmos-right-cluster">
            <div className="pmos-actions">
              <button className="pmos-btn" onClick={() => setShowActivity(true)}>Activity</button>
              {user.role === "admin" && (
                <button className="pmos-btn" onClick={() => navigate("/admin")}>Admin settings</button>
              )}
              <button className="pmos-btn primary" onClick={() => { setNewTicketStage(0); setShowNewTicket(true); }}>+ New ticket</button>
            </div>
            <div className="pmos-user-pill">
              <span className="pmos-avatar" style={{ width: 26, height: 26, fontSize: 11, background: sw.color }}>
                {initials(user.display_name)}
              </span>
              <span className="name">{user.display_name}</span>
              <span className={`pmos-role-badge ${user.role}`}>{user.role}</span>
            </div>
            <button className="pmos-btn sm" onClick={logout}>Log out</button>
          </div>
        </div>
        {/* Pipeline tabs */}
        <div className="pmos-tabs">
          {pipelines.map(p => {
            const count = p.id === activePipelineId ? tickets.length : (pipelineCounts[p.id] ?? 0);
            return (
              <div
                key={p.id}
                className={`pmos-tab ${p.id === activePipelineId ? "active" : ""}`}
                onClick={() => setActivePipelineId(p.id)}
              >
                <span>{(p as any).code} · {p.label}</span>
                <span className="count mono">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Sub bar ── */}
      <div className="pmos-subbar">
        <div className="pmos-segment">
          <button
            className={`pmos-seg-btn ${activeView === "board" ? "active" : ""}`}
            onClick={() => setActiveView("board")}
          >Board</button>
          <button
            className={`pmos-seg-btn ${activeView === "history" ? "active" : ""}`}
            onClick={() => setActiveView("history")}
          >History</button>
        </div>
        <div className="pmos-kpi">
          <div className="stat"><b>{open}</b> active</div>
          <div className="stat"><b>{Math.round(open ? visibleTickets.reduce((sum, t) => sum + ageDays(t.stage_entered_at), 0) / open : 0)}d</b> avg age</div>
          <div className={`stat ${overdue > 0 ? "overdue" : ""}`}><b>{overdue}</b> overdue</div>
          <div className="stat"><b>{completedTickets.length}</b> done</div>
        </div>
        <div className="pmos-filter">
          <select value={filterMine ? "mine" : "all"} onChange={e => setFilterMine(e.target.value === "mine")}>
            <option value="all">All tickets</option>
            <option value="mine">Assigned to me</option>
          </select>
        </div>
      </div>
      {activePipeline && slaNoteText && (
        <div className="pmos-sla-note">SLA — {slaNoteText}</div>
      )}

      {/* ── Board / History ── */}
      <div className="pmos-board-wrap">
        {activeView === "board" ? (
          ticketsLoading ? (
            <div className="pmos-empty">Loading tickets…</div>
          ) : !activePipeline ? (
            <div className="pmos-empty">No pipeline selected.</div>
          ) : stages.length === 0 ? (
            <div className="pmos-empty">No stages defined.</div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="pmos-board">
                {stages.map((stage, i) => (
                  <BoardColumn
                    key={i}
                    pipeline={activePipeline}
                    stage={stage}
                    stageIndex={i}
                    tickets={visibleTickets.filter(t => t.stage_index === i && !t.completed_at)}
                    onOpen={setOpenTicket}
                    onAddTicket={() => { setNewTicketStage(i); setShowNewTicket(true); }}
                  />
                ))}
              </div>
            </DragDropContext>
          )
        ) : (
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
                {completedTickets.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--ink-soft)", fontStyle: "italic" }}>No completed tickets.</td></tr>
                ) : (
                  completedTickets.map(t => (
                    <tr key={t.id} onClick={() => setOpenTicket(t)} style={{ cursor: "pointer" }}>
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
        )}
      </div>

      {/* ── Modals & Drawer ── */}
      <TicketDrawer
        ticket={openTicket}
        pipeline={activePipeline}
        users={users}
        onClose={() => setOpenTicket(null)}
        onDeleted={handleTicketDeleted}
      />
      {showActivity && <ActivityModal isOpen={showActivity} onClose={() => setShowActivity(false)} />}
      {showNewTicket && (
        <NewTicketModal
          pipeline={activePipeline}
          stageIndex={newTicketStage}
          users={users}
          onClose={() => setShowNewTicket(false)}
          onCreated={handleTicketCreated}
        />
      )}
    </div>
  );
};
