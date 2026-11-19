---
name: rust-sqlite-architecture
description: Architectural standards and guidelines for Rust Tauri 2 and SQLite persistence in MAVEN desktop. Use whenever modifying database schemas, migrations, or Rust IPC handlers.
---

# Rust & SQLite Architecture Guidelines

Mandatory backend standards for `apps/desktop/src-tauri/` and `packages/migrations/`.

## 1. Single Database Owner
- Local SQLite persistence is owned exclusively by the Rust host via `rusqlite`.
- React/TypeScript never accesses `.db` files directly; all reads and writes route through Tauri IPC commands (`apps/desktop/src/lib/ipc.ts`).

## 2. Connection Safety & Transactions
- Store the connection in `std::sync::Mutex<rusqlite::Connection>` via `tauri::State<DatabaseState>`.
- Enable `PRAGMA foreign_keys = ON;`, `PRAGMA journal_mode = WAL;`, `PRAGMA synchronous = NORMAL;`, and `PRAGMA busy_timeout = 5000;` on disk connections.
- Wrap multi-step writes and migrations in ACID transactions (`conn.transaction()?`).
- **Fail fast on disk DB errors:** Never fall back to `:memory:` in production. Gate `DatabaseState::in_memory()` strictly behind `#[cfg(test)]`.
- **No mutex re-locking:** `std::sync::Mutex` is not re-entrant. Extract `pub(crate) fn ..._with_conn(conn: &Connection, ...)` helpers when commands share logic—never call another `#[tauri::command]` while holding `state.conn.lock()`.

## 3. Append-Only Migrations
- Never modify an already-released SQL file (`0001_initial_schema.sql`, etc.). Add a new `NNNN_<name>.sql` file in `packages/migrations/sql/` and append it to `MIGRATIONS` in `src-tauri/src/db/migration.rs`.
- Run `PRAGMA foreign_key_check;` after applying migrations and fail if any violation row is returned.

## 4. Tauri 2 IPC & Contract Conventions
- Tauri 2 converts Rust `snake_case` command arguments to JS `camelCase` (`include_deleted` -> `{ includeDeleted }`), while serde payload structs stay `snake_case` matching `@maven/contracts`.
- Nullable patch fields in update payloads must distinguish omitted (`None`) from explicit `null` (`Some(None)`) using double-option deserialization.
- Register every new `#[tauri::command]` in `tauri::generate_handler![]` inside `src-tauri/src/lib.rs`.

## 5. Soft Delete & FTS5 Search
- `tasks` and `notes` enforce soft delete (`deleted_at TEXT NULL`): default queries filter `WHERE deleted_at IS NULL`; default delete sets `deleted_at` and `updated_at`.
- `notes_fts` (`USING fts5`) stays synced via `AFTER INSERT` / `AFTER UPDATE` / `AFTER DELETE` triggers. Escape FTS5 search terms as double-quoted prefix tokens (`"term"*`) so punctuation never causes syntax errors.
