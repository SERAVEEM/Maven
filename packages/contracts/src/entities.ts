/**
 * MAVEN Canonical Domain Entities
 * Matching SQLite schema in DATABASE.md
 */

export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface Project {
  id: string; // UUID
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  created_at: string; // ISO-8601 UTC
  updated_at: string; // ISO-8601 UTC
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  author: string;
  text: string;
  created_at: string;
}

export interface Task {
  id: string; // UUID
  project_id: string | null;
  task_key: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  starts_at: string | null; // ISO-8601 UTC
  due_at: string | null; // ISO-8601 UTC
  due_timezone: string | null; // IANA timezone
  completed_at: string | null; // ISO-8601 UTC
  epic: string | null;
  color: string | null;
  assignee?: string | null;
  subtasks?: Subtask[];
  comments?: TaskComment[];
  created_at: string; // ISO-8601 UTC
  updated_at: string; // ISO-8601 UTC
  deleted_at: string | null; // ISO-8601 UTC (soft delete)
}

export interface CalendarEvent {
  id: string; // UUID
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string; // ISO-8601 UTC
  ends_at: string | null; // ISO-8601 UTC
  timezone: string; // IANA timezone
  all_day: boolean;
  recurrence_rule: string | null; // Reserved RRULE
  created_at: string; // ISO-8601 UTC
  updated_at: string; // ISO-8601 UTC
}

export type ReminderStatus = 'scheduled' | 'fired' | 'cancelled' | 'failed';

export interface Reminder {
  id: string; // UUID
  task_id: string | null;
  event_id: string | null;
  title: string;
  message: string | null;
  trigger_at: string; // ISO-8601 UTC
  timezone: string | null;
  status: ReminderStatus;
  platform_notification_id: string | null;
  created_at: string; // ISO-8601 UTC
  updated_at: string; // ISO-8601 UTC
}

export interface Note {
  id: string; // UUID
  title: string;
  content: string;
  created_at: string; // ISO-8601 UTC
  updated_at: string; // ISO-8601 UTC
  deleted_at: string | null; // ISO-8601 UTC (soft delete)
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface NoteTag {
  note_id: string;
  tag_id: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata_json: string | null;
  created_at: string;
}

export interface MemoryEntry {
  id: string;
  content: string;
  source_type: string | null;
  source_id: string | null;
  importance: number;
  embedding_ref: string | null;
  created_at: string;
  updated_at: string;
}

export type ExecutionLogStatus = 'pending' | 'succeeded' | 'failed' | 'rejected' | 'cancelled';

export interface ExecutionLog {
  id: string;
  conversation_id: string | null;
  action_name: string;
  action_version: string;
  input_summary: string | null;
  status: ExecutionLogStatus;
  requires_confirmation: boolean;
  confirmed_at: string | null;
  result_summary: string | null;
  error_code: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AppSetting {
  key: string;
  value_json: string;
  updated_at: string;
}

