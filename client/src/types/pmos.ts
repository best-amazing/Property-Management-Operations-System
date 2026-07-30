export type Role = "admin" | "staff";

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  created_at: string;
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
  default_checklist: string[];
  created_by: string;
  created_at: string;
}

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
  created_at: string;
  stage_entered_at: string;
  completed_at?: string | null;
}

export interface Note {
  id: string;
  text: string;
  author: string;
  ticket_id: string;
  created_at: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  display_name: string;
  role: Role;
}

export interface UpdateUserRequest {
  display_name?: string;
  password?: string;
  role?: Role;
}

export interface CreatePipelineRequest {
  label: string;
  code: string;
  stages: string[];
  tag_field?: any;
  category_field?: any;
  default_checklist?: string[];
}

export interface UpdatePipelineRequest {
  label?: string;
  code?: string;
  stages?: string[];
  tag_field?: any;
  category_field?: any;
  default_checklist?: string[];
}

export interface CreateTicketRequest {
  title: string;
  property?: string;
  unit?: string;
  tag?: string;
  category?: string;
  assigned_to?: string;
  pipeline_id: string;
  stage_index?: number;
}

export interface UpdateTicketRequest {
  title?: string;
  property?: string;
  unit?: string;
  tag?: string;
  category?: string;
  assigned_to?: string;
  stage_index?: number;
  completed_at?: string | null;
}

export interface CreateNoteRequest {
  text: string;
}

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
