import {
  LoginResponse, LoginOtpResponse, LoginRequest, VerifyOtpRequest,
  Department, CreateDepartmentRequest, UpdateDepartmentRequest,
  Pipeline, CreatePipelineRequest, UpdatePipelineRequest,
  Ticket, CreateTicketRequest, UpdateTicketRequest,
  Note, CreateNoteRequest,
  User, CreateUserRequest, UpdateUserRequest,
  ActivityItem,
  StaffType, CreateStaffTypeRequest, UpdateStaffTypeRequest, Team,
  Contact, ContactType, CreateContactRequest, UpdateContactRequest, ContactFilters, ContactFilterOptions,
  ImportContactRow, ImportContactsResponse, BulkUpdateContactsRequest,
  PolicyCategory, Policy, CreatePolicyCategoryRequest, UpdatePolicyCategoryRequest, CreatePolicyRequest2, UpdatePolicyRequest2,
  Announcement, AnnouncementReceipt, CreateAnnouncementRequest,
  Property, SavePropertyRequest,
} from "../types/pmos";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

const TOKEN_KEY = "token";

function toQuery(params: object): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const str = qs.toString();
  return str ? `?${str}` : "";
}

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
      // An expired or invalid session token (they last 24h) would otherwise
      // leave the user stuck on failing pages until they cleared site data.
      // Drop it and send them back to sign in. Auth endpoints are excluded:
      // there a 401 means wrong credentials, not an expired session.
      if (response.status === 401 && localStorage.getItem(TOKEN_KEY) && !url.startsWith("/client/auth")) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.assign("/login");
      }
      const error = await response.json().catch(() => ({ error: "API Request Failed" }));
      throw new Error(error.error || "API Request Failed");
    }
    if (response.status === 204) return undefined as T;
    return response.json();
  },

  // ─── Auth ─────────────────────────────────────────────────────────────────
  login: (credentials: LoginRequest) =>
    pmosApi.request<LoginOtpResponse>("/client/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  verifyOtp: (data: VerifyOtpRequest) =>
    pmosApi.request<LoginResponse>("/client/auth/login/verify-otp", { method: "POST", body: JSON.stringify(data) }),

  // ─── Users ────────────────────────────────────────────────────────────────
  getUsers: () => pmosApi.request<User[]>("/client/users"),
  getMe: () => pmosApi.request<User>("/client/users/me"),
  createUser: (data: CreateUserRequest) =>
    pmosApi.request<User>("/admin/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: UpdateUserRequest) =>
    pmosApi.request<User>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    pmosApi.request<void>(`/admin/users/${id}`, { method: "DELETE" }),

  // ─── Departments ──────────────────────────────────────────────────────────
  getDepartments: () => pmosApi.request<Department[]>("/client/departments"),
  createDepartment: (data: CreateDepartmentRequest) =>
    pmosApi.request<Department>("/admin/departments", { method: "POST", body: JSON.stringify(data) }),
  updateDepartment: (id: string, data: UpdateDepartmentRequest) =>
    pmosApi.request<Department>(`/admin/departments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteDepartment: (id: string) =>
    pmosApi.request<void>(`/admin/departments/${id}`, { method: "DELETE" }),

  // ─── Staff Types ──────────────────────────────────────────────────────────
  getStaffTypes: () => pmosApi.request<StaffType[]>("/admin/staff-types"),
  createStaffType: (data: CreateStaffTypeRequest) =>
    pmosApi.request<StaffType>("/admin/staff-types", { method: "POST", body: JSON.stringify(data) }),
  updateStaffType: (id: string, data: UpdateStaffTypeRequest) =>
    pmosApi.request<StaffType>(`/admin/staff-types/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteStaffType: (id: string) =>
    pmosApi.request<void>(`/admin/staff-types/${id}`, { method: "DELETE" }),

  // ─── Teams ────────────────────────────────────────────────────────────────
  getTeams: () => pmosApi.request<Team[]>("/admin/teams"),
  createTeam: (data: any) =>
    pmosApi.request<Team>("/admin/teams", { method: "POST", body: JSON.stringify(data) }),
  updateTeam: (id: string, data: any) =>
    pmosApi.request<Team>(`/admin/teams/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTeam: (id: string) =>
    pmosApi.request<void>(`/admin/teams/${id}`, { method: "DELETE" }),

  // ─── Pipelines ────────────────────────────────────────────────────────────
  getPipelines: () => pmosApi.request<Pipeline[]>("/client/pipelines"),
  getPipeline: (id: string) => pmosApi.request<Pipeline>(`/client/pipelines/${id}`),
  createPipeline: (data: CreatePipelineRequest) =>
    pmosApi.request<Pipeline>("/admin/pipelines", { method: "POST", body: JSON.stringify(data) }),
  updatePipeline: (id: string, data: UpdatePipelineRequest) =>
    pmosApi.request<Pipeline>(`/admin/pipelines/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePipeline: (id: string) =>
    pmosApi.request<void>(`/admin/pipelines/${id}`, { method: "DELETE" }),

  // ─── Tickets ──────────────────────────────────────────────────────────────
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

  // ─── Notes ────────────────────────────────────────────────────────────────
  getNotes: (ticketId: string) => pmosApi.request<Note[]>(`/client/notes/${ticketId}`),
  createNote: (ticketId: string, data: CreateNoteRequest) =>
    pmosApi.request<Note>(`/client/notes/${ticketId}`, { method: "POST", body: JSON.stringify(data) }),
  deleteNote: (id: string) =>
    pmosApi.request<void>(`/client/notes/${id}`, { method: "DELETE" }),

  // ─── Activity & Admin ─────────────────────────────────────────────────────
  getActivity: () => pmosApi.request<ActivityItem[]>("/client/activity"),
  resetTickets: () => pmosApi.request<{ message: string }>("/admin/seed/tickets", { method: "POST" }),

  // ─── Contacts ─────────────────────────────────────────────────────────────
  getContacts: (filters: ContactFilters = {}) => pmosApi.request<Contact[]>(`/client/contacts${toQuery(filters)}`),
  getContactFilterOptions: () => pmosApi.request<ContactFilterOptions>("/client/contacts/filters"),
  getAdminContacts: (filters: ContactFilters = {}) =>
    pmosApi.request<Contact[]>(`/admin/contacts${toQuery({ status: "all", ...filters })}`),
  getAdminContactFilterOptions: () => pmosApi.request<ContactFilterOptions>("/admin/contacts/filters"),
  getContact: (id: string) => pmosApi.request<Contact>(`/client/contacts/${id}`),
  getContactTypes: () => pmosApi.request<ContactType[]>("/admin/contacts/types"),
  createContactType: (data: { name: string }) =>
    pmosApi.request<ContactType>("/admin/contacts/types", { method: "POST", body: JSON.stringify(data) }),
  updateContactType: (id: string, data: { name: string }) =>
    pmosApi.request<ContactType>(`/admin/contacts/types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteContactType: (id: string) =>
    pmosApi.request<void>(`/admin/contacts/types/${id}`, { method: "DELETE" }),
  createContact: (data: CreateContactRequest) =>
    pmosApi.request<Contact>("/admin/contacts", { method: "POST", body: JSON.stringify(data) }),
  updateContact: (id: string, data: UpdateContactRequest) =>
    pmosApi.request<Contact>(`/admin/contacts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  bulkUpdateContacts: (data: BulkUpdateContactsRequest) =>
    pmosApi.request<{ updated: number }>("/admin/contacts/bulk-update", { method: "POST", body: JSON.stringify(data) }),
  importContacts: (data: { contacts: ImportContactRow[]; property_ids?: string[]; dry_run?: boolean }) =>
    pmosApi.request<ImportContactsResponse>("/admin/contacts/import", { method: "POST", body: JSON.stringify(data) }),
  archiveContact: (id: string) =>
    pmosApi.request<Contact>(`/admin/contacts/${id}`, { method: "PUT", body: JSON.stringify({ status: "archived" }) }),

  // ─── Properties ───────────────────────────────────────────────────────────
  getProperties: () => pmosApi.request<Property[]>("/admin/properties"),
  getMyProperties: () => pmosApi.request<Property[]>("/client/properties?mine=true"),
  createProperty: (data: SavePropertyRequest) =>
    pmosApi.request<Property>("/admin/properties", { method: "POST", body: JSON.stringify(data) }),
  updateProperty: (id: string, data: SavePropertyRequest) =>
    pmosApi.request<Property>(`/admin/properties/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // ─── Policies & Dashboard ─────────────────────────────────────────────────
  getPolicyCategories: () => pmosApi.request<PolicyCategory[]>("/admin/policies/categories"),
  createPolicyCategory: (data: CreatePolicyCategoryRequest) =>
    pmosApi.request<PolicyCategory>("/admin/policies/categories", { method: "POST", body: JSON.stringify(data) }),
  updatePolicyCategory: (id: string, data: UpdatePolicyCategoryRequest) =>
    pmosApi.request<PolicyCategory>(`/admin/policies/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePolicyCategory: (id: string) =>
    pmosApi.request<void>(`/admin/policies/categories/${id}`, { method: "DELETE" }),
  reorderPolicyCategories: (ids: string[]) =>
    pmosApi.request<{ success: boolean }>("/admin/policies/categories/reorder", { method: "PUT", body: JSON.stringify({ ids }) }),
  getPolicies: () => pmosApi.request<Policy[]>("/admin/policies"),
  getDashboardPolicies: () => pmosApi.request<PolicyCategory[]>("/client/dashboard/policies"),
  createPolicy: (data: CreatePolicyRequest2) =>
    pmosApi.request<Policy>("/admin/policies", { method: "POST", body: JSON.stringify(data) }),
  updatePolicy: (id: string, data: UpdatePolicyRequest2) =>
    pmosApi.request<Policy>(`/admin/policies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  archivePolicy: (id: string) =>
    pmosApi.request<Policy>(`/admin/policies/${id}`, { method: "PUT", body: JSON.stringify({ status: "archived" }) }),
  reorderPolicies: (ids: string[]) =>
    pmosApi.request<{ success: boolean }>("/admin/policies/reorder", { method: "PUT", body: JSON.stringify({ ids }) }),

  // ─── Announcements ────────────────────────────────────────────────────────
  getAdminAnnouncements: () => pmosApi.request<Announcement[]>("/admin/announcements"),
  createAnnouncement: (data: CreateAnnouncementRequest) =>
    pmosApi.request<Announcement>("/admin/announcements", { method: "POST", body: JSON.stringify(data) }),
  updateAnnouncement: (id: string, data: Partial<CreateAnnouncementRequest>) =>
    pmosApi.request<Announcement>(`/admin/announcements/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  cancelAnnouncement: (id: string) =>
    pmosApi.request<Announcement>(`/admin/announcements/${id}/cancel`, { method: "POST" }),
  getAnnouncementReceipts: (id: string) =>
    pmosApi.request<AnnouncementReceipt[]>(`/admin/announcements/${id}/receipts`),
  getMyAnnouncements: () => pmosApi.request<AnnouncementReceipt[]>("/client/announcements"),
  markAnnouncementViewed: (id: string) =>
    pmosApi.request<{ success: boolean }>(`/client/announcements/${id}/view`, { method: "POST" }),
  acknowledgeAnnouncement: (id: string) =>
    pmosApi.request<{ success: boolean }>(`/client/announcements/${id}/acknowledge`, { method: "POST" }),
};
