# Issue Tracker

Track issues, manage tasks, and organize your projects with a fast, cross-platform desktop app. No cloud required—your data stays on your device.

![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Why Issue Tracker?

- **No internet needed** — works completely offline
- **Lightning fast** — built with Rust for native performance
- **Your data, your device** — stored locally in JSON format
- **Markdown support** — write descriptions with code highlighting

## Features

- Create and manage issues with titles, descriptions, and tags
- Track status: Open → In Progress → Closed
- Filter by status or tags
- Sort by creation date or last update
- Full-text search across titles and descriptions
- Import and export your data for backup

## Installation

### 1. Install system dependencies

```bash
# Ubuntu/Debian
sudo apt install pkg-config libglib2.0-dev libgtk-3-dev libwebkit2gtk-4.1-dev

# macOS
xcode-select --install

# Windows
# Install Visual Studio Build Tools
```

### 2. Install and run

```bash
npm install
npm run tauri dev
```

## Usage

### Create your first issue

1. Click **+ New Issue**
2. Add a title and description (Markdown supported)
3. Add tags like `bug`, `feature`, or `urgent`
4. Click **Save**

### Find issues quickly

| What you want | How to do it |
|---------------|--------------|
| Search by keyword | Type in the search bar |
| Filter by status | Use the **Status** dropdown |
| Filter by tag | Use the **Tags** dropdown |
| Sort differently | Choose Created/Updated, then click the arrow |

### Keyboard shortcut

Press `/` anywhere on the list page to jump to the search bar.

### Import and export

Export your data for backup:

1. Click the **☰** menu
2. Select **Export**
3. Choose where to save `issues.json`

Import existing data:

1. Click the **☰** menu
2. Select **Import**
3. Choose your JSON file
4. Pick **Merge** (add to existing) or **Overwrite** (replace all)

## Build from source

### Development

```bash
npm run tauri dev
```

### Production build

```bash
# Build for your current platform
npm run tauri build

# Cross-compile for Windows (from Linux)
npm run tauri build -- --target x86_64-pc-windows-gnu
```

### Run tests

```bash
# All tests
cargo test

# Single test file
cargo test --test models_tests
cargo test --test commands_tests
cargo test --test storage_tests
```

## Where your data is stored

| Platform | Location |
|----------|----------|
| Linux | `~/.local/share/issue-tracker/issues.json` |
| macOS | `~/Library/Application Support/com.issue-tracker/issues.json` |
| Windows | `%LOCALAPPDATA%\issue-tracker\issues.json` |

## Tech stack

| Layer | What we used |
|-------|--------------|
| Desktop framework | Tauri 2.x |
| Backend language | Rust |
| Frontend | Vanilla HTML + CSS + JavaScript |
| Text formatting | marked.js + highlight.js |

## Project layout

```
src/                     # Frontend code
src-tauri/src/           # Rust backend
src-tauri/tests/         # Unit tests (50 tests)
```

## License

MIT
