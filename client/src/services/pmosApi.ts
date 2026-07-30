import {
  LoginResponse, LoginRequest,
  Pipeline, CreatePipelineRequest, UpdatePipelineRequest,
  Ticket, CreateTicketRequest, UpdateTicketRequest,
  Note, CreateNoteRequest,
  User, CreateUserRequest, UpdateUserRequest,
  ActivityItem,
} from "../types/pmos";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

const TOKEN_KEY = "token";

export const pmosApi = {
  getHeaders: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },

  async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: { ...this.getHeaders(), ...options?.headers },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "API Request Failed" }));
      throw new Error(error.error || "API Request Failed");
    }
    if (response.status === 204) return undefined as T;
    return response.json();
  },

  login: (credentials: LoginRequest) =>
    pmosApi.request<LoginResponse>("/client/auth/login", { method: "POST", body: JSON.stringify(credentials) }),

  createUser: (data: CreateUserRequest) =>
    pmosApi.request<User>("/admin/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: UpdateUserRequest) =>
    pmosApi.request<User>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    pmosApi.request<void>(`/admin/users/${id}`, { method: "DELETE" }),

  getPipelines: () => pmosApi.request<Pipeline[]>("/client/pipelines"),
  getPipeline: (id: string) => pmosApi.request<Pipeline>(`/client/pipelines/${id}`),
  createPipeline: (data: CreatePipelineRequest) =>
    pmosApi.request<Pipeline>("/admin/pipelines", { method: "POST", body: JSON.stringify(data) }),
  updatePipeline: (id: string, data: UpdatePipelineRequest) =>
    pmosApi.request<Pipeline>(`/admin/pipelines/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePipeline: (id: string) =>
    pmosApi.request<void>(`/admin/pipelines/${id}`, { method: "DELETE" }),

  getTickets: (pipelineId: string, mine: boolean = false) =>
    pmosApi.request<Ticket[]>(`/client/tickets/pipeline/${pipelineId}${mine ? "?mine=true" : ""}`),
  getTicket: (id: string) => pmosApi.request<Ticket>(`/client/tickets/${id}`),
  createTicket: (data: CreateTicketRequest) =>
    pmosApi.request<Ticket>("/client/tickets", { method: "POST", body: JSON.stringify(data) }),
  updateTicket: (id: string, data: UpdateTicketRequest) =>
    pmosApi.request<Ticket>(`/client/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  updateChecklist: (id: string, checklist: any) =>
    pmosApi.request<Ticket>(`/client/tickets/${id}/checklist`, { method: "PATCH", body: JSON.stringify({ checklist }) }),
  deleteTicket: (id: string) =>
    pmosApi.request<void>(`/client/tickets/${id}`, { method: "DELETE" }),

  getNotes: (ticketId: string) => pmosApi.request<Note[]>(`/client/notes/${ticketId}`),
  createNote: (ticketId: string, data: CreateNoteRequest) =>
    pmosApi.request<Note>(`/client/notes/${ticketId}`, { method: "POST", body: JSON.stringify(data) }),
  deleteNote: (id: string) =>
    pmosApi.request<void>(`/client/notes/${id}`, { method: "DELETE" }),

  getActivity: () => pmosApi.request<ActivityItem[]>("/client/activity"),
  getUsers: () => pmosApi.request<User[]>("/client/users"),
  resetTickets: () => pmosApi.request<{ message: string }>("/admin/seed/tickets", { method: "POST" }),
};
