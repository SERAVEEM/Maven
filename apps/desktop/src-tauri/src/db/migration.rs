use rusqlite::Connection;

const MIGRATIONS: &[(&str, &str)] = &[
    (
        "0001_initial_schema",
        include_str!("../../../../../packages/migrations/sql/0001_initial_schema.sql"),
    ),
    (
        "0002_task_details",
        include_str!("../../../../../packages/migrations/sql/0002_task_details.sql"),
    ),
];

pub fn run_migrations(conn: &mut Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            id TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL,
            checksum TEXT
        );",
    )
    .map_err(|e| e.to_string())?;

    for &(id, sql) in MIGRATIONS {
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM schema_migrations WHERE id = ?1",
                [id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if count == 0 {
            let tx = conn.transaction().map_err(|e| e.to_string())?;
            tx.execute_batch(sql).map_err(|e| e.to_string())?;
            tx.execute(
                "INSERT INTO schema_migrations (id, applied_at, checksum) VALUES (?1, datetime('now'), 'applied')",
                [id],
            )
            .map_err(|e| e.to_string())?;
            tx.commit().map_err(|e| e.to_string())?;
        }
    }

    let mut fk_stmt = conn
        .prepare("PRAGMA foreign_key_check")
        .map_err(|e| e.to_string())?;
    let mut fk_rows = fk_stmt.query([]).map_err(|e| e.to_string())?;
    if fk_rows.next().map_err(|e| e.to_string())?.is_some() {
        return Err("SQLite foreign key integrity check failed after migration".to_string());
    }

    Ok(())
}

