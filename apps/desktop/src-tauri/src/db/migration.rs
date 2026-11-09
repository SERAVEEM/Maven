use rusqlite::Connection;

const INITIAL_SCHEMA: &str = include_str!("../../../../../packages/migrations/sql/0001_initial_schema.sql");

pub fn run_migrations(conn: &mut Connection) -> Result<(), rusqlite::Error> {
    // Schema migrations tracking table
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            id TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL,
            checksum TEXT
        );",
    )?;

    // Check if 0001 has been applied
    let mut stmt = conn.prepare("SELECT COUNT(*) FROM schema_migrations WHERE id = '0001_initial_schema'")?;
    let count: i64 = stmt.query_row([], |row| row.get(0))?;

    if count == 0 {
        let tx = conn.transaction()?;
        tx.execute_batch(INITIAL_SCHEMA)?;
        tx.execute(
            "INSERT INTO schema_migrations (id, applied_at, checksum) VALUES ('0001_initial_schema', datetime('now'), 'baseline')",
            [],
        )?;
        tx.commit()?;
    }

    Ok(())
}

