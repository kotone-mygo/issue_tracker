# Issue Tracker

A cross-platform desktop application for tracking issues, built with Tauri (Rust + Vanilla HTML/JS).

## Features

- Create, read, update, and delete issues
- Tag-based categorization
- Filter by status or tags
- Search issues by title or description
- Markdown support for issue descriptions
- Syntax highlighting for code blocks
- Back to top button
- Keyboard shortcut (`/` to focus search)

## Tech Stack

- **Backend**: Rust + Tauri 2.x
- **Frontend**: Vanilla HTML + CSS + JavaScript
- **Storage**: JSON file

## Development

### Prerequisites

- **Linux**: `pkg-config`, `libglib2.0-dev`, `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run tauri dev
```

### Build

```bash
# Build for current platform
npm run tauri build

# Build for Windows (Linux with mingw-w64)
npm run tauri build -- --target x86_64-pc-windows-gnu
```

## Output

Build artifacts will be in:

- **Linux**: `src-tauri/target/release/issue-tracker`
- **Windows**: `src-tauri/target/x86_64-pc-windows-gnu/release/issue-tracker.exe`

## Data Storage

Issues are stored in JSON format at:

- **Linux**: `~/.local/share/issue-tracker/issues.json`
- **Windows**: `%LOCALAPPDATA%\issue-tracker\issues.json`

## Keyboard Shortcuts

| Shortcut     | Action                            |
| ------------ | --------------------------------- |
| `/`          | Focus search input (on list page) |
| `↑` (scroll) | Show back to top button           |

## License

MIT
