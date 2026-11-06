# Database Design --- MAVEN

**Versi:** 0.1\
**Status:** Proposed schema\
**Database:** SQLite, one database per device installation

## 1. Design goals

-   Mendukung kebutuhan MVP: tasks, projects, calendar events,
    reminders, notes, chat, memory retrieval, execution logs, settings.
-   Menjaga integritas relasi melalui foreign keys.
-   Menggunakan UUID untuk primary key.
-   Menyimpan timestamp sebagai UTC ISO-8601.
-   Menyimpan IANA timezone secara eksplisit untuk data waktu yang
    terkait kalender.
-   Memungkinkan schema evolution melalui versioned migrations.
-   Tidak mengasumsikan sinkronisasi antarperangkat.

## 2. Konvensi

-   Primary key: `TEXT` UUID.
-   Timestamp: `TEXT` ISO-8601 UTC, contoh `2026-11-06T10:30:00.000Z`.
-   Tanggal tanpa waktu: `TEXT` ISO-8601 date, contoh `2026-11-06`.
-   Boolean: `INTEGER` (`0` atau `1`).
-   Enum: `TEXT` dengan `CHECK` constraint.
-   Foreign key: aktifkan `PRAGMA foreign_keys = ON`.
-   Semua tabel memiliki `created_at`; tabel mutable juga memiliki
    `updated_at`.
-   **Soft Delete:** Gunakan `deleted_at TEXT NULL` (ISO-8601 UTC) pada
    tabel `tasks` dan `notes` untuk mencegah data loss dari kesalahan
    perintah AI atau input pengguna. Query aplikasi memfilter
    `WHERE deleted_at IS NULL` secara default. Hard delete permanen hanya
    dijalankan melalui aksi/konfirmasi khusus.

## 3. Entity relationship overview

``` mermaid
erDiagram
    PROJECTS ||--o{ TASKS : contains
    TASKS ||--o{ REMINDERS : has
    CALENDAR_EVENTS ||--o{ REMINDERS : has
    CONVERSATIONS ||--o{ MESSAGES : contains
    NOTES ||--o{ NOTE_TAGS : tagged
    TAGS ||--o{ NOTE_TAGS : labels
    TASKS ||--o{ EXECUTION_LOGS : related_to
```

`memory_entries` dapat merujuk ke sumber lokal melalui `source_type` dan
`source_id`; relasi polimorfik ini tidak menggunakan foreign key
langsung dan harus divalidasi pada application layer.

## 4. Table definitions

### 4.1 projects

  -----------------------------------------------------------------------
  Column            Type              Constraints       Description
  ----------------- ----------------- ----------------- -----------------
  id                TEXT              PK                UUID

  name              TEXT              NOT NULL          Project name

  description       TEXT              NULL              Optional details

  status            TEXT              NOT NULL, default `active`,
                                      `active`          `completed`,
                                                        `archived`

  color             TEXT              NULL              Optional UI color
                                                        token

  created_at        TEXT              NOT NULL          UTC timestamp

  updated_at        TEXT              NOT NULL          UTC timestamp
  -----------------------------------------------------------------------

### 4.2 tasks

  -----------------------------------------------------------------------
  Column            Type              Constraints       Description
  ----------------- ----------------- ----------------- -----------------
  id                TEXT              PK                UUID

  project_id        TEXT              FK projects(id),  Optional project
                                      ON DELETE SET     
                                      NULL              

  title             TEXT              NOT NULL          Task title

  description       TEXT              NULL              Details

  status            TEXT              NOT NULL, default `todo`,
                                      `todo`            `in_progress`,
                                                        `done`,
                                                        `cancelled`

  priority          TEXT              NOT NULL, default `low`, `medium`,
                                      `medium`          `high`, `urgent`

  due_at            TEXT              NULL              UTC deadline

  due_timezone      TEXT              NULL              IANA timezone
                                                        used for
                                                        input/display

  completed_at      TEXT              NULL              UTC completion
                                                        time

  created_at        TEXT              NOT NULL          UTC timestamp

  updated_at        TEXT              NOT NULL          UTC timestamp

  deleted_at        TEXT              NULL              UTC soft-delete
                                                        timestamp; NULL
                                                        jika aktif
  -----------------------------------------------------------------------

### 4.3 calendar_events

  Column            Type      Constraints           Description
  ----------------- --------- --------------------- ------------------------
  id                TEXT      PK                    UUID
  title             TEXT      NOT NULL              Event title
  description       TEXT      NULL                  Details
  location          TEXT      NULL                  Optional location text
  starts_at         TEXT      NOT NULL              UTC start
  ends_at           TEXT      NULL                  UTC end
  timezone          TEXT      NOT NULL              IANA timezone
  all_day           INTEGER   NOT NULL, default 0   Boolean
  recurrence_rule   TEXT      NULL                  RFC-5545 RRULE (reserved)
  created_at        TEXT      NOT NULL              UTC timestamp
  updated_at        TEXT      NOT NULL              UTC timestamp

Validation: `ends_at IS NULL OR ends_at > starts_at`. For all-day
events, application layer must define whether end date is exclusive and
preserve local date semantics.

### 4.4 reminders

  -------------------------------------------------------------------------------------
  Column                     Type              Constraints            Description
  -------------------------- ----------------- ---------------------- -----------------
  id                         TEXT              PK                     UUID

  task_id                    TEXT              FK tasks(id), ON       Related task
                                               DELETE CASCADE,        
                                               nullable               

  event_id                   TEXT              FK                     Related event
                                               calendar_events(id),   
                                               ON DELETE CASCADE,     
                                               nullable               

  title                      TEXT              NOT NULL               Notification
                                                                      title

  message                    TEXT              NULL                   Notification body

  trigger_at                 TEXT              NOT NULL               UTC trigger time

  timezone                   TEXT              NULL                   IANA timezone for
                                                                      local scheduling

  status                     TEXT              NOT NULL, default      `scheduled`,
                                               `scheduled`            `fired`,
                                                                      `cancelled`,
                                                                      `failed`

  platform_notification_id   TEXT              NULL                   Native OS
                                                                      notification
                                                                      identifier

  created_at                 TEXT              NOT NULL               UTC timestamp

  updated_at                 TEXT              NOT NULL               UTC timestamp
  -------------------------------------------------------------------------------------

Constraint: at least one of `task_id` or `event_id` may be set; for
standalone reminders, both may be null. If both are set, the application
must validate that this is an intentional association.

### 4.5 notes

  Column       Type   Constraints                      Description
  ------------ ------ -------------------------------- -------------------------
  id           TEXT   PK                               UUID
  title        TEXT   NOT NULL                         Note title
  content      TEXT   NOT NULL, default empty string   Note body
  created_at   TEXT   NOT NULL                         UTC timestamp
  updated_at   TEXT   NOT NULL                         UTC timestamp
  deleted_at   TEXT   NULL                             UTC soft-delete timestamp

### 4.6 tags

  Column       Type   Constraints        Description
  ------------ ------ ------------------ ---------------------
  id           TEXT   PK                 UUID
  name         TEXT   NOT NULL, UNIQUE   Normalized tag name
  created_at   TEXT   NOT NULL           UTC timestamp

### 4.7 note_tags

  Column       Type   Constraints                               Description
  ------------ ------ ----------------------------------------- ---------------
  note_id      TEXT   PK part, FK notes(id) ON DELETE CASCADE   Note
  tag_id       TEXT   PK part, FK tags(id) ON DELETE CASCADE    Tag
  created_at   TEXT   NOT NULL                                  UTC timestamp

Composite primary key: `(note_id, tag_id)`.

### 4.8 conversations

  Column       Type   Constraints   Description
  ------------ ------ ------------- -----------------------------
  id           TEXT   PK            UUID
  title        TEXT   NULL          Optional conversation title
  created_at   TEXT   NOT NULL      UTC timestamp
  updated_at   TEXT   NOT NULL      UTC timestamp

### 4.9 messages

  -------------------------------------------------------------------------
  Column            Type              Constraints         Description
  ----------------- ----------------- ------------------- -----------------
  id                TEXT              PK                  UUID

  conversation_id   TEXT              NOT NULL, FK        Parent
                                      conversations(id)   conversation
                                      ON DELETE CASCADE   

  role              TEXT              NOT NULL            `user`,
                                                          `assistant`,
                                                          `system`, `tool`

  content           TEXT              NOT NULL            Message content

  metadata_json     TEXT              NULL                Validated JSON
                                                          metadata; no
                                                          secrets

  created_at        TEXT              NOT NULL            UTC timestamp
  -------------------------------------------------------------------------

### 4.10 memory_entries

  ---------------------------------------------------------------------------
  Column            Type              Constraints       Description
  ----------------- ----------------- ----------------- ---------------------
  id                TEXT              PK                UUID

  content           TEXT              NOT NULL          Memory text or
                                                        normalized fact

  source_type       TEXT              NULL              `note`, `task`,
                                                        `conversation`,
                                                        `manual`, etc.

  source_id         TEXT              NULL              Source entity UUID;
                                                        polymorphic

  importance        INTEGER           NOT NULL, default Application-defined
                                      0                 ranking

  embedding_ref     TEXT              NULL              Optional reference to
                                                        local vector/index
                                                        storage

  created_at        TEXT              NOT NULL          UTC timestamp

  updated_at        TEXT              NOT NULL          UTC timestamp
  ---------------------------------------------------------------------------

MVP can begin with ordinary text search. Embeddings/vector search are
optional and should not be required for core operation.

### 4.11 execution_logs

  -------------------------------------------------------------------------------
  Column                  Type              Constraints         Description
  ----------------------- ----------------- ------------------- -----------------
  id                      TEXT              PK                  UUID

  conversation_id         TEXT              NULL, FK            Related
                                            conversations(id)   conversation
                                            ON DELETE SET NULL  

  action_name             TEXT              NOT NULL            Registered action
                                                                identifier

  action_version          TEXT              NOT NULL            Action
                                                                schema/version

  input_summary           TEXT              NULL                Sanitized
                                                                summary, not raw
                                                                secrets

  status                  TEXT              NOT NULL            `pending`,
                                                                `succeeded`,
                                                                `failed`,
                                                                `rejected`,
                                                                `cancelled`

  requires_confirmation   INTEGER           NOT NULL, default 0 Boolean

  confirmed_at            TEXT              NULL                UTC timestamp

  result_summary          TEXT              NULL                Sanitized result

  error_code              TEXT              NULL                Stable error
                                                                identifier

  created_at              TEXT              NOT NULL            UTC timestamp

  completed_at            TEXT              NULL                UTC timestamp
  -------------------------------------------------------------------------------

### 4.12 app_settings

  Column       Type   Constraints   Description
  ------------ ------ ------------- ---------------
  key          TEXT   PK            Setting key
  value_json   TEXT   NOT NULL      JSON value
  updated_at   TEXT   NOT NULL      UTC timestamp

Do not store secrets in plaintext settings. Use OS secure storage for
credentials/tokens if future integrations require them.

## 5. Suggested SQL DDL

``` sql
PRAGMA foreign_keys = ON;

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived')),
  color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_at TEXT,
  due_timezone TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  location TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  timezone TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0 CHECK (all_day IN (0, 1)),
  recurrence_rule TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES calendar_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  message TEXT,
  trigger_at TEXT NOT NULL,
  timezone TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'fired', 'cancelled', 'failed')),
  platform_notification_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Full-Text Search (FTS5) untuk judul dan konten catatan
CREATE VIRTUAL TABLE notes_fts USING fts5(
  title,
  content,
  content='notes',
  content_rowid='rowid'
);

-- Triggers untuk menjaga sinkronisasi FTS5 notes
CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, content)
  VALUES (new.rowid, new.title, new.content);
END;

CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content)
  VALUES('delete', old.rowid, old.title, old.content);
END;

CREATE TRIGGER notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content)
  VALUES('delete', old.rowid, old.title, old.content);
  INSERT INTO notes_fts(rowid, title, content)
  VALUES (new.rowid, new.title, new.content);
END;

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  created_at TEXT NOT NULL
);

CREATE TABLE note_tags (
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE memory_entries (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  source_type TEXT,
  source_id TEXT,
  importance INTEGER NOT NULL DEFAULT 0,
  embedding_ref TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE execution_logs (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  action_name TEXT NOT NULL,
  action_version TEXT NOT NULL,
  input_summary TEXT,
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'succeeded', 'failed', 'rejected', 'cancelled')
  ),
  requires_confirmation INTEGER NOT NULL DEFAULT 0
    CHECK (requires_confirmation IN (0, 1)),
  confirmed_at TEXT,
  result_summary TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_tasks_due_at ON tasks(due_at);
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX idx_events_starts_at ON calendar_events(starts_at);
CREATE INDEX idx_reminders_trigger_status ON reminders(status, trigger_at);
CREATE INDEX idx_notes_updated_at ON notes(updated_at);
CREATE INDEX idx_notes_deleted_at ON notes(deleted_at);
CREATE INDEX idx_messages_conversation_created
  ON messages(conversation_id, created_at);
CREATE INDEX idx_memory_source ON memory_entries(source_type, source_id);
CREATE INDEX idx_execution_created_at ON execution_logs(created_at);
```

## 6. Search strategy

### MVP (v0.1)

-   Menggunakan **SQLite FTS5** virtual table (`notes_fts`) yang disinkronkan
    secara otomatis melalui triggers saat insert, update, dan delete.
-   FTS5 disediakan langsung oleh `rusqlite` dengan feature `bundled-full`
    sehingga tidak memerlukan ekstensi luar atau penulisan ulang query dari `LIKE`.
-   Pencarian teks mendukung token matching, prefix search (`word*`), dan ranking relevansi `bm25`.
-   Tidak memerlukan vector database pada tahap awal MVP.

### Later phase

-   Local embeddings dan vector retrieval dapat diperkenalkan di belakang
    interface `MemorySearch` untuk pencarian semantik tingkat lanjut.
-   Data embedding disimpan di luar tabel relasional primer atau via ekstensi sqlite-vss/sqlite-vec jika diperlukan.
-   Indeks semantik dapat di-rebuild kapan saja dari entitas sumber.

## 7. Migration and transaction policy

-   Maintain a `schema_migrations` table with migration ID, applied
    timestamp, and checksum.
-   Each migration is deterministic and runs in a transaction where
    supported.
-   Never edit an already released migration; create a new migration.
-   Test fresh database creation and upgrade from each supported
    previous schema version.
-   Back up database before destructive migrations.
-   Run foreign key checks after migration.
-   Use parameterized queries only.

## 8. Data lifecycle and deletion

-   **Soft Delete (Default untuk Tasks & Notes):**
    -   Menghapus task mengisi `tasks.deleted_at = datetime('now')`. Reminder terkait dinonaktifkan (`status = 'cancelled'`), bukan langsung dihapus permanen.
    -   Menghapus note mengisi `notes.deleted_at = datetime('now')`.
    -   Pengguna dapat memulihkan (*restore*) data yang terhapus atau membersihkan secara permanen (*hard delete*).
-   **Hard Delete (Permanen atas permintaan):**
    -   Menghapus project mengubah `tasks.project_id` terkait menjadi NULL.
    -   Hard delete permanen pada task menghapus reminders terkait via cascade.
    -   Hard delete pada calendar event menghapus reminders terkait via cascade.
    -   Hard delete pada note menghapus relasi `note_tags` via cascade.
    -   Menghapus conversation menghapus pesan; execution logs mempertahankan history dengan `conversation_id` diatur ke NULL.
-   Menyediakan fungsi cadangan lokal (*local backup*) melalui SQLite `VACUUM INTO 'backup.db'`.

## 9. Status keputusan database

### Disepakati untuk v0.1

-   **Soft Delete:** Diadopsi untuk `tasks` dan `notes` melalui `deleted_at`.
-   **FTS5:** Diaktifkan sejak migrasi skema pertama untuk pencarian catatan instan.
-   **Recurrence:** Kolom `recurrence_rule` disiapkan di `calendar_events` untuk kompatibilitas masa depan, namun logika ekspansi RRULE tidak dimasukkan ke MVP v0.1.
-   **Reminders:** Boleh berdiri sendiri (*standalone* tanpa task/event) atau terikat ke `task_id` / `event_id`.
-   **Database Owner:** Host Rust (`rusqlite`) sebagai pemilik tunggal; frontend React tidak memiliki koneksi SQLite langsung.
-   **Tabel users:** Ditiadakan pada MVP karena asumsi satu pengguna lokal per instalasi perangkat.

### Pertanyaan terbuka berikutnya

-   Apakah riwayat percakapan chat otomatis di-purge setelah rentang waktu tertentu (misal 30 hari)?
-   Apakah enkripsi database at-rest (misal SQLCipher) dibutuhkan sebelum rilis v1.0?
