export type Role = "admin" | "team_lead" | "staff";

// ─── Department ───────────────────────────────────────────────────────────────
export interface Department {
  id: string;
  name: string;
  pipelines?: Pipeline[];
  created_at: string;
}

// ─── StaffType ────────────────────────────────────────────────────────────────
export interface StaffType {
  id: string;
  name: string;
  permissions: string[];
  /** Array of Department IDs this staff type can access */
  allowed_departments: string[];
  /** Array of Pipeline IDs this staff type can access within those departments */
  allowed_pipelines: string[];
}

// ─── Team ─────────────────────────────────────────────────────────────────────
export interface Team {
  id: string;
  name: string;
  lead_id?: string;
  lead?: User;
  members: User[];
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  staff_type_id?: string;
  team_id?: string;
  staff_type?: StaffType;
  team?: Team;
  created_at: string;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
export interface PipelineField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "date" | "number";
  required?: boolean;
  options?: string[];
}

export interface Pipeline {
  id: string;
  label: string;
  code: string;
  stages: string[];
  tag_field: {
    label: string;
    options: { name: string; slaDays: number }[];
  };
  category_field: {
    label: string;
    options: string[];
  };
  ticket_fields?: PipelineField[];
  default_checklist: string[];
  department_id: string;
  department?: Department;
  created_by: string;
  created_at: string;
}

// ─── Ticket ───────────────────────────────────────────────────────────────────
export interface Ticket {
  id: string;
  title: string;
  property?: string | null;
  unit?: string | null;
  tag?: string | null;
  category?: string | null;
  assigned_to?: string | null;
  stage_index: number;
  checklist: { index: number; done: boolean; label: string }[];
  history: { stage_index: number; stage_name: string; entered_at: string; user: string }[];
  pipeline_id: string;
  team_id?: string | null;
  priority?: string | null;
  fields?: Record<string, any>;
  created_at: string;
  stage_entered_at: string;
  completed_at?: string | null;
  due_date?: string | null;
}

// ─── Note ─────────────────────────────────────────────────────────────────────
export interface Note {
  id: string;
  text: string;
  author: string;
  ticket_id: string;
  created_at: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  user: User;
}

export interface LoginOtpResponse {
  requiresOtp: boolean;
  loginSessionToken: string;
}

export interface VerifyOtpRequest {
  loginSessionToken: string;
  code: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// ─── Request types ────────────────────────────────────────────────────────────
export interface CreateUserRequest {
  username: string;
  password: string;
  display_name: string;
  role: Role;
  staff_type_id?: string;
  team_id?: string;
}

export interface UpdateUserRequest {
  display_name?: string;
  password?: string;
  role?: Role;
  staff_type_id?: string;
  team_id?: string;
}

export interface CreateDepartmentRequest {
  name: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
}

export interface CreateStaffTypeRequest {
  name: string;
  permissions: string[];
  allowed_departments: string[];
  allowed_pipelines: string[];
}

export interface UpdateStaffTypeRequest {
  name?: string;
  permissions?: string[];
  allowed_departments?: string[];
  allowed_pipelines?: string[];
}

export interface CreatePipelineRequest {
  label: string;
  code: string;
  stages: string[];
  department_id: string;
  tag_field?: any;
  category_field?: any;
  default_checklist?: string[];
  ticket_fields?: PipelineField[];
}

export interface UpdatePipelineRequest {
  label?: string;
  code?: string;
  stages?: string[];
  department_id?: string;
  tag_field?: any;
  category_field?: any;
  default_checklist?: string[];
  ticket_fields?: PipelineField[];
}

export interface CreateTicketRequest {
  title: string;
  property?: string;
  unit?: string;
  tag?: string;
  category?: string;
  assigned_to?: string;
  pipeline_id: string;
  team_id?: string;
  priority?: string;
  stage_index?: number;
  due_date?: string | null;
  fields?: Record<string, any>;
}

export interface UpdateTicketRequest {
  title?: string;
  property?: string;
  unit?: string;
  tag?: string;
  category?: string;
  assigned_to?: string;
  team_id?: string;
  priority?: string;
  stage_index?: number;
  completed_at?: string | null;
  due_date?: string | null;
  fields?: Record<string, any>;
}

export interface CreateNoteRequest {
  text: string;
}

// ─── Activity ─────────────────────────────────────────────────────────────────
export interface StageTransition {
  type: "stage_transition";
  ticket_id: string;
  ticket_title: string;
  author: string;
  text: string;
  created_at: string;
  pipeline_label?: string;
}

export interface NoteActivity {
  type: "note";
  id: string;
  text: string;
  author: string;
  ticket_id: string;
  ticket_title: string;
  created_at: string;
  pipeline_label?: string;
}

export type ActivityItem = NoteActivity | StageTransition;

// ─── Contact Database ─────────────────────────────────────────────────────────
export interface ContactType {
  id: string;
  name: string;
  created_at: string;
  _count?: { contacts: number };
}

export interface Property {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  status?: string;
  contacts?: PropertyContact[];
  staff?: { user_id: string; property_id: string; user?: Pick<User, "id" | "display_name" | "username"> }[];
}

export interface PropertyContact {
  contact_id: string;
  property_id: string;
  property?: Property;
  contact?: Contact;
}

export interface Contact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  mailing_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  notes?: string | null;
  status: string;
  type_id: string;
  contact_type?: ContactType;
  properties?: PropertyContact[];
  created_at: string;
  updated_at: string;
}

export interface ContactFilters {
  search?: string;
  type_id?: string;
  city?: string;
  state?: string;
  zip?: string;
  property_id?: string;
  status?: "active" | "archived" | "all";
}

export interface ContactFilterOptions {
  cities: string[];
  states: string[];
  zips: string[];
  types: ContactType[];
  properties: Pick<Property, "id" | "name" | "city" | "state">[];
}

export interface CreateContactRequest {
  name: string;
  phone?: string;
  email?: string;
  mailing_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  type_id: string;
  property_ids?: string[];
}

export interface UpdateContactRequest extends Partial<CreateContactRequest> {
  status?: string;
}

export interface ImportContactRow extends CreateContactRequest {
  allow_duplicate?: boolean;
}

export type ImportRowStatus = "ready" | "created" | "duplicate" | "invalid";

export interface ImportRowResult {
  index: number;
  status: ImportRowStatus;
  error?: string;
  duplicate_of?: { id: string; name: string; reason: "email" | "phone"; in_file?: boolean };
}

export interface ImportContactsResponse {
  results: ImportRowResult[];
  summary: Record<ImportRowStatus, number>;
}

export interface SavePropertyRequest {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  status?: string;
  staff_ids?: string[];
}

// ─── Policies & Dashboard ─────────────────────────────────────────────────────
export interface PolicyAttachment {
  name: string;
  url: string;
}

export interface PolicyCategory {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  audience_staff_types?: string[] | null;
  policies?: Policy[];
  _count?: { policies: number };
}

export interface Policy {
  id: string;
  title: string;
  description?: string | null;
  content: string;
  status: string;
  category_id: string;
  category?: PolicyCategory;
  order: number;
  attachments?: (PolicyAttachment | string)[] | null;
  created_by: string;
  created_by_name?: string;
  updated_by?: string | null;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePolicyCategoryRequest {
  name: string;
  description?: string;
  order?: number;
  audience_staff_types?: string[];
}

export type UpdatePolicyCategoryRequest = Partial<CreatePolicyCategoryRequest>;

export interface CreatePolicyRequest2 {
  title: string;
  description?: string;
  content: string;
  category_id: string;
  order?: number;
  attachments?: PolicyAttachment[];
}

export interface UpdatePolicyRequest2 extends Partial<CreatePolicyRequest2> {
  status?: string;
}

// ─── Announcements ────────────────────────────────────────────────────────────
export type AnnouncementPriority = "normal" | "important" | "urgent";
export type AnnouncementTargetType = "all" | "user" | "team" | "staff_type";

export interface AnnouncementStats {
  total: number;
  sent: number;
  delivered: number;
  viewed: number;
  acknowledged: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  target_type: AnnouncementTargetType;
  target_id?: string | null;
  target_ids?: string[] | null;
  require_ack: boolean;
  publish_at: string;
  expires_at?: string | null;
  status: "scheduled" | "sent" | "cancelled";
  dispatched_at?: string | null;
  created_by: string;
  created_by_name?: string;
  updated_by_name?: string;
  audience?: string;
  created_at: string;
  updated_at?: string;
  stats?: AnnouncementStats;
  receipts?: AnnouncementReceipt[];
}

export interface AnnouncementReceipt {
  id: string;
  announcement_id: string;
  announcement?: Announcement;
  user_id: string;
  user?: Pick<User, "id" | "display_name" | "username">;
  status: "sent" | "delivered" | "viewed" | "acknowledged";
  sent_at?: string;
  delivered_at?: string | null;
  viewed_at?: string | null;
  ack_at?: string | null;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  target_type: AnnouncementTargetType;
  target_ids?: string[];
  require_ack?: boolean;
  publish_at?: string | null;
  expires_at?: string | null;
}
