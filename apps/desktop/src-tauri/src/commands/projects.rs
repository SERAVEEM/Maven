use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::db::DatabaseState;

#[derive(Debug, Serialize, Deserialize)]
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

#[tauri::command]
pub fn get_projects(state: State<'_, DatabaseState>) -> Result<Vec<Project>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

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

#[tauri::command]
pub fn create_project(
    state: State<'_, DatabaseState>,
    payload: CreateProjectPayload,
) -> Result<Project, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
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

