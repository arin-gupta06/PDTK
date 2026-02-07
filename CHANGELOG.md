# Changelog

All notable changes to PDTK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Daily] - 2026-02-07

### Done
- Ran `pdtk linkedin capture`, confirmed Chrome extension payload posts successfully (sync toast + listener OK)
- Synced LinkedIn profile details for Arin Gupta into local config (about, projects, skills)
- Noted cleanup needed: captured projects include verbose/duplicate entries to prune later

---

## [Daily] - 2026-02-08

### Added
- VS Code snapshot link: on-demand command to send active editor content/cursor to PDTK via `/pdtk/editor/snapshot`
- Ignore-glob handling with feedback for skipped files
- Extension debug config (`.vscode/launch.json`) to run only the PDTK link during F5

### Fixed
- Removed redundant activation event warning for the VS Code link package

---

## [0.1.1] - 2026-02-04

### Added
- **GitHub API Integration** — Fetch repositories and profile details via Personal Access Token
- **LinkedIn OAuth Sync** — Complete OAuth 2.0 flow to link LinkedIn identities
- **LinkedIn Details** — Show LinkedIn profile information and user summary
- **Enhanced Verification** — Unified `pdtk verify` command for multi-platform status

---

## [0.1.0] - 2026-02-02

### Added
- **Initial project setup** — Node.js CLI tool structure
- **CLI entry point** (`bin/pdtk.js`) — Command parser with colored output
- **Identity module** (`core/identity.js`) — GitHub identity detection via `git config`
- **Config module** (`core/config.js`) — Local configuration management
- **Commands implemented**:
  - `pdtk` — Existence confirmation
  - `pdtk verify` / `pdtk status` — GitHub identity verification
  - `pdtk help` — Command reference
  - `pdtk --version` — Version display

### Security
- Git identity read at runtime only (never stored in code)
- SSH key existence checked only (contents never read)
- Local config file excluded via `.gitignore`

### Documentation
- `README.md` — Installation and usage guide
- `CHANGELOG.md` — Version history (this file)

---

## [Unreleased]

### Planned for v1.0.0
- `pdtk push` — Push code to GitHub
- `pdtk deploy` — Deploy to configured platform
- `pdtk brainstorm` — Structured second opinion on ideas
- GitHub repo count in verify command
