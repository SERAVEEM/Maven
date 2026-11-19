use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::db::DatabaseState;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Subtask {
    pub id: String,
    pub title: String,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TaskComment {
    pub id: String,
    pub author: String,
    pub text: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub project_id: Option<String>,
    pub task_key: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub starts_at: Option<String>,
    pub due_at: Option<String>,
    pub due_timezone: Option<String>,
    pub completed_at: Option<String>,
    pub epic: Option<String>,
    pub color: Option<String>,
    pub assignee: Option<String>,
    pub subtasks: Vec<Subtask>,
    pub comments: Vec<TaskComment>,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskPayload {
    pub task_key: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub project_id: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub starts_at: Option<String>,
    pub due_at: Option<String>,
    pub due_timezone: Option<String>,
    pub epic: Option<String>,
    pub color: Option<String>,
    pub assignee: Option<String>,
    pub subtasks: Option<Vec<Subtask>>,
    pub comments: Option<Vec<TaskComment>>,
}

fn deserialize_double_option<'de, T, D>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: serde::Deserializer<'de>,
{
    Deserialize::deserialize(deserializer).map(Some)
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskPayload {
    pub id: String,
    pub task_key: Option<String>,
    pub title: Option<String>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub description: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub project_id: Option<Option<String>>,
    pub status: Option<String>,
    pub priority: Option<String>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub starts_at: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub due_at: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub due_timezone: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub completed_at: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub epic: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub color: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub assignee: Option<Option<String>>,
    pub subtasks: Option<Vec<Subtask>>,
    pub comments: Option<Vec<TaskComment>>,
}

const TASK_SELECT_COLUMNS: &str = "id, project_id, task_key, title, description, status, priority, starts_at, due_at, due_timezone, completed_at, epic, color, assignee, subtasks_json, comments_json, created_at, updated_at, deleted_at";

fn row_to_task(row: &rusqlite::Row<'_>) -> rusqlite::Result<Task> {
    let id: String = row.get(0)?;
    let raw_key: Option<String> = row.get(2)?;
    let task_key = raw_key
        .filter(|k| !k.trim().is_empty())
        .unwrap_or_else(|| format!("MVN-{}", &id[..id.len().min(6)]));
    let subtasks_json: String = row.get(14)?;
    let comments_json: String = row.get(15)?;

    Ok(Task {
        id,
        project_id: row.get(1)?,
        task_key,
        title: row.get(3)?,
        description: row.get(4)?,
        status: row.get(5)?,
        priority: row.get(6)?,
        starts_at: row.get(7)?,
        due_at: row.get(8)?,
        due_timezone: row.get(9)?,
        completed_at: row.get(10)?,
        epic: row.get(11)?,
        color: row.get(12)?,
        assignee: row.get(13)?,
        subtasks: serde_json::from_str(&subtasks_json).unwrap_or_default(),
        comments: serde_json::from_str(&comments_json).unwrap_or_default(),
        created_at: row.get(16)?,
        updated_at: row.get(17)?,
        deleted_at: row.get(18)?,
    })
}

pub(crate) fn get_tasks_with_conn(
    conn: &rusqlite::Connection,
    include_deleted: bool,
) -> Result<Vec<Task>, String> {
    let query = if include_deleted {
        format!("SELECT {TASK_SELECT_COLUMNS} FROM tasks ORDER BY created_at DESC")
    } else {
        format!("SELECT {TASK_SELECT_COLUMNS} FROM tasks WHERE deleted_at IS NULL ORDER BY created_at DESC")
    };

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], row_to_task).map_err(|e| e.to_string())?;

    let mut tasks = Vec::new();
    for task in rows {
        tasks.push(task.map_err(|e| e.to_string())?);
    }
    Ok(tasks)
}

pub(crate) fn create_task_with_conn(
    conn: &rusqlite::Connection,
    payload: CreateTaskPayload,
) -> Result<Task, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let status = payload.status.unwrap_or_else(|| "todo".to_string());
    let priority = payload.priority.unwrap_or_else(|| "medium".to_string());
    let title = payload.title.trim().to_string();

    if title.is_empty() {
        return Err("Task title cannot be empty".to_string());
    }

    // ponytail: COUNT(*)+1 key gen; switch to per-project sequence if task keys become UNIQUE
    let task_key = match payload.task_key {
        Some(k) if !k.trim().is_empty() => k.trim().to_string(),
        _ => {
            let count: i64 = conn
                .query_row("SELECT COUNT(*) FROM tasks", [], |r| r.get(0))
                .unwrap_or(0);
            format!("MVN-{}", count + 1)
        }
    };

    let subtasks = payload.subtasks.unwrap_or_default();
    let comments = payload.comments.unwrap_or_default();
    let subtasks_json = serde_json::to_string(&subtasks).map_err(|e| e.to_string())?;
    let comments_json = serde_json::to_string(&comments).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO tasks (id, project_id, task_key, title, description, status, priority, starts_at, due_at, due_timezone, epic, color, assignee, subtasks_json, comments_json, created_at, updated_at, deleted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, NULL)",
        rusqlite::params![
            &id,
            &payload.project_id,
            &task_key,
            &title,
            &payload.description,
            &status,
            &priority,
            &payload.starts_at,
            &payload.due_at,
            &payload.due_timezone,
            &payload.epic,
            &payload.color,
            &payload.assignee,
            &subtasks_json,
            &comments_json,
            &now,
            &now,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Task {
        id,
        project_id: payload.project_id,
        task_key,
        title,
        description: payload.description,
        status,
        priority,
        starts_at: payload.starts_at,
        due_at: payload.due_at,
        due_timezone: payload.due_timezone,
        completed_at: None,
        epic: payload.epic,
        color: payload.color,
        assignee: payload.assignee,
        subtasks,
        comments,
        created_at: now.clone(),
        updated_at: now,
        deleted_at: None,
    })
}

pub(crate) fn update_task_with_conn(
    conn: &rusqlite::Connection,
    payload: UpdateTaskPayload,
) -> Result<Task, String> {
    let existing = conn
        .query_row(
            &format!("SELECT {TASK_SELECT_COLUMNS} FROM tasks WHERE id = ?1"),
            [&payload.id],
            row_to_task,
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => "Task not found".to_string(),
            other => other.to_string(),
        })?;

    let now = Utc::now().to_rfc3339();
    let title = match payload.title {
        Some(t) => {
            let trimmed = t.trim().to_string();
            if trimmed.is_empty() {
                return Err("Task title cannot be empty".to_string());
            }
            trimmed
        }
        None => existing.title,
    };

    let task_key = payload
        .task_key
        .filter(|k| !k.trim().is_empty())
        .map(|k| k.trim().to_string())
        .unwrap_or(existing.task_key);
    let description = payload.description.unwrap_or(existing.description);
    let project_id = payload.project_id.unwrap_or(existing.project_id);
    let status = payload.status.unwrap_or(existing.status);
    let priority = payload.priority.unwrap_or(existing.priority);
    let starts_at = payload.starts_at.unwrap_or(existing.starts_at);
    let due_at = payload.due_at.unwrap_or(existing.due_at);
    let due_timezone = payload.due_timezone.unwrap_or(existing.due_timezone);
    let epic = payload.epic.unwrap_or(existing.epic);
    let color = payload.color.unwrap_or(existing.color);
    let assignee = payload.assignee.unwrap_or(existing.assignee);
    let subtasks = payload.subtasks.unwrap_or(existing.subtasks);
    let comments = payload.comments.unwrap_or(existing.comments);

    let completed_at = match payload.completed_at {
        Some(explicit) => explicit,
        None if status == "done" && existing.completed_at.is_none() => Some(now.clone()),
        None if status != "done" => None,
        None => existing.completed_at,
    };

    let subtasks_json = serde_json::to_string(&subtasks).map_err(|e| e.to_string())?;
    let comments_json = serde_json::to_string(&comments).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE tasks
         SET task_key = ?1, title = ?2, description = ?3, project_id = ?4, status = ?5, priority = ?6,
             starts_at = ?7, due_at = ?8, due_timezone = ?9, completed_at = ?10, epic = ?11, color = ?12,
             assignee = ?13, subtasks_json = ?14, comments_json = ?15, updated_at = ?16
         WHERE id = ?17",
        rusqlite::params![
            &task_key,
            &title,
            &description,
            &project_id,
            &status,
            &priority,
            &starts_at,
            &due_at,
            &due_timezone,
            &completed_at,
            &epic,
            &color,
            &assignee,
            &subtasks_json,
            &comments_json,
            &now,
            &existing.id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Task {
        id: existing.id,
        project_id,
        task_key,
        title,
        description,
        status,
        priority,
        starts_at,
        due_at,
        due_timezone,
        completed_at,
        epic,
        color,
        assignee,
        subtasks,
        comments,
        created_at: existing.created_at,
        updated_at: now,
        deleted_at: existing.deleted_at,
    })
}

pub(crate) fn soft_delete_task_with_conn(
    conn: &rusqlite::Connection,
    id: &str,
) -> Result<bool, String> {
    let now = Utc::now().to_rfc3339();
    let affected = conn
        .execute(
            "UPDATE tasks SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
            rusqlite::params![&now, id],
        )
        .map_err(|e| e.to_string())?;

    Ok(affected > 0)
}

pub(crate) fn restore_task_with_conn(
    conn: &rusqlite::Connection,
    id: &str,
) -> Result<bool, String> {
    let now = Utc::now().to_rfc3339();
    let affected = conn
        .execute(
            "UPDATE tasks SET deleted_at = NULL, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NOT NULL",
            rusqlite::params![&now, id],
        )
        .map_err(|e| e.to_string())?;

    Ok(affected > 0)
}

#[tauri::command]
pub fn get_tasks(
    state: State<'_, DatabaseState>,
    include_deleted: Option<bool>,
) -> Result<Vec<Task>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    get_tasks_with_conn(&conn, include_deleted.unwrap_or(false))
}

#[tauri::command]
pub fn create_task(
    state: State<'_, DatabaseState>,
    payload: CreateTaskPayload,
) -> Result<Task, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    create_task_with_conn(&conn, payload)
}

#[tauri::command]
pub fn update_task(
    state: State<'_, DatabaseState>,
    payload: UpdateTaskPayload,
) -> Result<Task, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    update_task_with_conn(&conn, payload)
}

#[tauri::command]
pub fn soft_delete_task(state: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    soft_delete_task_with_conn(&conn, &id)
}

#[tauri::command]
pub fn restore_task(state: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    restore_task_with_conn(&conn, &id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{run_migrations, DatabaseState};

    fn setup_db() -> DatabaseState {
        let db = DatabaseState::in_memory().expect("in-memory sqlite");
        let mut conn = db.conn.lock().expect("lock");
        run_migrations(&mut conn).expect("initial migrations");
        drop(conn);
        db
    }

    #[test]
    fn migrations_are_idempotent() {
        let db = setup_db();
        let mut conn = db.conn.lock().expect("lock");
        run_migrations(&mut conn).expect("re-running migrations should be idempotent");
    }

    #[test]
    fn create_update_and_soft_delete_task() {
        let db = setup_db();
        let conn = db.conn.lock().expect("lock");

        let created = create_task_with_conn(
            &conn,
            CreateTaskPayload {
                task_key: None,
                title: "Wire IPC".to_string(),
                description: Some("Initial".to_string()),
                project_id: None,
                status: None,
                priority: Some("high".to_string()),
                starts_at: None,
                due_at: None,
                due_timezone: None,
                epic: None,
                color: None,
                assignee: Some("FN".to_string()),
                subtasks: Some(vec![Subtask {
                    id: "sub-1".to_string(),
                    title: "Step 1".to_string(),
                    completed: false,
                }]),
                comments: Some(vec![TaskComment {
                    id: "c-1".to_string(),
                    author: "FN".to_string(),
                    text: "Started".to_string(),
                    created_at: "2026-11-19T00:00:00Z".to_string(),
                }]),
            },
        )
        .expect("create task");

        assert_eq!(created.task_key, "MVN-1");
        assert_eq!(created.assignee.as_deref(), Some("FN"));
        assert_eq!(created.subtasks.len(), 1);
        assert_eq!(created.comments.len(), 1);

        let loaded = get_tasks_with_conn(&conn, false).expect("get tasks");
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].subtasks, created.subtasks);

        let done_payload: UpdateTaskPayload = serde_json::from_value(serde_json::json!({
            "id": created.id,
            "status": "done",
            "assignee": null,
            "subtasks": [{ "id": "sub-1", "title": "Step 1", "completed": true }]
        }))
        .expect("deserialize update payload");
        let done_task = update_task_with_conn(&conn, done_payload).expect("update to done");
        assert_eq!(done_task.status, "done");
        assert!(done_task.completed_at.is_some());
        assert_eq!(done_task.assignee, None);
        assert!(done_task.subtasks[0].completed);

        let reopen_payload: UpdateTaskPayload = serde_json::from_value(serde_json::json!({
            "id": created.id,
            "status": "todo"
        }))
        .expect("deserialize reopen payload");
        let reopened = update_task_with_conn(&conn, reopen_payload).expect("reopen task");
        assert_eq!(reopened.completed_at, None);

        assert!(soft_delete_task_with_conn(&conn, &created.id).expect("soft delete"));
        assert!(get_tasks_with_conn(&conn, false).expect("active").is_empty());
        assert_eq!(get_tasks_with_conn(&conn, true).expect("all").len(), 1);
        assert!(restore_task_with_conn(&conn, &created.id).expect("restore"));
        assert_eq!(get_tasks_with_conn(&conn, false).expect("restored").len(), 1);
    }
}
