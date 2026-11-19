use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::db::DatabaseState;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectPayload {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
}

fn deserialize_double_option<'de, T, D>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: serde::Deserializer<'de>,
{
    Deserialize::deserialize(deserializer).map(Some)
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectPayload {
    pub id: String,
    pub name: Option<String>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub description: Option<Option<String>>,
    pub status: Option<String>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub color: Option<Option<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeleteProjectResult {
    pub deleted: bool,
    pub unlinked_tasks: u32,
}

pub(crate) fn get_projects_with_conn(conn: &rusqlite::Connection) -> Result<Vec<Project>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, description, status, color, created_at, updated_at FROM projects ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                color: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut projects = Vec::new();
    for project in rows {
        projects.push(project.map_err(|e| e.to_string())?);
    }
    Ok(projects)
}

pub(crate) fn create_project_with_conn(
    conn: &rusqlite::Connection,
    payload: CreateProjectPayload,
) -> Result<Project, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let name = payload.name.trim().to_string();

    if name.is_empty() {
        return Err("Project name cannot be empty".to_string());
    }

    conn.execute(
        "INSERT INTO projects (id, name, description, status, color, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'active', ?4, ?5, ?6)",
        rusqlite::params![
            &id,
            &name,
            &payload.description,
            &payload.color,
            &now,
            &now,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Project {
        id,
        name,
        description: payload.description,
        status: "active".to_string(),
        color: payload.color,
        created_at: now.clone(),
        updated_at: now,
    })
}

pub(crate) fn update_project_with_conn(
    conn: &rusqlite::Connection,
    payload: UpdateProjectPayload,
) -> Result<Project, String> {
    let existing = conn
        .query_row(
            "SELECT id, name, description, status, color, created_at, updated_at FROM projects WHERE id = ?1",
            [&payload.id],
            |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    status: row.get(3)?,
                    color: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => "Project not found".to_string(),
            other => other.to_string(),
        })?;

    let name = match payload.name {
        Some(n) => {
            let trimmed = n.trim().to_string();
            if trimmed.is_empty() {
                return Err("Project name cannot be empty".to_string());
            }
            trimmed
        }
        None => existing.name,
    };

    let status = match payload.status {
        Some(s) => {
            let trimmed = s.trim().to_lowercase();
            if !["active", "completed", "archived"].contains(&trimmed.as_str()) {
                return Err("Invalid project status. Must be active, completed, or archived".to_string());
            }
            trimmed
        }
        None => existing.status,
    };

    let description = payload.description.unwrap_or(existing.description);
    let color = payload.color.unwrap_or(existing.color);
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE projects SET name = ?1, description = ?2, status = ?3, color = ?4, updated_at = ?5 WHERE id = ?6",
        rusqlite::params![
            &name,
            &description,
            &status,
            &color,
            &now,
            &existing.id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Project {
        id: existing.id,
        name,
        description,
        status,
        color,
        created_at: existing.created_at,
        updated_at: now,
    })
}

pub(crate) fn delete_project_with_conn(
    conn: &mut rusqlite::Connection,
    id: &str,
) -> Result<DeleteProjectResult, String> {
    // BR-004: In an ACID transaction, unlinks tasks before deleting the project
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let unlinked_tasks = tx
        .execute(
            "UPDATE tasks SET project_id = NULL WHERE project_id = ?1",
            [id],
        )
        .map_err(|e| e.to_string())?;

    let deleted_count = tx
        .execute("DELETE FROM projects WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(DeleteProjectResult {
        deleted: deleted_count > 0,
        unlinked_tasks: unlinked_tasks as u32,
    })
}

#[tauri::command]
pub fn get_projects(state: State<'_, DatabaseState>) -> Result<Vec<Project>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    get_projects_with_conn(&conn)
}

#[tauri::command]
pub fn create_project(
    state: State<'_, DatabaseState>,
    payload: CreateProjectPayload,
) -> Result<Project, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    create_project_with_conn(&conn, payload)
}

#[tauri::command]
pub fn update_project(
    state: State<'_, DatabaseState>,
    payload: UpdateProjectPayload,
) -> Result<Project, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    update_project_with_conn(&conn, payload)
}

#[tauri::command]
pub fn delete_project(
    state: State<'_, DatabaseState>,
    id: String,
) -> Result<DeleteProjectResult, String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    delete_project_with_conn(&mut conn, &id)
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
    fn create_update_and_delete_project_with_br004() {
        let db = setup_db();
        let mut conn = db.conn.lock().expect("lock");

        // 1. Create project
        let project = create_project_with_conn(
            &conn,
            CreateProjectPayload {
                name: "Sprint 2 Core".to_string(),
                description: Some("Core features".to_string()),
                color: Some("#579dff".to_string()),
            },
        )
        .expect("create project");

        assert_eq!(project.name, "Sprint 2 Core");
        assert_eq!(project.status, "active");

        // 2. Add a linked task directly in db
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO tasks (id, project_id, task_key, title, status, priority, created_at, updated_at)
             VALUES ('task-t1', ?1, 'MVN-101', 'Test BR-004 task', 'todo', 'medium', ?2, ?2)",
            rusqlite::params![&project.id, &now],
        )
        .expect("insert task");

        // 3. Update project
        let updated = update_project_with_conn(
            &conn,
            UpdateProjectPayload {
                id: project.id.clone(),
                name: Some("Sprint 2 Completed".to_string()),
                description: None,
                status: Some("completed".to_string()),
                color: Some(Some("#4bce97".to_string())),
            },
        )
        .expect("update project");

        assert_eq!(updated.name, "Sprint 2 Completed");
        assert_eq!(updated.status, "completed");
        assert_eq!(updated.color, Some("#4bce97".to_string()));
        assert_eq!(updated.description, Some("Core features".to_string()));

        // 4. Delete project enforcing BR-004
        let result = delete_project_with_conn(&mut conn, &project.id).expect("delete project");
        assert!(result.deleted);
        assert_eq!(result.unlinked_tasks, 1);

        // Verify project is removed
        let projects = get_projects_with_conn(&conn).expect("get projects");
        assert!(projects.is_empty());

        // Verify task still exists but project_id is NULL
        let project_id_in_task: Option<String> = conn
            .query_row(
                "SELECT project_id FROM tasks WHERE id = 'task-t1'",
                [],
                |row| row.get(0),
            )
            .expect("query task");
        assert_eq!(project_id_in_task, None);
    }
}
