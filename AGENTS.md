# AGENTS.md - Issue Tracker Development Guide

## Project Overview

This is a Tauri-based desktop Issue Tracker application using vanilla HTML/JS frontend and JSON file storage.

## Tech Stack

- **Backend**: Rust + Tauri 2.x
- **Frontend**: Vanilla HTML + CSS + JavaScript
- **Storage**: JSON file (stored in `~/.local/share/issue-tracker/issues.json`)

## Build Commands

```bash
# Install dependencies
npm install

# Development (with hot reload)
npm run tauri dev

# Build for production
npm run tauri build

# Run a single test (Rust)
cargo test <test_name>

# Check code without building
cargo check

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
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── lib.rs         # Tauri app setup
│   │   ├── models.rs      # Data structures
│   │   ├── storage.rs     # JSON file operations
│   │   └── commands.rs    # Tauri commands (CRUD)
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json
```

## Code Style Guidelines

### Rust

1. **Imports**: Use absolute paths with `crate::` for internal modules
   ```rust
   use crate::models::Issue;
   use crate::storage::Storage;
   ```

2. **Naming Conventions**:
   - Functions/variables: `snake_case`
   - Types/Enums: `PascalCase`
   - Modules: `snake_case`

3. **Types**: Always use explicit types in function signatures

4. **Error Handling**: Use `Result<T, String>` for Tauri commands, propagate errors with `?`

5. **Structs**: Use `#[derive(Serialize, Deserialize, Debug, Clone)]` for data models

6. **Testing**: Use `#[cfg(test)]` module with `#[test]` functions

### JavaScript (Frontend)

1. **Variables**: Use `const` by default, `let` when mutation needed
2. **Functions**: Use arrow functions for callbacks, `async/await` for async operations
3. **Tauri API**: Access via `window.__TAURI__.core.invoke()`
4. **DOM**: Use `document.getElementById()` and `addEventListener()`
5. **Security**: Always escape user input with `escapeHtml()` before rendering

### HTML/CSS

1. **Classes**: Use `kebab-case` for CSS classes
2. **IDs**: Use `camelCase` for JavaScript references
3. **Accessibility**: Include semantic HTML and proper labels

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

## Data Models

```rust
// IssueStatus: Open | InProgress | Closed

// Issue
struct Issue {
    id: String,           // UUID
    title: String,
    description: String,
    status: IssueStatus,
    tags: Vec<String>,
    created_at: DateTime,
    updated_at: DateTime,
}
```

## System Requirements

To build this project, you need:

- **Linux**: `pkg-config`, `libglib2.0-dev`, `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`
- **macOS**: Xcode Command Line Tools
- **Windows**: Visual Studio Build Tools

Install on Ubuntu/Debian:
```bash
sudo apt install pkg-config libglib2.0-dev libgtk-3-dev libwebkit2gtk-4.1-dev
```
