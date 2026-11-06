use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::db::DatabaseState;

#[derive(Debug, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub project_id: Option<String>,
    pub task_key: Option<String>,
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
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskPayload {
    pub id: String,
    pub task_key: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub project_id: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub starts_at: Option<String>,
    pub due_at: Option<String>,
    pub due_timezone: Option<String>,
    pub epic: Option<String>,
    pub color: Option<String>,
}

#[tauri::command]
pub fn get_tasks(
    state: State<'_, DatabaseState>,
    include_deleted: Option<bool>,
) -> Result<Vec<Task>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let show_deleted = include_deleted.unwrap_or(false);

    let query = if show_deleted {
        "SELECT id, project_id, task_key, title, description, status, priority, starts_at, due_at, due_timezone, completed_at, epic, color, created_at, updated_at, deleted_at FROM tasks ORDER BY created_at DESC"
    } else {
        "SELECT id, project_id, task_key, title, description, status, priority, starts_at, due_at, due_timezone, completed_at, epic, color, created_at, updated_at, deleted_at FROM tasks WHERE deleted_at IS NULL ORDER BY created_at DESC"
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                project_id: row.get(1)?,
                task_key: row.get(2)?,
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
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
                deleted_at: row.get(15)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut tasks = Vec::new();
    for task in rows {
        tasks.push(task.map_err(|e| e.to_string())?);
    }
    Ok(tasks)
}

#[tauri::command]
pub fn create_task(
    state: State<'_, DatabaseState>,
    payload: CreateTaskPayload,
) -> Result<Task, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let status = payload.status.unwrap_or_else(|| "todo".to_string());
    let priority = payload.priority.unwrap_or_else(|| "medium".to_string());
    let title = payload.title.trim().to_string();

    if title.is_empty() {
        return Err("Task title cannot be empty".to_string());
    }

    let task_key = match payload.task_key {
        Some(k) if !k.trim().is_empty() => k.trim().to_string(),
        _ => {
            let count: i64 = conn
                .query_row("SELECT COUNT(*) FROM tasks", [], |r| r.get(0))
                .unwrap_or(0);
            format!("MVN-{}", count + 1)
        }
    };

    conn.execute(
        "INSERT INTO tasks (id, project_id, task_key, title, description, status, priority, starts_at, due_at, due_timezone, epic, color, created_at, updated_at, deleted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, NULL)",
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
            &now,
            &now,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Task {
        id,
        project_id: payload.project_id,
        task_key: Some(task_key),
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
        created_at: now.clone(),
        updated_at: now,
        deleted_at: None,
    })
}

#[tauri::command]
pub fn soft_delete_task(state: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let affected = conn
        .execute(
            "UPDATE tasks SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
            rusqlite::params![&now, &id],
        )
        .map_err(|e| e.to_string())?;

    Ok(affected > 0)
}

#[tauri::command]
pub fn restore_task(state: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let affected = conn
        .execute(
            "UPDATE tasks SET deleted_at = NULL, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NOT NULL",
            rusqlite::params![&now, &id],
        )
        .map_err(|e| e.to_string())?;

    Ok(affected > 0)
}
