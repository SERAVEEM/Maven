use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::db::DatabaseState;

#[derive(Debug, Serialize, Deserialize)]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub starts_at: String,
    pub ends_at: Option<String>,
    pub timezone: String,
    pub all_day: bool,
    pub recurrence_rule: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCalendarEventPayload {
    pub title: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub starts_at: String,
    pub ends_at: Option<String>,
    pub timezone: Option<String>,
    pub all_day: Option<bool>,
}

#[tauri::command]
pub fn get_calendar_events(state: State<'_, DatabaseState>) -> Result<Vec<CalendarEvent>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, title, description, location, starts_at, ends_at, timezone, all_day, recurrence_rule, created_at, updated_at FROM calendar_events ORDER BY starts_at ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let all_day_int: i32 = row.get(7)?;
            Ok(CalendarEvent {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                location: row.get(3)?,
                starts_at: row.get(4)?,
                ends_at: row.get(5)?,
                timezone: row.get(6)?,
                all_day: all_day_int == 1,
                recurrence_rule: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut events = Vec::new();
    for event in rows {
        events.push(event.map_err(|e| e.to_string())?);
    }
    Ok(events)
}

#[tauri::command]
pub fn create_calendar_event(
    state: State<'_, DatabaseState>,
    payload: CreateCalendarEventPayload,
) -> Result<CalendarEvent, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let title = payload.title.trim().to_string();
    let timezone = payload.timezone.unwrap_or_else(|| "Asia/Jakarta".to_string());
    let all_day = payload.all_day.unwrap_or(false);

    if title.is_empty() {
        return Err("Event title cannot be empty".to_string());
    }

    conn.execute(
        "INSERT INTO calendar_events (id, title, description, location, starts_at, ends_at, timezone, all_day, recurrence_rule, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, ?9, ?10)",
        rusqlite::params![
            &id,
            &title,
            &payload.description,
            &payload.location,
            &payload.starts_at,
            &payload.ends_at,
            &timezone,
            if all_day { 1 } else { 0 },
            &now,
            &now,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(CalendarEvent {
        id,
        title,
        description: payload.description,
        location: payload.location,
        starts_at: payload.starts_at,
        ends_at: payload.ends_at,
        timezone,
        all_day,
        recurrence_rule: None,
        created_at: now.clone(),
        updated_at: now,
    })
}

