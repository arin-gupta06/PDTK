# PDTK — Personal Development ToolKit

> **A finished, boring tool beats a brilliant unfinished one.**

PDTK is a CLI tool designed to **save time and reduce cognitive load** during daily development work. It executes only developer-approved actions with deterministic, whitelisted commands.

---

## 🎯 Philosophy

| Principle | Description |
|-----------|-------------|
| **Human-in-control** | PDTK never makes final decisions — it executes only approved actions |
| **Deterministic execution** | No AI-generated shell commands; all commands are predefined |
| **Finishability over flexibility** | Features are fixed per version — no scope creep |
| **CLI-first** | No UI, no Electron, no background services |

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/githubarin-art/PDTK.git
cd PDTK

# Install globally
npm link
```

---

## 🚀 Usage

```bash
# Confirm PDTK is active
pdtk

# Verify GitHub identity configuration
pdtk verify

# Show available commands
pdtk help
```

---

## 📋 Commands

### v1.0 (Current)

| Command | Description |
|---------|-------------|
| `pdtk` | Confirm PDTK exists and is active |
| `pdtk verify` | Check GitHub and LinkedIn sync status |
| `pdtk status` | Alias for `verify` |
| `pdtk github sync` | Link GitHub via Personal Access Token |
| `pdtk github details`| Show GitHub profile, repos, and activity |
| `pdtk linkedin sync` | Link LinkedIn via OAuth flow |
| `pdtk linkedin details`| Show LinkedIn profile and about section |
| `pdtk help` | Show available commands |

### v1.0 (Upcoming)

| Command | Description |
|---------|-------------|
| `pdtk linkedin post` | Post shared content to LinkedIn |
| `pdtk push` | Push code to GitHub |
| `pdtk deploy` | Deploy to configured platform |
| `pdtk brainstorm` | Get a structured second opinion on an idea |

---

## 🏗️ Architecture

```
pdtk/
├── bin/
│   └── pdtk.js          # CLI entry point
├── core/
│   ├── config.js        # Configuration management
│   ├── identity.js      # GitHub identity detection
│   ├── github-api.js    # GitHub API interactions (NEW)
│   └── linkedin.js      # LinkedIn OAuth & API (NEW)
├── config/
│   └── pdtk.config.json # Local config (gitignored)
├── package.json
├── CHANGELOG.md
└── README.md
```

### Execution Flow

```
User Command → CLI Parser → Action Router → Whitelisted Executor → Output
```

---

## 🔒 Security

- **No secrets in code** — Credentials are read at runtime, never stored
- **SSH key protection** — Only checks file existence, never reads contents
- **Config excluded** — Local config files are gitignored
- **Whitelisted execution only** — No arbitrary command execution

---

## 📌 Version Roadmap

| Version | Focus | Status |
|---------|-------|--------|
| v0.1.0 | Initial setup + GitHub identity verification | ✅ Complete |
| v1.0.0 | Push, Deploy, Brainstorm commands | 🔜 In Progress |

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (LTS)
- **Execution**: OS shell via Node.js child_process
- **Dependencies**: None (uses only Node.js built-ins)
- **External CLIs**: `git`, deployment CLI (e.g., `vercel`)

---

## 📄 License

MIT

---

## 🤝 Contributing

PDTK v1.0 is focused on **finishability**. Feature requests are welcome but will be deferred to post-v1.0 if they expand scope.

---

> **PDTK exists to help you ship work — not to become work itself.**
