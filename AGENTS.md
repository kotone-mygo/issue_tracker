# AGENTS.md - Issue Tracker Development Guide

## Project Overview

This is a Tauri-based desktop Issue Tracker application using vanilla HTML/JS frontend and JSON file storage.

## Tech Stack

- **Backend**: Rust + Tauri 2.x
- **Frontend**: Vanilla HTML + CSS + JavaScript (no frameworks)
- **Storage**: JSON file (platform-specific paths below)
- **Build**: npm + Cargo

## Build Commands

```bash
# Install dependencies
npm install

# Development (with hot reload)
npm run tauri dev

# Production build
npm run tauri build

# Cross-compile for Windows (from Linux)
rustup target add x86_64-pc-windows-gnu
npm run tauri build -- --target x86_64-pc-windows-gnu
```

### Rust Commands

```bash
# Check code without building
cargo check

# Build the project
cargo build

# Run all tests
cargo test

# Run a single test
cargo test <test_name>

# Format code
cargo fmt

# Lint
cargo clippy
```

## Project Structure

```
issue_tracker/
├── src/                    # Frontend (HTML/CSS/JS)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src-tauri/              # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json    # Tauri 2.x permissions
│   └── src/
│       ├── main.rs         # Entry point
│       ├── lib.rs          # Tauri app setup
│       ├── models.rs      # Data structures
│       ├── storage.rs      # JSON file operations
│       └── commands.rs     # Tauri commands (CRUD)
└── package.json
```

## Code Style Guidelines

### Rust

1. **Imports**: Use absolute paths with `crate::`
   ```rust
   use crate::models::{AppData, Issue, IssueStatus};
   use crate::storage::Storage;
   ```

2. **Naming Conventions**:
   - Functions/variables: `snake_case`
   - Types/Enums: `PascalCase`
   - Modules: `snake_case`

3. **Types**: Always use explicit types in function signatures

4. **Error Handling**: 
   - Tauri commands: `Result<T, String>` with `?` propagation
   - Mutex locks: `.map_err(|e| e.to_string())?`
   - Storage: `.map_err(|e| format!("message: {}", e))?`

5. **Structs**: Use `#[derive(Serialize, Deserialize, Debug, Clone)]` for data models
   - Add `PartialEq` if needed for comparisons
   - Add `Default` for structs with defaults

6. **Testing**: Use `#[cfg(test)]` module with `#[test]` functions
   ```rust
   #[cfg(test)]
   mod tests {
       use super::*;

       #[test]
       fn test_issue_creation() {
           let issue = Issue::new("Title".into(), "Desc".into(), vec![]);
           assert!(!issue.id.is_empty());
       }
   }
   ```

### JavaScript (Frontend)

1. **Variables**: `const` by default, `let` when mutation needed
2. **Functions**: Arrow functions for callbacks, `async/await` for async operations
3. **Tauri API**: `const { invoke } = window.__TAURI__.core`
4. **DOM**: `document.getElementById()` and `addEventListener()`
5. **Security**: Always escape user input with `escapeHtml()` before rendering

### HTML/CSS

1. **Classes**: `kebab-case` for CSS classes
2. **IDs**: `camelCase` for JavaScript references
3. **Accessibility**: Semantic HTML and proper labels

## Tauri 2.x Specifics

### Adding a New Plugin

1. Add dependency to `src-tauri/Cargo.toml`:
   ```toml
   tauri-plugin-example = "2"
   ```

2. Initialize in `src-tauri/src/lib.rs`:
   ```rust
   .plugin(tauri_plugin_example::init())
   ```

3. Add permissions to `src-tauri/capabilities/default.json`:
   ```json
   "permissions": [
     "core:default",
     "example:default"
   ]
   ```

### State Management

```rust
pub struct AppState {
    pub storage: Storage,
    pub data: Mutex<AppData>,
}

impl AppState {
    pub fn new() -> Self {
        let storage = Storage::new();
        let data = storage.load();
        Self {
            storage,
            data: Mutex::new(data),
        }
    }
}
```

Register state in `lib.rs`:
```rust
.manage(AppState::new())
```

Access in commands:
```rust
pub fn get_issues(state: State<AppState>) -> Result<Vec<Issue>, String> {
    let data = state.data.lock().map_err(|e| e.to_string())?;
    Ok(data.issues.clone())
}
```

## Available Tauri Commands

| Command | Parameters | Description |
|---------|------------|-------------|
| `get_issues` | - | Get all issues |
| `get_issue` | `id: String` | Get single issue |
| `create_issue` | `request: CreateIssueRequest` | Create new issue |
| `update_issue` | `request: UpdateIssueRequest` | Update issue |
| `delete_issue` | `id: String` | Delete issue |
| `add_tag` | `issue_id, tag` | Add tag to issue |
| `remove_tag` | `issue_id, tag` | Remove tag from issue |
| `filter_by_tag` | `tag: String` | Filter issues by tag |
| `filter_by_status` | `status: IssueStatus` | Filter by status |
| `get_all_tags` | - | Get all unique tags |
| `import_issues` | `issues, merge` | Import JSON (merge/overwrite) |

## Data Models

```rust
// IssueStatus: Open | InProgress | Closed

// Issue
struct Issue {
    id: String,              // UUID v4
    title: String,
    description: String,
    status: IssueStatus,
    tags: Vec<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
```

## Import/Export Behavior

- **Merge mode**: Adds all imported issues; if ID conflicts exist, generates new UUIDs
- **Overwrite mode**: Replaces all existing data with imported data, preserves original IDs

## Keyboard Shortcuts & UI Behaviors

- `/` - Focus search input
- 3-line menu (hamburger): Click outside to close
- New Issue Modal: Only closes via X button or form submission
- Issues sorted by `created_at` descending (newest first)

## System Requirements

- **Linux**: `pkg-config`, `libglib2.0-dev`, `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`
- **macOS**: Xcode Command Line Tools
- **Windows**: Visual Studio Build Tools

Install on Ubuntu/Debian:
```bash
sudo apt install pkg-config libglib2.0-dev libgtk-3-dev libwebkit2gtk-4.1-dev
```

## Data Storage Locations

- **Linux**: `~/.local/share/issue-tracker/issues.json`
- **Windows**: `%LOCALAPPDATA%\issue-tracker\issues.json`
- **macOS**: `~/Library/Application Support/com.issue-tracker/issues.json`
