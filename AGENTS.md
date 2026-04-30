# AGENTS.md - Issue Tracker

## Build & Test
```bash
npm install && npm run tauri dev    # dev with hot reload
npm run tauri build                 # production build

cd src-tauri && cargo test          # all tests (must run from src-tauri/)
cargo test --test models_tests      # specific test file
cargo test --test commands_tests
cargo test --test storage_tests
```

## Key Quirks
- **Frontend**: Vanilla HTML/CSS/JS, no build step — `frontendDist: "../src"` in `tauri.conf.json`
- **Tauri access**: `withGlobalTauri: true` → use `window.__TAURI__.core`, not npm packages
- **Lib name**: `issue_tracker_lib` (not `issue_tracker`) — see `src-tauri/Cargo.toml` `[lib]` section
- **State**: `commands::AppState` wraps `Mutex<AppData>` + `Storage`, initialized in `lib.rs`
- **Tests**: `mod common;` pattern with fixtures in `tests/common/fixtures.rs`; storage tests use `Storage::with_path(temp_path)` to avoid real data
- **Storage**: JSON via `dirs` crate → `~/.local/share/issue-tracker/issues.json` on Linux
- **No custom lint/format config** — uses Rust defaults