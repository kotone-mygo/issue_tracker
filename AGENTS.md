# AGENTS.md - Issue Tracker

## Build & Test
```bash
npm install          # one-time setup
npm run tauri dev    # dev with hot reload (run from repo root)
npm run tauri build  # production build

cd src-tauri && cargo test                # all tests
cd src-tauri && cargo test --test models_tests
cd src-tauri && cargo test --test commands_tests
cd src-tauri && cargo test --test storage_tests
```

## Architecture
- **Frontend**: Vanilla HTML/CSS/JS in `src/` — no build step, `frontendDist: "../src"` in `tauri.conf.json`
- **Tauri**: `withGlobalTauri: true` → use `window.__TAURI__.core.invoke()`, not npm packages
- **Rust entry**: `src-tauri/src/lib.rs` → `commands`, `models`, `storage` modules
- **Lib name**: `issue_tracker_lib` (not `issue_tracker`) — Cargo.toml `[lib]` section, avoids Windows conflict
- **State**: `commands::AppState` wraps `Mutex<AppData>` + `Storage`, initialized in `lib.rs::run()`

## Testing
- `mod common;` pattern with fixtures in `tests/common/fixtures.rs`
- Storage tests use `Storage::with_path(temp_path)` to avoid real data

## Storage
- JSON via `dirs` crate → `~/.local/share/issue-tracker/issues.json` on Linux

## Conventions
- **No custom lint/format config** — uses Rust defaults
- Plugins: `tauri-plugin-opener`, `tauri-plugin-dialog`, `tauri-plugin-fs`