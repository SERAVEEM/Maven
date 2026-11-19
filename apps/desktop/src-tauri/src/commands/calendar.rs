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
    pub recurrence_rule: Option<String>,
}

fn deserialize_double_option<'de, T, D>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: serde::Deserializer<'de>,
{
    Deserialize::deserialize(deserializer).map(Some)
}

#[derive(Debug, Deserialize)]
pub struct UpdateCalendarEventPayload {
    pub id: String,
    pub title: Option<String>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub description: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub location: Option<Option<String>>,
    pub starts_at: Option<String>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub ends_at: Option<Option<String>>,
    pub timezone: Option<String>,
    pub all_day: Option<bool>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub recurrence_rule: Option<Option<String>>,
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

    // BR-002: ends_at > starts_at
    if let Some(ref ends) = payload.ends_at {
        if ends <= &payload.starts_at {
            return Err("BR-002: ends_at must be strictly greater than starts_at".to_string());
        }
    }

    conn.execute(
        "INSERT INTO calendar_events (id, title, description, location, starts_at, ends_at, timezone, all_day, recurrence_rule, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        rusqlite::params![
            &id,
            &title,
            &payload.description,
            &payload.location,
            &payload.starts_at,
            &payload.ends_at,
            &timezone,
            if all_day { 1 } else { 0 },
            &payload.recurrence_rule,
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
        recurrence_rule: payload.recurrence_rule,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_calendar_event(
    state: State<'_, DatabaseState>,
    payload: UpdateCalendarEventPayload,
) -> Result<CalendarEvent, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let existing: CalendarEvent = conn
        .query_row(
            "SELECT id, title, description, location, starts_at, ends_at, timezone, all_day, recurrence_rule, created_at, updated_at FROM calendar_events WHERE id = ?1",
            [&payload.id],
            |row| {
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
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => "Calendar event not found".to_string(),
            other => other.to_string(),
        })?;

    let now = Utc::now().to_rfc3339();

    let title = match payload.title {
        Some(t) => {
            let trimmed = t.trim().to_string();
            if trimmed.is_empty() {
                return Err("Event title cannot be empty".to_string());
            }
            trimmed
        }
        None => existing.title,
    };

    let description = match payload.description {
        Some(desc) => desc,
        None => existing.description,
    };

    let location = match payload.location {
        Some(loc) => loc,
        None => existing.location,
    };

    let starts_at = payload.starts_at.unwrap_or(existing.starts_at);

    let ends_at = match payload.ends_at {
        Some(ends) => ends,
        None => existing.ends_at,
    };

    let timezone = payload.timezone.unwrap_or(existing.timezone);
    let all_day = payload.all_day.unwrap_or(existing.all_day);

    let recurrence_rule = match payload.recurrence_rule {
        Some(rrule) => rrule,
        None => existing.recurrence_rule,
    };

    // BR-002: ends_at > starts_at
    if let Some(ref ends) = ends_at {
        if ends <= &starts_at {
            return Err("BR-002: ends_at must be strictly greater than starts_at".to_string());
        }
    }

    conn.execute(
        "UPDATE calendar_events
         SET title = ?1, description = ?2, location = ?3, starts_at = ?4, ends_at = ?5, timezone = ?6, all_day = ?7, recurrence_rule = ?8, updated_at = ?9
         WHERE id = ?10",
        rusqlite::params![
            &title,
            &description,
            &location,
            &starts_at,
            &ends_at,
            &timezone,
            if all_day { 1 } else { 0 },
            &recurrence_rule,
            &now,
            &payload.id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(CalendarEvent {
        id: payload.id,
        title,
        description,
        location,
        starts_at,
        ends_at,
        timezone,
        all_day,
        recurrence_rule,
        created_at: existing.created_at,
        updated_at: now,
    })
}

#[tauri::command]
pub fn delete_calendar_event(
    state: State<'_, DatabaseState>,
    id: String,
) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let rows_affected = conn
        .execute("DELETE FROM calendar_events WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(rows_affected > 0)
}
