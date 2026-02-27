# Changelog

All notable changes to PDTK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-02-27

### Added
- **Brainstorm Terminal** — Interactive AI-assisted ideation environment (`pdtk brainstorm`)
- **Ollama Integration** — Local LLM support via Ollama API (`core/brainstorm-ai.js`)
- **Second Option Logic** — Every brainstorm generates two distinct paths (Primary + Secondary)
- **Anti-Overthinking Mechanism** — Depth warnings at 2 expansions, hard block at 4 until decision
- **Session Persistence** — Sessions auto-saved as JSON in `config/brainstorm-sessions/`
- **Session Management** — `brainstorm list`, `brainstorm load <id>`, `brainstorm export`, `brainstorm import`
- **Structured Reports** — `/report` generates full session summary with action items and next-focus
- **Interactive REPL** — 14 slash commands: `/brainstorm`, `/expand`, `/refine`, `/compare`, `/option`, `/pivot`, `/summary`, `/report`, `/export`, `/import`, `/clear`, `/help`, `/exit`
- **Setup Flow** — `pdtk brainstorm setup` configures Ollama model with connection verification
- **COMMANDS.md** — Full command reference documentation

### New Files
- `core/brainstorm.js` — REPL engine, terminal renderers, command handlers
- `core/brainstorm-ai.js` — Ollama API caller, structured system prompts for all command types
- `core/brainstorm-session.js` — Session CRUD, interaction tracking, report generation, import/export

### Changed
- `core/config.js` — Added `saveBrainstormConfig()` and `getBrainstormConfig()` for Ollama model storage
- `bin/pdtk.js` — Added brainstorm command routing (6 subcommands) and updated help text

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
- `pdtk linkedin post` — Post content to LinkedIn
- Dedicated brainstorm terminal window (separate from main PDTK terminal)
- GitHub repo count in verify command
