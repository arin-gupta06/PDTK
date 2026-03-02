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
| `pdtk linkedin capture` | Listen for and capture data from the Chrome Extension |
| `pdtk linkedin capture` + VS Code | Also exposes a local `/pdtk/editor/snapshot` endpoint for the VS Code snapshot command |
| `pdtk brainstorm` | Launch interactive AI brainstorm terminal (Ollama) |
| `pdtk brainstorm setup` | Configure Ollama model for brainstorming |
| `pdtk brainstorm list` | List all saved brainstorm sessions |
| `pdtk brainstorm load <id>` | Resume a saved brainstorm session |
| `pdtk brainstorm export <id>` | Export a session to JSON file |
| `pdtk brainstorm import <file>` | Import a session from JSON file |

### 🧩 LinkedIn Sync Extension

If the automatic sync fails due to bot detection, you can use the built-in Chrome Extension:

1. **Load Extension**:
   - Open Chrome and go to `chrome://extensions/`.
   - Enable **Developer Mode** (top-right).
   - Click **Load unpacked** and select the `pdtk-linkedin-extension` folder in this repository.
2. **Sync Profile**:
   - Run `pdtk linkedin capture` in your terminal.
   - Open your LinkedIn profile in Chrome.
   - Click the **"Sync with PDTK"** button at the bottom-right of the page.
   - Your details (About, Projects, Skills) will be instantly sent to PDTK!

### VS Code Snapshot (on-demand)

Use this to send your active editor context to PDTK on command (respects ignore globs):

1. Start the PDTK listener: `pdtk linkedin capture` (keeps the local server open).
2. Open VS Code and run the dev extension in `vscode-pdtk-link/` (F5 using the provided `.vscode/launch.json`).
3. In the Extension Host window, open a file and run **PDTK: Send Editor Snapshot** from the Command Palette.
4. The snapshot POSTs to `http://localhost:4000/pdtk/editor/snapshot`; skip patterns can be configured via `pdtkLink.ignoreGlobs`.

### 🧠 Brainstorm Terminal

A structured, AI-assisted ideation environment powered by **Mistral via Ollama** (fully local, no cloud). Acts as a thinking partner, not a chatbot. Opens in its own dedicated terminal window on Windows.

```bash
# Start brainstorming — opens a dedicated CMD window on Windows
pdtk brainstorm

# Resume a previous session
pdtk brainstorm load <SESSION_ID>

# Session management (runs in current terminal)
pdtk brainstorm list
pdtk brainstorm setup
pdtk brainstorm export <id>
pdtk brainstorm import <file>
```

**Inside the brainstorm terminal — slash commands:**
```
pdtk > /brainstorm Real-time duel system    # Structured AI analysis (2 options)
pdtk > /option 2                             # Explore the alternative path
pdtk > /expand architecture                  # Deep-dive a section
pdtk > /compare                              # Side-by-side option analysis
pdtk > /refine the hybrid approach           # Sharpen a specific idea
pdtk > /report                               # Generate & save session report
pdtk > /exit                                 # Exit and save session
```

**Natural language is also fully supported:**
```
pdtk > brainstorm WebSocket architecture     # Same as /brainstorm
pdtk > tell me more about the risks          # Same as /expand risks
pdtk > go with option 1                      # Same as /option 1
pdtk > compare them                          # Same as /compare
pdtk > what do you think about Redis?        # Free-form AI chat via Mistral
pdtk > hello                                 # Conversational — Mistral responds
```

The terminal uses a **3-tier input pipeline**: slash command → NL intent detection → free-form Mistral chat. Mapped intents are echoed in dim so you always see what was triggered.

**Key features:**
- **Mistral powered** — Runs locally via Ollama, zero cloud dependency, zero latency overhead
- **Dedicated window** — Launches in its own titled CMD window, separate from your main terminal
- **Natural language input** — Understands plain English as well as slash commands
- **Second Option Logic** — Every brainstorm generates two distinct paths to prevent tunnel vision
- **Anti-Overthinking** — Warns after 2 expansions, blocks at 4 until you decide
- **Session Persistence** — Auto-saved as JSON, resume anytime with `pdtk brainstorm load <id>`
- **Structured Reports** — Full session reports with action items, decisions, and next-focus

**Prerequisites:** [Ollama](https://ollama.com) installed and running (`ollama serve`), Mistral pulled (`ollama pull mistral`)

### v1.0 (Upcoming)

| Command | Description |
|---------|-------------|
| `pdtk linkedin post` | Post shared content to LinkedIn |
| `pdtk push` | Push code to GitHub |
| `pdtk deploy` | Deploy to configured platform |

---

## 🏗️ Architecture

```
pdtk/
├── bin/
│   └── pdtk.js              # CLI entry point & command router
├── core/
│   ├── config.js            # Configuration management
│   ├── identity.js          # GitHub identity detection
│   ├── github-api.js        # GitHub API interactions
│   ├── linkedin.js          # LinkedIn OAuth & API
│   ├── brainstorm.js        # Brainstorm REPL, renderers & commands
│   ├── brainstorm-ai.js     # Ollama AI integration & structured prompts
│   └── brainstorm-session.js# Session persistence & report generation
├── config/
│   ├── pdtk.config.json     # Local config (gitignored)
│   └── brainstorm-sessions/ # Saved brainstorm sessions (gitignored)
├── pdtk-linkedin-extension/ # Chrome extension for LinkedIn sync
├── vscode-pdtk-link/        # VS Code extension for editor snapshots
├── package.json
├── COMMANDS.md              # Full command reference
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
| v0.1.1 | GitHub API, LinkedIn OAuth, Chrome Extension | ✅ Complete |
| v0.2.0 | Brainstorm Terminal (Ollama-powered) | ✅ Complete |
| v0.2.1 | Mistral integration, dedicated window, NL understanding, AI chat | ✅ Complete |
| v1.0.0 | Push, Deploy, LinkedIn Post | 🔜 In Progress |

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (LTS)
- **Execution**: OS shell via Node.js child_process
- **AI Engine**: Ollama (local LLM, no cloud dependency)
- **Dependencies**: None (uses only Node.js built-ins)
- **External CLIs**: `git`, `ollama`, deployment CLI (e.g., `vercel`)

---

## 📄 License

MIT

---

## 🤝 Contributing

PDTK v1.0 is focused on **finishability**. Feature requests are welcome but will be deferred to post-v1.0 if they expand scope.

---

> **PDTK exists to help you ship work — not to become work itself.**
