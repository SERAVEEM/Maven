# System Architecture --- MAVEN

**Versi:** 0.1\
**Status:** Proposed architecture\
**Architecture style:** Local-first modular monolith

## 1. Ringkasan

MAVEN menggunakan modular monolith dengan pemisahan tegas antara
presentation, application, domain, AI runtime, action execution, dan
infrastructure. Arsitektur berfokus pada **Windows Desktop (MVP v0.1)**
menggunakan Tauri 2, di mana host Rust memegang otoritas penuh atas
domain logic, persistensi SQLite, dan eksekusi tindakan. Implementasi
native iOS dijadwalkan pada Fase 2 setelah fondasi sistem terbukti stabil.

Tidak ada microservices atau backend cloud wajib pada MVP.

## 2. Prinsip arsitektur

-   Local-first dan offline-capable.
-   Domain logic tidak bergantung pada framework UI.
-   AI menghasilkan intent/structured proposal; application layer
    memvalidasi.
-   Action runtime hanya menjalankan tool allowlisted.
-   Database diakses melalui repository/data-access layer, bukan oleh
    LLM.
-   Platform-specific behavior diisolasi dalam adapter.
-   Shared contracts/specifications menjadi sumber konsistensi lintas
    platform.

## 3. Logical architecture

``` mermaid
flowchart TB
    U[User] --> P[Presentation Layer]
    P --> A[Application Layer]
    A --> D[Domain Layer]
    A --> I[Intent / Command Interpreter]
    I --> AI[Local AI Runtime]
    I --> V[Schema & Policy Validation]
    V --> X[Action Registry / Execution Runtime]
    X --> D
    D --> R[Repository Interfaces]
    R --> DB[(SQLite)]
    A --> OS[Platform Services]
    OS --> N[Native Notifications]
    OS --> S[Speech APIs - later phase]
    AI --> M[Local Model Files]
    A --> L[Execution Logs]
```

## 4. Component responsibilities

### 4.1 Presentation layer

-   Menampilkan task, project, calendar (agenda view), notes, chat, settings.
-   Mengumpulkan input dan menampilkan validation/confirmation state.
-   Tidak berisi aturan bisnis inti; murni memanggil Tauri IPC command.
-   Windows Desktop (MVP v0.1): React + TypeScript melalui Tauri 2.
-   iOS (Fase 2): SwiftUI native.

### 4.2 Application layer

-   Mengorkestrasi use case: CreateTask, UpdateTask, ScheduleReminder,
    SearchNotes, dan sebagainya.
-   Menjalankan validasi aplikasi.
-   Mengelola transaction boundary.
-   Memanggil repository dan platform adapter.
-   Mengembalikan hasil terstruktur ke UI.

### 4.3 Domain layer

-   Entity dan value object: Task, Project, CalendarEvent, Reminder,
    Note.
-   Aturan bisnis dan invariants.
-   Tidak mengetahui SQLite, React, SwiftUI, atau model AI.
-   Memiliki interface untuk repository dan domain service.

### 4.4 Intent / command interpreter

Tahapan yang disarankan: 1. Normalisasi input. 2. Coba deterministic
parser untuk pola sederhana. 3. Jika tidak cukup, minta local AI runtime
mengusulkan intent dan parameter. 4. Validasi output terhadap schema. 5.
Periksa permission dan kelengkapan parameter. 6. Minta
klarifikasi/konfirmasi bila dibutuhkan. 7. Kirim command valid ke
application use case.

### 4.5 Local AI runtime

-   Adapter untuk runtime model lokal.
-   Kandidat awal: llama.cpp.
-   Kandidat model: Qwen3 1.7B quantized sebagai baseline benchmark,
    bukan keputusan final.
-   AI dipanggil hanya ketika diperlukan.
-   Model tidak diberi akses langsung ke SQLite, arbitrary shell, atau
    filesystem.
-   Runtime harus dapat gagal secara terkontrol tanpa mematikan fungsi
    CRUD.

### 4.6 Action registry and execution runtime

Setiap action mendefinisikan: - `name` dan `version` - input schema -
permission level - validasi - application handler - apakah membutuhkan
confirmation - output schema

Contoh permission level: - `read`: membaca data lokal. - `write`:
membuat atau memperbarui data. - `destructive`: menghapus atau melakukan
perubahan sulit dibatalkan. - `external`: memengaruhi sistem/layanan di
luar perangkat.

MVP tidak menyediakan arbitrary command execution.

### 4.7 Infrastructure

-   SQLite database dan migrations.
-   File/model storage lokal.
-   Native notification adapter.
-   Logging dan diagnostics.
-   Backup/export adapter (perlu diputuskan detailnya).

## 5. Deployment architecture

### 5.1 Windows Desktop --- authoritative stack (MVP v0.1)

  -----------------------------------------------------------------------
  Layer                   Technology              Notes
  ----------------------- ----------------------- -----------------------
  Desktop shell           Tauri 2                 Native desktop shell

  UI                      React + TypeScript      Presentation and view
                                                  state (thin client)

  Host/backend            Rust                    Authoritative domain,
                                                  application boundary,
                                                  Tauri IPC commands

  Database                SQLite (via rusqlite)   Bundled SQLite with
                                                  FTS5 enabled from Day 1

  Data access             rusqlite + manual SQL   Deterministic versioned
                          migrations              migrations; Rust is sole
                                                  owner of DB

  AI runtime              Adapter pattern         Deterministic rule
                                                  parser first; local
                                                  llama.cpp runtime
                                                  pluggable later

  Notifications           Windows native          OS-specific
                          notification APIs via   
                          adapter                 
  -----------------------------------------------------------------------

**Keputusan Arsitektur Persistensi:** Otoritas database sepenuhnya berada
pada host Rust menggunakan `rusqlite`. Frontend TypeScript/React tidak
berinteraksi langsung dengan berkas SQLite dan tidak menggunakan ORM terpisah
(seperti Drizzle). Semua interaksi data melewati Tauri commands terstruktur
dan terikat pada transaksi SQLite di sisi Rust.

### 5.2 iOS --- proposed stack (Roadmap Fase 2)

  -----------------------------------------------------------------------
  Layer                   Proposed technology     Notes
  ----------------------- ----------------------- -----------------------
  UI                      SwiftUI                 Native iOS

  Application/domain      Swift modules           Keep use cases and
                                                  domain rules isolated

  Database                SQLite                  Independent local DB

  Notifications           UserNotifications       Local scheduled
                          framework               notifications

  Speech                  Native Speech APIs or   Later phase; test
                          local STT               privacy/offline
                                                  behavior

  AI runtime              Adapter abstraction     Runtime/model
                                                  feasibility must be
                                                  benchmarked on target
                                                  devices
  -----------------------------------------------------------------------

### 5.3 Cross-platform consistency

-   Define command/entity schemas in `packages/contracts` and/or
    versioned JSON Schema files.
-   Keep canonical enums, validation rules, timestamp semantics, and
    sample payloads in shared specs.
-   Maintain contract tests on both platforms.
-   Do not assume the Windows TypeScript runtime can be shared directly
    with native iOS.
-   A shared Rust domain library may be evaluated later if it materially
    reduces duplicated logic without complicating iOS integration.

## 6. Suggested repository structure

``` text
maven/
├── apps/
│   ├── desktop/
│   │   ├── src/                  # React + TypeScript
│   │   └── src-tauri/            # Rust host
│   └── ios/
│       └── Maven/
│           ├── App/
│           ├── Features/
│           ├── Domain/
│           ├── Application/
│           ├── Infrastructure/
│           └── Persistence/
├── packages/
│   └── contracts/
│       ├── commands/
│       ├── entities/
│       ├── schemas/
│       └── examples/
├── specs/
│   ├── PRD.md
│   ├── SRS.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── ADR/
├── scripts/
└── README.md
```

## 7. Key runtime flows

### 7.1 Deterministic task creation

``` mermaid
sequenceDiagram
    actor User
    participant UI
    participant App as Application
    participant Parser
    participant Domain
    participant Repo
    participant DB as SQLite

    User->>UI: "Create task ..."
    UI->>App: Submit text
    App->>Parser: Parse simple command
    Parser-->>App: CreateTask command
    App->>Domain: Validate command
    Domain-->>App: Valid
    App->>Repo: Save task
    Repo->>DB: INSERT in transaction
    DB-->>Repo: Success
    Repo-->>App: Saved task
    App-->>UI: Result
    UI-->>User: Confirmation
```

### 7.2 AI-assisted command

``` mermaid
sequenceDiagram
    actor User
    participant UI
    participant App as Application
    participant AI as Local AI
    participant Validator
    participant Policy as Permission Policy
    participant Executor

    User->>UI: Ambiguous/complex instruction
    UI->>App: Submit text
    App->>AI: Request structured intent
    AI-->>App: Proposed intent + parameters
    App->>Validator: Validate schema and fields
    Validator-->>App: Valid / invalid
    App->>Policy: Check permission and confirmation
    Policy-->>App: Clarify / confirm / allow
    App->>Executor: Execute registered action
    Executor-->>App: Result
    App-->>UI: Result and audit summary
```

## 8. Security model

-   Treat user input, retrieved note content, and model output as
    untrusted.
-   Tool allowlist; no model-generated tool names can be executed unless
    registered.
-   Validate types, ranges, identifiers, and ownership before each
    action.
-   Require confirmation for delete and future external actions.
-   Do not expose raw SQL or shell to model context.
-   Keep secrets out of source code and logs.
-   Use OS-protected storage for sensitive settings where available.
-   Consider SQLCipher or platform-level database encryption after
    threat model and licensing review.
-   Provide backup/export and data deletion policy before production
    release.

## 9. Error handling and resilience

-   AI unavailable: fall back to manual UI and deterministic commands.
-   Database failure: rollback transaction and show failure; never show
    false success.
-   Notification permission denied: persist reminder and show permission
    status.
-   Invalid command: reject safely and ask for corrected input.
-   iOS background limitations: rely on scheduled OS notifications
    rather than a persistent process.
-   Model resource pressure: unload model or reduce context/quantization
    according to runtime capability.

## 10. Performance targets to benchmark

  ---------------------------------------------------------------------------------
  Metric                              Initial target Qualification
  --------------------- ---------------------------- ------------------------------
  Local CRUD p95                            \<100 ms Device/database benchmark

  Deterministic command                     \<500 ms Supported simple commands
  p95                                                

  Simple local AI                             \<10 s Model/device dependent
  response                                           

  Idle memory              Target \<150 MB excluding Measure actual app baseline
                                        loaded model 

  Model memory                                   TBD Depends on
                                                     quantization/context/runtime
  ---------------------------------------------------------------------------------

Targets are provisional. Benchmark on the actual Windows reference
device and at least one supported iPhone before making performance
claims.

## 11. Architecture Decision Records (ADR) --- status keputusan

  -----------------------------------------------------------------------
  Decision                Status                  Rationale
  ----------------------- ----------------------- -----------------------
  Product is              Accepted                Fokus pada produktivitas
  productivity-first                              pribadi di MVP

  Local-first data        Accepted                Privasi, offline-first,
                                                  hemat sumber daya

  Windows Desktop first   Accepted                Validasi core engine di
  (MVP v0.1)                                      Windows sebelum porting

  iOS Native (SwiftUI)    Accepted (Fase 2)       Hindari duplikasi logika
                                                  dua kali di awal

  Single-device; no sync  Accepted                Kurangi kompleksitas MVP

  Modular monolith        Accepted                Skala aplikasi desktop
                                                  yang terawat

  SQLite via rusqlite     Accepted                Host Rust pemilik tunggal
                                                  database; zero ORM bloat

  SQLite FTS5 dari awal   Accepted                Pencarian cepat catatan &
                                                  memori tanpa 'LIKE' hack

  Soft delete (deleted_at)Accepted                Proteksi data dari salah
                                                  eksekusi AI / ketik

  AI Adapter + Determin-  Accepted                Performa instan (<2ms)
  istic parser di awal                            dan hemat RAM untuk MVP

  llama.cpp runtime       Candidate (Fase 4)      Diintegrasikan setelah
                                                  core produktivitas stabil

  Push-to-talk voice      Accepted direction      Hindari always-listening
  (post-MVP)                                      demi privasi & baterai
  -----------------------------------------------------------------------

## 12. Delivery phases

1.  **Foundation:** repository, desktop shell, domain contracts, SQLite,
    migrations, UI shell.
2.  **Productivity core:** tasks, projects, notes, calendar, reminders.
3.  **Command intelligence:** deterministic parser, intent schema, tool
    registry, execution policy.
4.  **Local AI:** runtime adapter, model benchmark, context handling,
    retrieval.
5.  **Voice and iOS:** push-to-talk, STT, native iOS app,
    parity/contract tests.

## 13. Development constraints

-   Native iOS build, signing, simulator, and device testing require
    access to macOS/Xcode.
-   iOS background execution is system-controlled.
-   Local model support and performance vary by device; do not promise
    the same model experience on all iPhones.
-   The no-sync decision means Windows and iOS data diverge unless a
    later export/import or sync feature is implemented.
