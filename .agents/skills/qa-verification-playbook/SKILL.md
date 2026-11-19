---
name: qa-verification-playbook
description: Standard operating procedure for QA verification in MAVEN monorepo. Use whenever testing, typechecking, or auditing builds before reporting to PM.
---

# QA Verification Playbook

Standard verification gates for the MAVEN monorepo.

## 1. Mandatory Verification Sequence
Run from `d:\MAVEN` after code or schema changes:

1. **TypeScript Typecheck:**
   ```powershell
   npm run typecheck
   ```
   - `@maven/contracts` and `@maven/desktop`: 0 errors and zero unused locals (`noUnusedLocals: true`).

2. **Production Bundle Build:**
   ```powershell
   npm run build
   ```
   - Builds `@maven/contracts` (`packages/contracts/dist/`) and `@maven/desktop` Vite bundle (`apps/desktop/dist/`) with exit code `0`.

3. **Rust Host Check & Unit Tests:**
   ```powershell
   npm run rust:check
   npm run rust:test
   ```
   - **Never silently skip.** If Cargo fails on Windows because `link.exe` / Visual Studio C++ Build Tools is missing, explicitly report `BLOCKED: Rust check/test requires Visual Studio C++ Build Tools (link.exe)`.

## 2. 3-Way Contract & Asset Audit
- Verify field parity across `packages/contracts/src/` ↔ `packages/migrations/sql/` ↔ `apps/desktop/src-tauri/src/commands/` and `apps/desktop/src/lib/ipc.ts`.
- Verify every `#[tauri::command]` is registered in `tauri::generate_handler![]` (`src-tauri/src/lib.rs`) and JS `invoke()` parameter names match Tauri 2's camelCase rules.
- Verify all icon paths in `apps/desktop/src-tauri/tauri.conf.json` exist and are non-empty under `apps/desktop/src-tauri/icons/`.

## 3. UI & Design Compliance
- Verify UI components follow `.agents/skills/atlassian-design-system/SKILL.md` tokens with no generic AI styling regressions (no neon glows, purple gradients, or `rounded-full` / `rounded-2xl` buttons/cards).
