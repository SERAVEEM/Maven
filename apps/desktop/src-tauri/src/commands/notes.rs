use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::db::DatabaseState;

#[derive(Debug, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateNotePayload {
    pub title: String,
    pub content: String,
}

#[tauri::command]
pub fn get_notes(
    state: State<'_, DatabaseState>,
    include_deleted: Option<bool>,
) -> Result<Vec<Note>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let show_deleted = include_deleted.unwrap_or(false);

    let query = if show_deleted {
        "SELECT id, title, content, created_at, updated_at, deleted_at FROM notes ORDER BY updated_at DESC"
    } else {
        "SELECT id, title, content, created_at, updated_at, deleted_at FROM notes WHERE deleted_at IS NULL ORDER BY updated_at DESC"
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                deleted_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut notes = Vec::new();
    for note in rows {
        notes.push(note.map_err(|e| e.to_string())?);
    }
    Ok(notes)
}

#[tauri::command]
pub fn search_notes(state: State<'_, DatabaseState>, query: String) -> Result<Vec<Note>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let clean_query = query.trim();

    if clean_query.is_empty() {
        return get_notes(state, Some(false));
    }

    // FTS5 Match Query with token prefix search: e.g. "arsitektur*"
    let fts_query = format!("{}*", clean_query.replace('"', "\"\""));

    let mut stmt = conn
        .prepare(
            "SELECT n.id, n.title, n.content, n.created_at, n.updated_at, n.deleted_at
             FROM notes n
             JOIN notes_fts f ON n.rowid = f.rowid
             WHERE notes_fts MATCH ?1 AND n.deleted_at IS NULL
             ORDER BY rank",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&fts_query], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                deleted_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut notes = Vec::new();
    for note in rows {
        notes.push(note.map_err(|e| e.to_string())?);
    }
    Ok(notes)
}

#[tauri::command]
pub fn create_note(
    state: State<'_, DatabaseState>,
    payload: CreateNotePayload,
) -> Result<Note, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let title = payload.title.trim().to_string();

    if title.is_empty() {
        return Err("Note title cannot be empty".to_string());
    }

    conn.execute(
        "INSERT INTO notes (id, title, content, created_at, updated_at, deleted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, NULL)",
        rusqlite::params![&id, &title, &payload.content, &now, &now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Note {
        id,
        title,
        content: payload.content,
        created_at: now.clone(),
        updated_at: now,
        deleted_at: None,
    })
}

#[tauri::command]
pub fn soft_delete_note(state: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let affected = conn
        .execute(
            "UPDATE notes SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
            rusqlite::params![&now, &id],
        )
        .map_err(|e| e.to_string())?;

    Ok(affected > 0)
}

