# AGENTS.md - Issue Tracker

## Build
```bash
npm install
npm run tauri dev      # dev with hot reload
npm run tauri build   # production
```

## Test
```bash
cargo test                              # all tests
cargo test --test models_tests       # specific file
cargo test --test commands_tests
cargo test --test storage_tests
```

## Structure
```
src/                    # Frontend (HTML/CSS/JS)
src-tauri/src/          # Rust backend
src-tauri/tests/        # Integration tests
```

## Stack
- **Backend**: Rust + Tauri 2.x
- **Frontend**: Vanilla HTML/CSS/JS
- **Plugins**: tauri-plugin-opener, tauri-plugin-dialog, tauri-plugin-fs
- **MD**: marked.js, highlight.js
- **Storage**: JSON (platform-specific)

## System deps
- **Linux**: `pkg-config libglib2.0-dev libgtk-3-dev libwebkit2gtk-4.1-dev`
- **macOS**: Xcode CLT
- **Windows**: VS Build Tools

## Data locations
- **Linux**: `~/.local/share/issue-tracker/issues.json`
- **Windows**: `%LOCALAPPDATA%\issue-tracker\issues.json`
- **macOS**: `~/Library/Application Support/com.issue-tracker/issues.json`

## Available Commands
| Command | Description |
|---------|-------------|
| get_issues / get_issue | List/get |
| create_issue / update_issue / delete_issue | CRUD |
| add_tag / remove_tag | Tag management |
| filter_by_tag / filter_by_status | Filter |
| get_all_tags | List tags |
| import_issues | Import (merge/overwrite) |