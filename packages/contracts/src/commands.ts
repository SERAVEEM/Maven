/**
 * MAVEN Application Commands & DTOs
 * Used across Presentation Layer and Host Backend (Tauri IPC)
 */

import { TaskPriority, TaskStatus } from './entities.js';

// Task Commands
export interface CreateTaskDto {
  task_key?: string;
  title: string;
  description?: string;
  project_id?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  starts_at?: string;
  due_at?: string;
  due_timezone?: string;
  epic?: string;
  color?: string;
}

export interface UpdateTaskDto {
  id: string;
  task_key?: string;
  title?: string;
  description?: string;
  project_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  starts_at?: string | null;
  due_at?: string | null;
  due_timezone?: string | null;
  completed_at?: string | null;
  epic?: string | null;
  color?: string | null;
}

export interface TaskFilterDto {
  status?: TaskStatus;
  project_id?: string;
  priority?: TaskPriority;
  include_deleted?: boolean;
}

// Project Commands
export interface CreateProjectDto {
  name: string;
  description?: string;
  color?: string;
}

// Note Commands
export interface CreateNoteDto {
  title: string;
  content: string;
  tag_ids?: string[];
}

export interface UpdateNoteDto {
  id: string;
  title?: string;
  content?: string;
  tag_ids?: string[];
}

export interface SearchNotesDto {
  query: string;
  limit?: number;
}

// Calendar Commands
export interface CreateCalendarEventDto {
  title: string;
  description?: string;
  location?: string;
  starts_at: string;
  ends_at?: string;
  timezone: string;
  all_day?: boolean;
  recurrence_rule?: string;
}

// Natural Language Intent Interpretation
export type IntentType =
  | 'create_task'
  | 'create_reminder'
  | 'create_note'
  | 'schedule_event'
  | 'search_notes'
  | 'list_tasks'
  | 'clarification_needed'
  | 'unknown';

export interface CommandIntent {
  intent: IntentType;
  confidence: number;
  is_deterministic: boolean;
  parameters: Record<string, unknown>;
  requires_confirmation: boolean;
  confirmation_prompt?: string;
  clarification_question?: string;
}

// Standard Response wrapper
export interface CommandResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

