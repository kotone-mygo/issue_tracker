<!-- prettier-ignore -->
<div align="center">

<img src="src-tauri/icons/128x128.png" alt="Issue Tracker" height="128" />

# Issue Tracker

[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-blue)](https://github.com/anomalyco/issue_tracker)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-3288e6)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-2021-orange)](https://www.rust-lang.org)

[Features](#features) • [Quick Start](#quick-start) • [Usage](#usage) • [Development](#development) • [Testing](#testing)

</div>

A lightweight, offline-first desktop application for issue tracking. Built with Rust and Tauri for native performance — your data stays on your device, stored locally in JSON format.

## Features

- **Native performance** — Rust backend with Tauri 2.x for speed and small bundle size
- **Issue management** — create, update, and track issues with titles, descriptions, and tags
- **Status workflow** — Open → In Progress → Closed
- **Smart filtering** — filter by status, tags, or full-text search across titles and descriptions
- **Issue references** — use `#123` in descriptions to link related issues, with click-to-navigate and hover preview
- **Multi-level navigation** — "Previous Issue" button appears when navigating via references
- **Import & Export** — backup and restore your data in JSON format
- **Markdown support** — write descriptions with code highlighting via marked.js and highlight.js
- **Theme toggle** — switch between dark and light themes

## Quick Start

### Prerequisites

**System dependencies:**

```bash
# Ubuntu/Debian
sudo apt install pkg-config libglib2.0-dev libgtk-3-dev libwebkit2gtk-4.1-dev

# macOS
xcode-select --install

# Windows
# Install Visual Studio Build Tools with C++ support
```

**Runtime:**

- [Node.js](https://nodejs.org) LTS
- [Rust](https://www.rust-lang.org) (latest stable)

### Development

```bash
npm install
npm run tauri dev
```

The app will launch with hot reload enabled.

> [!TIP]
> Press `/` anywhere on the list page to jump to the search bar.

## Usage

### Create an issue

1. Click **+ New Issue**
2. Add a title and description (Markdown supported)
3. Add tags like `bug`, `feature`, or `urgent`
4. Click **Save**

### Find issues quickly

| What you want | How to do it |
|---------------|---------------|
| Search by keyword | Type in the search bar |
| Filter by status | Use the **Status** dropdown |
| Filter by tag | Use the **Tags** dropdown |
| Sort differently | Choose Created/Updated, then click the arrow |

### Issue references

Link related issues using `#` followed by the issue number:

- Type `#123` in any description to create a reference
- Click `#123` links to jump to the referenced issue
- Hover over `#123` links to preview the issue title and status
- Use the **Previous Issue** button to navigate back through reference chains

### Import and export

**Export:**
1. Click the **☰** menu
2. Select **Export**
3. Choose where to save `issues.json`

**Import:**
1. Click the **☰** menu
2. Select **Import**
3. Choose your JSON file
4. Pick **Merge** (add to existing) or **Overwrite** (replace all)

## Development

### Production build

```bash
npm run tauri build
```

### Cross-compile

```bash
# From Linux to Windows
npm run tauri build -- --target x86_64-pc-windows-gnu
```

### Tech Stack

| Layer | Technology |
|-------|-------------|
| Desktop framework | [Tauri 2.x](https://tauri.app) |
| Backend | Rust (edition 2021) |
| Frontend | Vanilla HTML + CSS + JavaScript |
| Text rendering | [marked.js](https://marked.js.org) + [highlight.js](https://highlightjs.org) |
| Storage | JSON via [`dirs`](https://crates.io/crates/dirs) crate |

### Project Structure

```
src/                     # Frontend (Vanilla JS, no build step)
src-tauri/
  ├── src/
  │   ├── lib.rs         # Entry point, state management
  │   ├── commands.rs    # Tauri commands (invoke handlers)
  │   ├── models.rs     # Data structures (Issue, AppData)
  │   └── storage.rs    # JSON persistence layer
  └── tests/
      ├── common/        # Shared test fixtures
      ├── models_tests.rs
      ├── commands_tests.rs
      └── storage_tests.rs
```

### Architecture Notes

- **Library name**: `issue_tracker_lib` (not `issue_tracker`) — see `src-tauri/Cargo.toml` `[lib]` section
- **Frontend access**: `withGlobalTauri: true` in `tauri.conf.json` → use `window.__TAURI__.core`, not npm packages
- **State management**: `commands::AppState` wraps `Mutex<AppData>` + `Storage`, initialized in `lib.rs`
- **Frontend entry**: `frontendDist: "../src"` — no build step, vanilla HTML/CSS/JS

## Testing

Run all tests from the `src-tauri` directory:

```bash
cd src-tauri && cargo test
```

Run specific test files:

```bash
cargo test --test models_tests
cargo test --test commands_tests
cargo test --test storage_tests
```

> [!NOTE]
> Tests use temporary paths via `Storage::with_path(temp_path)` to avoid touching real data. Test fixtures are shared via `tests/common/fixtures.rs`.

## Data Storage

Your data is stored locally in JSON format:

| Platform | Location |
|----------|-----------|
| Linux | `~/.local/share/issue-tracker/issues.json` |
| macOS | `~/Library/Application Support/com.issue-tracker/issues.json` |
| Windows | `%LOCALAPPDATA%\issue-tracker\issues.json` |
