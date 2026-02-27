/**
 * PDTK Core - Brainstorm Session Module
 * Manages session persistence, report generation, and import/export.
 * Sessions are stored as JSON files in config/brainstorm-sessions/.
 */

const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, '..', 'config', 'brainstorm-sessions');

// ─── Directory Management ────────────────────────────────────────

function ensureSessionsDir() {
    if (!fs.existsSync(SESSIONS_DIR)) {
        fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
}

// ─── Session ID Generation ───────────────────────────────────────

/**
 * Generate a unique session ID in format: PDTK-YYYY-MM-DD-NNN
 */
function generateSessionId() {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD

    ensureSessionsDir();
    const existing = fs.readdirSync(SESSIONS_DIR)
        .filter(f => f.startsWith(`PDTK-${date}`) && f.endsWith('.json'))
        .length;

    const seq = String(existing + 1).padStart(3, '0');
    return `PDTK-${date}-${seq}`;
}

// ─── CRUD Operations ─────────────────────────────────────────────

/**
 * Create a new brainstorming session.
 * @param {string|null} topic - Initial topic (can be set later)
 * @returns {object} The new session object
 */
function create(topic) {
    const session = {
        session_id: generateSessionId(),
        topic: topic || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active',
        interactions: [],
        primary_option: null,
        secondary_option: null,
        chosen_path: null,
        expansion_depth: 0,
        action_items: [],
        pending_questions: [],
        technical_notes: [],
        next_session_focus: null
    };

    save(session);
    return session;
}

/**
 * Save a session to disk.
 */
function save(session) {
    ensureSessionsDir();
    session.updated_at = new Date().toISOString();
    const filePath = path.join(SESSIONS_DIR, `${session.session_id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
}

/**
 * Load a session by ID.
 * @returns {object|null}
 */
function load(sessionId) {
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    if (!fs.existsSync(filePath)) return null;

    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

/**
 * List all saved sessions with summary info.
 * @returns {Array<object>}
 */
function list() {
    ensureSessionsDir();
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));

    return files.map(f => {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
            return {
                session_id: data.session_id,
                topic: data.topic,
                status: data.status,
                created_at: data.created_at,
                interactions_count: data.interactions ? data.interactions.length : 0,
                chosen_path: data.chosen_path
            };
        } catch {
            return null;
        }
    }).filter(Boolean).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ─── Interaction Tracking ────────────────────────────────────────

/**
 * Add an interaction to the session and auto-save.
 * Also updates primary/secondary options and expansion depth.
 */
function addInteraction(session, type, input, output) {
    session.interactions.push({
        type,
        input,
        output,
        timestamp: new Date().toISOString()
    });

    // Track options from brainstorm responses
    if (type === 'brainstorm' && output) {
        if (output.primary_option) session.primary_option = output.primary_option;
        if (output.secondary_option) session.secondary_option = output.secondary_option;
    }

    // Update action items from option_expand responses
    if (type === 'option_expand' && output && output.action_items) {
        session.action_items = [
            ...session.action_items,
            ...output.action_items
        ];
        // Deduplicate
        session.action_items = [...new Set(session.action_items)];
    }

    // Track expansion depth (resets on option selection or pivot)
    if (['expand', 'refine'].includes(type)) {
        session.expansion_depth = (session.expansion_depth || 0) + 1;
    }

    save(session);
}

/**
 * Mark the chosen path and reset expansion depth.
 */
function choosePath(session, optionNum) {
    session.chosen_path = `Option ${optionNum}`;
    session.expansion_depth = 0; // Decision made — reset depth
    save(session);
}

/**
 * Pivot to the other option.
 */
function pivot(session) {
    if (session.chosen_path === 'Option 1') {
        session.chosen_path = 'Option 2';
    } else {
        session.chosen_path = 'Option 1';
    }
    session.expansion_depth = 0; // Reset on pivot
    save(session);
}

/**
 * Mark session as completed.
 */
function complete(session) {
    session.status = 'completed';
    save(session);
}

// ─── Report Generation ──────────────────────────────────────────

/**
 * Calculate the duration of a session from first to last interaction.
 */
function calculateDuration(session) {
    if (!session.interactions || session.interactions.length === 0) return '0m';

    const first = new Date(session.interactions[0].timestamp);
    const last = new Date(session.interactions[session.interactions.length - 1].timestamp);
    const diffMs = last - first;
    const mins = Math.round(diffMs / 60000);

    if (mins < 1) return '<1m';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/**
 * Generate a structured report object from a session.
 */
function generateReport(session) {
    return {
        session_id: session.session_id,
        topic: session.topic,
        date: session.created_at,
        duration: calculateDuration(session),
        status: session.status,
        total_interactions: session.interactions.length,
        primary_option: session.primary_option,
        secondary_option: session.secondary_option,
        chosen_path: session.chosen_path,
        action_items: session.action_items,
        pending_questions: session.pending_questions,
        technical_notes: session.technical_notes,
        explored_topics: session.interactions
            .filter(i => i.type === 'brainstorm')
            .map(i => i.input),
        expansions: session.interactions
            .filter(i => ['expand', 'refine', 'option_expand'].includes(i.type))
            .map(i => ({ type: i.type, input: i.input, timestamp: i.timestamp })),
        next_session_focus: session.next_session_focus,
        generated_at: new Date().toISOString()
    };
}

// ─── Import / Export ─────────────────────────────────────────────

/**
 * Export a session (with its report) to a file.
 * @returns {boolean} Success status
 */
function exportToFile(sessionId, exportPath) {
    const session = load(sessionId);
    if (!session) return false;

    const report = generateReport(session);
    const fullExport = { ...session, _report: report };

    fs.writeFileSync(exportPath, JSON.stringify(fullExport, null, 2), 'utf8');
    return true;
}

/**
 * Import a session from a JSON file.
 * @returns {object|null} The imported session, or null on failure
 */
function importFromFile(filePath) {
    if (!fs.existsSync(filePath)) return null;

    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);

        // Validate minimum structure
        if (!data.session_id || !data.interactions) {
            return null;
        }

        // Remove generated report if present (will be regenerated)
        delete data._report;

        // Save to sessions directory
        ensureSessionsDir();
        const destPath = path.join(SESSIONS_DIR, `${data.session_id}.json`);
        fs.writeFileSync(destPath, JSON.stringify(data, null, 2), 'utf8');

        return data;
    } catch {
        return null;
    }
}

// ─── Anti-Overthinking ──────────────────────────────────────────

/**
 * Check the current overthinking depth level.
 * @returns {'soft'|'hard'|null}
 */
function checkDepth(session) {
    const depth = session.expansion_depth || 0;
    if (depth >= 4) return 'hard';
    if (depth >= 2) return 'soft';
    return null;
}

module.exports = {
    create,
    save,
    load,
    list,
    addInteraction,
    choosePath,
    pivot,
    complete,
    generateReport,
    exportToFile,
    importFromFile,
    checkDepth,
    SESSIONS_DIR
};
