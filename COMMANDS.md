# PDTK — Command Reference

> **Personal Development ToolKit** v1.0.0  
> All available CLI commands and usage details.

---

## Quick Reference

| Command                  | Description                                         |
|--------------------------|-----------------------------------------------------|
| `pdtk`                   | Show welcome message and confirm PDTK is active     |
| `pdtk help`              | Display all available commands                       |
| `pdtk verify`            | Check GitHub and LinkedIn sync status                |
| `pdtk github sync`       | Link GitHub via Personal Access Token                |
| `pdtk github details`    | Show GitHub profile, repos, and recent activity      |
| `pdtk linkedin sync`     | Link LinkedIn via OAuth 2.0 flow                     |
| `pdtk linkedin capture`  | Capture LinkedIn profile data from Chrome Extension  |
| `pdtk linkedin details`  | Show LinkedIn profile, about, projects, and skills   |
| `pdtk brainstorm`        | Start interactive brainstorm terminal                |
| `pdtk brainstorm setup`  | Configure AI API key for brainstorming               |
| `pdtk brainstorm list`   | List saved brainstorm sessions                       |
| `pdtk brainstorm load`   | Resume a saved brainstorm session                    |
| `pdtk brainstorm export` | Export a session to file                             |
| `pdtk brainstorm import` | Import a session from file                           |
| `pdtk --version`         | Display PDTK version                                 |

---

## General Commands

### `pdtk`
Displays the welcome banner confirming PDTK is installed and active.

```bash
pdtk
```

**Output:**
```
🧰 PDTK v1.0.0 — Personal Development ToolKit
Status: Active

Run pdtk verify to check PDTK sync status.
Run pdtk help for available commands.
```

---

### `pdtk help`
Shows the full list of available commands with descriptions.

**Aliases:** `pdtk --help`, `pdtk -h`

```bash
pdtk help
```

---

### `pdtk verify`
Checks the sync status for all connected platforms (GitHub and LinkedIn).

**Alias:** `pdtk status`

```bash
pdtk verify
```

**Output includes:**
- GitHub — username, email, API access status
- LinkedIn — name, email, auth status

---

### `pdtk --version`
Prints the current PDTK version.

**Alias:** `pdtk -v`

```bash
pdtk --version
```

---

## GitHub Commands

### `pdtk github sync`
Links your GitHub account by entering a Personal Access Token (PAT).

```bash
pdtk github sync
```

**Steps:**
1. You'll be prompted to enter your GitHub PAT
2. PDTK verifies the token against the GitHub API
3. On success, your username is saved locally

**Prerequisites:**
- Create a PAT at [github.com/settings/tokens](https://github.com/settings/tokens)
- Select `repo` and `user` scopes

---

### `pdtk github details`
Fetches and displays your GitHub profile information and repositories.

```bash
pdtk github details
```

**Output includes:**
- Username, name, bio
- Total repository count
- Most recently updated repo
- Top 10 repositories (sorted by last update)

**Requires:** `pdtk github sync` must be completed first.

---

## LinkedIn Commands

### `pdtk linkedin sync`
Links your LinkedIn account through the full OAuth 2.0 authorization flow.

```bash
pdtk linkedin sync
```

**Steps:**
1. Enter your LinkedIn Developer App **Client ID** and **Client Secret**
2. A browser window opens for LinkedIn authorization
3. Approve the requested permissions
4. PDTK captures the callback and exchanges the code for an access token
5. Profile details are fetched and stored locally
6. Optionally enter your About summary, Projects, and Skills manually

**Prerequisites:**
- A LinkedIn Developer App at [linkedin.com/developers](https://www.linkedin.com/developers/)
- OAuth redirect URI set to `http://localhost:3000/callback`
- Scopes: `w_member_social`, `openid`, `profile`, `email`

---

### `pdtk linkedin capture`
Starts a local HTTP listener on **port 4000** that receives LinkedIn profile data pushed from the **PDTK Chrome Extension**.

```bash
pdtk linkedin capture
```

**How it works:**
1. Run `pdtk linkedin capture` — starts listener at `http://localhost:4000`
2. Open your LinkedIn profile in Chrome (with the PDTK extension installed)
3. The extension auto-injects a floating **PDTK Sync Engine** panel (bottom-right)
4. The panel shows a live preview of detected data:
   - **Name** — from `<h1>` tag
   - **About** — from `#about` section (longest visible text block)
   - **Projects** — from `#projects` section (list items with title + description)
   - **Skills** — from `#skills` section (deduplicated span texts)
5. Click **"SYNC TO PDTK"** button on the panel
6. Extension sends a `POST` request to `http://localhost:4000/pdtk/linkedin/sync`
7. PDTK receives the payload and saves it to `config/pdtk.config.json`

**Server also listens for:**
- `POST /pdtk/editor/snapshot` — Receives VS Code editor snapshots (from vscode-pdtk-link extension)

**Stop the listener:** Press `Ctrl+C`

**Requires:** PDTK Chrome Extension loaded in Chrome (from `pdtk-linkedin-extension/` folder).

---

### `pdtk linkedin details`
Displays the stored LinkedIn profile information.

```bash
pdtk linkedin details
```

**Output includes:**
- Name and email
- Connection status
- About section summary
- Projects list (with descriptions)
- Skills list

**Requires:** Either `pdtk linkedin sync` or `pdtk linkedin capture` must be completed first.

---

## Extensions

### PDTK Chrome Extension (`pdtk-linkedin-extension/`)
A Chrome content script that injects into LinkedIn profile pages (`linkedin.com/in/*`) and extracts:
- Name, About, Projects, Skills
- Provides a floating UI panel with live preview and sync button
- Posts extracted data to the local PDTK capture server

**Installation:**
1. Open `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select the `pdtk-linkedin-extension/` folder

---

### VS Code PDTK Link (`vscode-pdtk-link/`)
A VS Code extension that sends the current editor state (file path, cursor position, content) to the PDTK capture server.

**Command:** `PDTK: Send Snapshot` (via Command Palette)

**Configuration:**
- `pdtkLink.endpoint` — Server URL (default: `http://localhost:4000/pdtk/editor/snapshot`)
- `pdtkLink.ignoreGlobs` — Glob patterns for files to skip

---

## Brainstorm Commands

### `pdtk brainstorm`
Launches the interactive brainstorm terminal — a structured, AI-assisted ideation environment.

```bash
pdtk brainstorm
```

**Inside the terminal, use slash commands:**

| Command | Description |
|---------|-------------|
| `/brainstorm <topic>` | Start structured brainstorm analysis |
| `/expand <section>` | Deep-dive into a specific section |
| `/refine <idea>` | Refine and improve an idea |
| `/compare` | Compare current primary & secondary options |
| `/compare <A> vs <B>` | Compare two custom options |
| `/option 1` | Choose and expand primary path |
| `/option 2` | Choose and expand secondary path |
| `/pivot` | Switch to the other option |
| `/summary` | Show session overview |
| `/report` | Generate and save full report |
| `/export` | Export session to file |
| `/import <file>` | Import previous session context |
| `/clear` | Clear terminal output |
| `/help` | Show all brainstorm commands |
| `/exit` | Exit brainstorm terminal |

**Core features:**
- **Second Option Logic** — Every brainstorm generates two distinct paths (Primary + Secondary) to prevent tunnel vision
- **Anti-Overthinking** — After 2 expansions without deciding, shows depth warnings; blocks at 4 until you `/compare` or `/option`
- **Session Persistence** — All interactions auto-saved as JSON; resume anytime with `pdtk brainstorm load <id>`
- **Structured Output** — Every AI response follows a fixed template: Problem Understanding → Assumptions → Options → Risks → Complexity → Recommendation
- **MVP Suggestions** — When complexity is high, suggests starting with the simplest viable slice

**Requires:** `pdtk brainstorm setup` must be completed first (OpenAI API key).

---

### `pdtk brainstorm setup`
Configures the AI API key needed for brainstorming.

```bash
pdtk brainstorm setup
```

**Steps:**
1. Enter your OpenAI API key
2. Choose a model (default: `gpt-4o-mini`)
3. PDTK verifies the key against OpenAI API
4. Configuration saved to `config/pdtk.config.json`

**Prerequisites:**
- An OpenAI API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

### `pdtk brainstorm list`
Lists all saved brainstorm sessions with summary info.

```bash
pdtk brainstorm list
```

**Output includes:** Session ID, topic, status, date, interaction count, chosen path.

---

### `pdtk brainstorm load <SESSION_ID>`
Resumes a previously saved brainstorm session.

```bash
pdtk brainstorm load PDTK-2026-02-27-001
```

Loads all prior interactions, options, and decisions back into the active REPL.

---

### `pdtk brainstorm export <SESSION_ID>`
Exports a session (with its report) to a JSON file in the current directory.

```bash
pdtk brainstorm export PDTK-2026-02-27-001
```

---

### `pdtk brainstorm import <FILE_PATH>`
Imports a session from a JSON file into the sessions directory.

```bash
pdtk brainstorm import ./brainstorm-PDTK-2026-02-27-001.json
```

The imported session can then be loaded with `pdtk brainstorm load <id>`.

---

## Session Reports

Reports are auto-generated via `/report` inside the brainstorm terminal and saved as JSON:

```
config/brainstorm-sessions/PDTK-2026-02-27-001-report.json
```

**Report includes:**
- Session ID, topic, date, duration
- Primary and secondary options explored
- Chosen path and rejected alternatives
- Action items and pending questions
- Technical notes
- Next session focus

---

## Planned Commands (Unreleased)

| Command              | Description                              |
|----------------------|------------------------------------------|
| `pdtk linkedin post` | Post shared content to LinkedIn          |
| `pdtk push`          | Push code to GitHub                      |
| `pdtk deploy`        | Deploy to configured platform            |

---

## Configuration

All identity and sync data is stored locally in:
```
config/pdtk.config.json
```

Brainstorm sessions are stored in:
```
config/brainstorm-sessions/
```

These files are excluded from git via `.gitignore`. Config contains:
- GitHub username, email, PAT
- LinkedIn name, email, about, projects, skills, access token
- LinkedIn app credentials (Client ID / Secret)
- Brainstorm AI API key and model preference
- Last updated timestamp
