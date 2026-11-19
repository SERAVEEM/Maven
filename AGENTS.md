# MAVEN Agent Operating Rules

Global **Ponytail (`full`)** protocol is active on every task—reuse existing code, favor native platform features, avoid speculative abstractions, and deliver the shortest working diff.

## Orchestrator & Subagent Boundaries

- **Orchestrator (default):** Execute directly via plan-and-execute for small edits or tightly coupled cross-layer changes (e.g., contracts + Rust IPC + UI).
- **Subagents (`frontend_engineer`, `backend_engineer`, `qa_engineer`):** Delegate only when work cleanly separates by domain or benefits from parallel isolation, using concise briefs with explicit verification criteria.

## Domain Ownership

| Domain | Scope | Primary Stack |
|---|---|---|
| **Frontend** | `apps/desktop/src/` | React 19, TypeScript (`noUnusedLocals`), Tailwind CSS v4, Lucide React |
| **Backend** | `apps/desktop/src-tauri/`, `packages/migrations/` | Rust (Tauri 2), `rusqlite` SQLite (WAL, FTS5), Windows OS integration |
| **Contracts** | `packages/contracts/` | Shared TypeScript entities and command DTOs |
| **QA** | Monorepo-wide verification | `npm run typecheck`, `npm run build`, `npm run rust:check`, `npm run rust:test` |

## Core Engineering Invariants

1. **Single Database Owner:** Rust (`rusqlite`) owns the local SQLite database exclusively. React is a presentation layer using `apps/desktop/src/lib/ipc.ts` (Tauri `invoke()` in desktop runtime; `MockIpcProvider` in browser dev only).
2. **3-Way Contract Sync:** Any entity or payload change must update `packages/contracts/src/`, `packages/migrations/sql/`, and `apps/desktop/src-tauri/src/commands/` together.
3. **Append-Only Migrations:** Never edit a previously applied migration. Add `NNNN_<name>.sql` under `packages/migrations/sql/` and register it in order in `apps/desktop/src-tauri/src/db/migration.rs`.
4. **Local-First Data Safety:** Enforce soft delete (`deleted_at`) on `tasks` and `notes` by default (`WHERE deleted_at IS NULL`). Disk DB open/migration failures must fail fast—never silently fall back to an in-memory DB in production.
5. **AI As Interpreter Only:** Run the deterministic rule parser first (`<2ms`, 0 RAM). Local AI or fallback interpreters emit validated structured `CommandIntent` payloads—never raw SQL or unvalidated actions.
6. **Git & PR Workflow (Repository-Scoped):** Autonomous `git add`, `git commit`, and `git push` operations are strictly confined to this repository (`MAVEN`). Never push directly to `main` or `Stage`. After every push on a working/feature branch, open or link a Pull Request targeting `Stage` so the user can review and QA before merging to `main`.

## Workspace Skills

Read the relevant skill before modifying its domain:
- UI & styling: `.agents/skills/atlassian-design-system/SKILL.md`
- Rust & SQLite: `.agents/skills/rust-sqlite-architecture/SKILL.md`
- Verification & QA: `.agents/skills/qa-verification-playbook/SKILL.md`
