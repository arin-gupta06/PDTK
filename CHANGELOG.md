# Changelog

All notable changes to PDTK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
