use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

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

fn row_to_note(row: &rusqlite::Row<'_>) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
        deleted_at: row.get(5)?,
    })
}

pub(crate) fn get_notes_with_conn(
    conn: &rusqlite::Connection,
    include_deleted: bool,
) -> Result<Vec<Note>, String> {
    let query = if include_deleted {
        "SELECT id, title, content, created_at, updated_at, deleted_at FROM notes ORDER BY updated_at DESC"
    } else {
        "SELECT id, title, content, created_at, updated_at, deleted_at FROM notes WHERE deleted_at IS NULL ORDER BY updated_at DESC"
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], row_to_note).map_err(|e| e.to_string())?;

    let mut notes = Vec::new();
    for note in rows {
        notes.push(note.map_err(|e| e.to_string())?);
    }
    Ok(notes)
}

pub(crate) fn search_notes_with_conn(
    conn: &rusqlite::Connection,
    query: &str,
) -> Result<Vec<Note>, String> {
    let clean_query = query.trim();
    if clean_query.is_empty() {
        return get_notes_with_conn(conn, false);
    }

    let fts_query = clean_query
        .split_whitespace()
        .map(|tok| format!("\"{}\"*", tok.replace('"', "\"\"")))
        .collect::<Vec<_>>()
        .join(" ");

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
        .query_map([&fts_query], row_to_note)
        .map_err(|e| e.to_string())?;

    let mut notes = Vec::new();
    for note in rows {
        notes.push(note.map_err(|e| e.to_string())?);
    }
    Ok(notes)
}

pub(crate) fn create_note_with_conn(
    conn: &rusqlite::Connection,
    payload: CreateNotePayload,
) -> Result<Note, String> {
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

pub(crate) fn soft_delete_note_with_conn(
    conn: &rusqlite::Connection,
    id: &str,
) -> Result<bool, String> {
    let now = Utc::now().to_rfc3339();
    let affected = conn
        .execute(
            "UPDATE notes SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
            rusqlite::params![&now, id],
        )
        .map_err(|e| e.to_string())?;

    Ok(affected > 0)
}

#[tauri::command]
pub fn get_notes(
    state: State<'_, DatabaseState>,
    include_deleted: Option<bool>,
) -> Result<Vec<Note>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    get_notes_with_conn(&conn, include_deleted.unwrap_or(false))
}

#[tauri::command]
pub fn search_notes(state: State<'_, DatabaseState>, query: String) -> Result<Vec<Note>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    search_notes_with_conn(&conn, &query)
}

#[tauri::command]
pub fn create_note(
    state: State<'_, DatabaseState>,
    payload: CreateNotePayload,
) -> Result<Note, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    create_note_with_conn(&conn, payload)
}

#[tauri::command]
pub fn soft_delete_note(state: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    soft_delete_note_with_conn(&conn, &id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{run_migrations, DatabaseState};

    #[test]
    fn fts_search_handles_empty_punctuation_and_soft_delete() {
        let db = DatabaseState::in_memory().expect("in-memory sqlite");
        let mut conn = db.conn.lock().expect("lock");
        run_migrations(&mut conn).expect("migrations");

        let note = create_note_with_conn(
            &conn,
            CreateNotePayload {
                title: "Architecture Note".to_string(),
                content: "Local-first: SQLite with FTS5 indexing".to_string(),
            },
        )
        .expect("create note");

        let all = search_notes_with_conn(&conn, "   ").expect("empty query");
        assert_eq!(all.len(), 1);

        let hits = search_notes_with_conn(&conn, "local-first: sqlite").expect("punctuated query");
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].id, note.id);

        assert!(soft_delete_note_with_conn(&conn, &note.id).expect("soft delete"));
        assert!(get_notes_with_conn(&conn, false).expect("active").is_empty());
        assert!(search_notes_with_conn(&conn, "SQLite").expect("fts after delete").is_empty());
    }
}
