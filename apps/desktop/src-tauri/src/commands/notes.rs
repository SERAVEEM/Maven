use chrono::Utc;
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::db::DatabaseState;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<Tag>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateNotePayload {
    pub title: String,
    pub content: String,
    #[serde(default)]
    pub tag_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateNotePayload {
    pub id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    #[serde(default)]
    pub tag_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTagPayload {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct SetNoteTagsPayload {
    pub note_id: String,
    pub tag_ids: Vec<String>,
}

fn row_to_note(row: &rusqlite::Row<'_>) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
        deleted_at: row.get(5)?,
        tags: None,
    })
}

pub(crate) fn get_tags_for_note(
    conn: &rusqlite::Connection,
    note_id: &str,
) -> Result<Vec<Tag>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name, t.created_at
             FROM tags t
             JOIN note_tags nt ON t.id = nt.tag_id
             WHERE nt.note_id = ?1
             ORDER BY t.name ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([note_id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut tags = Vec::new();
    for tag in rows {
        tags.push(tag.map_err(|e| e.to_string())?);
    }
    Ok(tags)
}

pub(crate) fn get_tags_with_conn(conn: &rusqlite::Connection) -> Result<Vec<Tag>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, created_at FROM tags ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut tags = Vec::new();
    for tag in rows {
        tags.push(tag.map_err(|e| e.to_string())?);
    }
    Ok(tags)
}

pub(crate) fn create_tag_with_conn(
    conn: &rusqlite::Connection,
    name: &str,
) -> Result<Tag, String> {
    let clean_name = name.trim();
    if clean_name.is_empty() {
        return Err("Tag name cannot be empty".to_string());
    }

    // Return existing tag if name already exists (case-insensitive)
    let existing = conn
        .query_row(
            "SELECT id, name, created_at FROM tags WHERE LOWER(name) = LOWER(?1)",
            [clean_name],
            |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    created_at: row.get(2)?,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if let Some(tag) = existing {
        return Ok(tag);
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO tags (id, name, created_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![&id, clean_name, &now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Tag {
        id,
        name: clean_name.to_string(),
        created_at: now,
    })
}

pub(crate) fn set_note_tags_with_conn(
    conn: &mut rusqlite::Connection,
    note_id: &str,
    tag_ids: &[String],
) -> Result<Vec<Tag>, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let note_exists: bool = tx
        .query_row(
            "SELECT COUNT(*) FROM notes WHERE id = ?1",
            [note_id],
            |row| row.get::<_, i64>(0),
        )
        .map(|c| c > 0)
        .map_err(|e| e.to_string())?;

    if !note_exists {
        return Err("Note not found".to_string());
    }

    tx.execute("DELETE FROM note_tags WHERE note_id = ?1", [note_id])
        .map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    for tag_id in tag_ids {
        let tag_exists: bool = tx
            .query_row(
                "SELECT COUNT(*) FROM tags WHERE id = ?1",
                [tag_id],
                |row| row.get::<_, i64>(0),
            )
            .map(|c| c > 0)
            .map_err(|e| e.to_string())?;

        if tag_exists {
            tx.execute(
                "INSERT OR IGNORE INTO note_tags (note_id, tag_id, created_at) VALUES (?1, ?2, ?3)",
                rusqlite::params![note_id, tag_id, &now],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;

    get_tags_for_note(conn, note_id)
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
    for note_res in rows {
        let mut note = note_res.map_err(|e| e.to_string())?;
        note.tags = get_tags_for_note(conn, &note.id).ok();
        notes.push(note);
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
    for note_res in rows {
        let mut note = note_res.map_err(|e| e.to_string())?;
        note.tags = get_tags_for_note(conn, &note.id).ok();
        notes.push(note);
    }
    Ok(notes)
}

pub(crate) fn create_note_with_conn(
    conn: &mut rusqlite::Connection,
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

    if let Some(tag_ids) = payload.tag_ids {
        let _ = set_note_tags_with_conn(conn, &id, &tag_ids);
    }

    let tags = get_tags_for_note(conn, &id).ok();

    Ok(Note {
        id,
        title,
        content: payload.content,
        created_at: now.clone(),
        updated_at: now,
        deleted_at: None,
        tags,
    })
}

pub(crate) fn update_note_with_conn(
    conn: &mut rusqlite::Connection,
    payload: UpdateNotePayload,
) -> Result<Note, String> {
    let existing = conn
        .query_row(
            "SELECT id, title, content, created_at, updated_at, deleted_at FROM notes WHERE id = ?1",
            [&payload.id],
            row_to_note,
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => "Note not found".to_string(),
            other => other.to_string(),
        })?;

    let now = Utc::now().to_rfc3339();
    let title = match payload.title {
        Some(t) => {
            let trimmed = t.trim().to_string();
            if trimmed.is_empty() {
                return Err("Note title cannot be empty".to_string());
            }
            trimmed
        }
        None => existing.title,
    };
    let content = payload.content.unwrap_or(existing.content);

    conn.execute(
        "UPDATE notes SET title = ?1, content = ?2, updated_at = ?3 WHERE id = ?4",
        rusqlite::params![&title, &content, &now, &existing.id],
    )
    .map_err(|e| e.to_string())?;

    if let Some(tag_ids) = payload.tag_ids {
        let _ = set_note_tags_with_conn(conn, &existing.id, &tag_ids);
    }

    let tags = get_tags_for_note(conn, &existing.id).ok();

    Ok(Note {
        id: existing.id,
        title,
        content,
        created_at: existing.created_at,
        updated_at: now,
        deleted_at: existing.deleted_at,
        tags,
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

pub(crate) fn restore_note_with_conn(
    conn: &rusqlite::Connection,
    id: &str,
) -> Result<bool, String> {
    let now = Utc::now().to_rfc3339();
    let affected = conn
        .execute(
            "UPDATE notes SET deleted_at = NULL, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NOT NULL",
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
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    create_note_with_conn(&mut conn, payload)
}

#[tauri::command]
pub fn update_note(
    state: State<'_, DatabaseState>,
    payload: UpdateNotePayload,
) -> Result<Note, String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    update_note_with_conn(&mut conn, payload)
}

#[tauri::command]
pub fn soft_delete_note(state: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    soft_delete_note_with_conn(&conn, &id)
}

#[tauri::command]
pub fn restore_note(state: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    restore_note_with_conn(&conn, &id)
}

#[tauri::command]
pub fn get_tags(state: State<'_, DatabaseState>) -> Result<Vec<Tag>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    get_tags_with_conn(&conn)
}

#[tauri::command]
pub fn create_tag(
    state: State<'_, DatabaseState>,
    payload: CreateTagPayload,
) -> Result<Tag, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    create_tag_with_conn(&conn, &payload.name)
}

#[tauri::command]
pub fn set_note_tags(
    state: State<'_, DatabaseState>,
    payload: SetNoteTagsPayload,
) -> Result<Vec<Tag>, String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    set_note_tags_with_conn(&mut conn, &payload.note_id, &payload.tag_ids)
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
            &mut conn,
            CreateNotePayload {
                title: "Architecture Note".to_string(),
                content: "Local-first: SQLite with FTS5 indexing".to_string(),
                tag_ids: None,
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

    #[test]
    fn update_note_triggers_fts5_reindex() {
        let db = DatabaseState::in_memory().expect("in-memory sqlite");
        let mut conn = db.conn.lock().expect("lock");
        run_migrations(&mut conn).expect("migrations");

        let note = create_note_with_conn(
            &mut conn,
            CreateNotePayload {
                title: "Quantum Physics".to_string(),
                content: "Entanglement and superposition notes".to_string(),
                tag_ids: None,
            },
        )
        .expect("create note");

        let hits_before = search_notes_with_conn(&conn, "superposition").expect("fts search");
        assert_eq!(hits_before.len(), 1);

        let updated = update_note_with_conn(
            &mut conn,
            UpdateNotePayload {
                id: note.id.clone(),
                title: Some("Relativity Mechanics".to_string()),
                content: Some("Spacetime curvature and geodesics".to_string()),
                tag_ids: None,
            },
        )
        .expect("update note");

        assert_eq!(updated.title, "Relativity Mechanics");

        // Old keyword should no longer match
        let old_hits = search_notes_with_conn(&conn, "superposition").expect("fts search");
        assert_eq!(old_hits.len(), 0);

        // New keyword must match via FTS5 trigger notes_au
        let new_hits = search_notes_with_conn(&conn, "geodesics").expect("fts search");
        assert_eq!(new_hits.len(), 1);
        assert_eq!(new_hits[0].id, note.id);
    }

    #[test]
    fn restore_note_soft_undeletes() {
        let db = DatabaseState::in_memory().expect("in-memory sqlite");
        let mut conn = db.conn.lock().expect("lock");
        run_migrations(&mut conn).expect("migrations");

        let note = create_note_with_conn(
            &mut conn,
            CreateNotePayload {
                title: "Trash Test Note".to_string(),
                content: "Some draft to be trashed".to_string(),
                tag_ids: None,
            },
        )
        .expect("create note");

        // Soft delete
        assert!(soft_delete_note_with_conn(&conn, &note.id).expect("delete"));
        assert!(get_notes_with_conn(&conn, false).expect("active notes").is_empty());
        assert_eq!(get_notes_with_conn(&conn, true).expect("all notes").len(), 1);

        // Restore
        assert!(restore_note_with_conn(&conn, &note.id).expect("restore"));
        let active = get_notes_with_conn(&conn, false).expect("active notes");
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].id, note.id);
        assert!(active[0].deleted_at.is_none());
    }

    #[test]
    fn tags_crud_and_acid_set_note_tags() {
        let db = DatabaseState::in_memory().expect("in-memory sqlite");
        let mut conn = db.conn.lock().expect("lock");
        run_migrations(&mut conn).expect("migrations");

        let tag1 = create_tag_with_conn(&conn, "frontend").expect("tag1");
        let tag2 = create_tag_with_conn(&conn, "react").expect("tag2");

        // Duplicate name returns existing tag idempotently
        let tag1_dup = create_tag_with_conn(&conn, " Frontend ").expect("tag1 dup");
        assert_eq!(tag1.id, tag1_dup.id);

        let note = create_note_with_conn(
            &mut conn,
            CreateNotePayload {
                title: "Frontend Guide".to_string(),
                content: "React 19 hooks and patterns".to_string(),
                tag_ids: Some(vec![tag1.id.clone()]),
            },
        )
        .expect("create note");

        assert_eq!(note.tags.as_ref().map(|t| t.len()), Some(1));

        // Set note tags with transaction
        let updated_tags = set_note_tags_with_conn(
            &mut conn,
            &note.id,
            &[tag1.id.clone(), tag2.id.clone()],
        )
        .expect("set tags");
        assert_eq!(updated_tags.len(), 2);

        // Detach one tag
        let detached_tags = set_note_tags_with_conn(
            &mut conn,
            &note.id,
            &[tag2.id.clone()],
        )
        .expect("detach tag");
        assert_eq!(detached_tags.len(), 1);
        assert_eq!(detached_tags[0].id, tag2.id);

        let tags_list = get_tags_with_conn(&conn).expect("get tags");
        assert_eq!(tags_list.len(), 2);
    }
}
