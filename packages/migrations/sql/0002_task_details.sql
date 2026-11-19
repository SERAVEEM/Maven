-- Migration 0002: Persist Task UI details (assignee, subtasks, comments)
-- ponytail: JSON columns keep Task DTO 1-to-1 with zero extra JOINs; normalize into child tables if cross-task subtask/comment queries or per-subtask reminders are needed.
ALTER TABLE tasks ADD COLUMN assignee TEXT;
ALTER TABLE tasks ADD COLUMN subtasks_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN comments_json TEXT NOT NULL DEFAULT '[]';
