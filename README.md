<!-- markdownlint-disable MD013 -->

# Issue Tracker

A cross-platform desktop application for tracking issues, built with Tauri (Rust + Vanilla HTML/JS).

## Features

- Create, read, update, and delete issues
- Tag-based categorization
- Filter by status or tags
- Sort issues by created date or updated date
- Toggle sort direction (newest/oldest)
- Search issues by title or description
- Markdown support for issue descriptions
- Syntax highlighting for code blocks
- Import and Export issues (JSON format)
- Back to top button
- Keyboard shortcut (`/` to focus search)

## Tech Stack

- **Backend**: Rust + Tauri 2.x
- **Frontend**: Vanilla HTML + CSS + JavaScript
- **Storage**: JSON file

## Development

### Prerequisites

- **Linux**: `pkg-config`, `libglib2.0-dev`, `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`
- **macOS**: Xcode Command Line Tools
- **Windows**: Visual Studio Build Tools

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

## Usage

### Main Page

- Click **+ New Issue** to create a new issue
- Click **☰** menu button to access Import/Export options
- Use search bar to find issues by title or description
- Filter issues by status or tags
- Sort issues by **Created** or **Updated** date
- Click **direction button** (↓ Newest / ↑ Oldest) to toggle sort order
- Click **×** in search bar to clear search

### Issue Detail Page

- View full issue details with rendered Markdown
- Edit issue (title, description, status, tags)
- Delete issue (with confirmation)
- Status can only be changed in detail page

## Keyboard Shortcuts

| Shortcut     | Action                            |
| ------------ | --------------------------------- |
| `/`          | Focus search input (on list page) |
| `↑` (scroll) | Show back to top button           |

## Import / Export

### Export

1. Click **☰** menu button
2. Click **Export**
3. Choose save location
4. Issues are exported as `issues.json` with full data (ID, timestamps, etc.)

### Import

1. Click **☰** menu button
2. Click **Import**
3. Select a JSON file
4. Choose:
   - **Merge**: Add to existing issues (conflicting IDs get new UUIDs)
   - **Overwrite**: Replace all existing issues with imported data

## License

MIT

<!-- markdownlint-enable MD013 -->
