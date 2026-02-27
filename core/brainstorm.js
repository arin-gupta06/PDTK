/**
 * PDTK Core - Brainstorm Terminal Module
 * Interactive brainstorming environment with structured AI output,
 * Second Option Logic, anti-overthinking, and session persistence.
 *
 * Entry points:
 *   start(sessionId)       — Launch interactive REPL (optionally resume a session)
 *   setup()                — Configure AI API key
 *   listSessionsCLI()      — Print saved sessions
 *   exportSessionCLI(id)   — Export a session to file
 *   importSessionCLI(file) — Import a session from file
 */

const readline = require('readline');
const path = require('path');
const fs = require('fs');

const ai = require('./brainstorm-ai');
const sessions = require('./brainstorm-session');
const config = require('./config');

// ─── ANSI Colors ─────────────────────────────────────────────────

const c = {
    reset:  '\x1b[0m',
    bright: '\x1b[1m',
    dim:    '\x1b[2m',
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    blue:   '\x1b[34m',
    cyan:   '\x1b[36m',
    red:    '\x1b[31m',
    magenta:'\x1b[35m',
    white:  '\x1b[37m',
    bgCyan: '\x1b[46m',
    bgBlue: '\x1b[44m'
};

// ─── Text Utilities ──────────────────────────────────────────────

/**
 * Wrap text to a max width, indented for terminal display.
 */
function wrapText(text, maxWidth, indent) {
    if (!text) return '';
    indent = indent || '  ';
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if ((currentLine + ' ' + word).trim().length > maxWidth) {
            lines.push(currentLine.trim());
            currentLine = word;
        } else {
            currentLine = currentLine ? currentLine + ' ' + word : word;
        }
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    return lines.join('\n' + indent);
}

/**
 * Terminal-safe spinner for async operations.
 */
function createSpinner(text) {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    const id = setInterval(() => {
        const frame = frames[i++ % frames.length];
        process.stdout.write(`\r  ${c.cyan}${frame}${c.reset} ${text}   `);
    }, 80);

    return {
        stop(msg) {
            clearInterval(id);
            process.stdout.write('\r' + ' '.repeat(text.length + 12) + '\r');
            if (msg) console.log(msg);
        }
    };
}

/**
 * Prompt helper for setup flow.
 */
function promptInput(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(`  ${c.cyan}?${c.reset} ${question} `, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

// ─── Renderers ───────────────────────────────────────────────────

const W = 62; // Render width
const LINE = `${c.cyan}${'━'.repeat(W)}${c.reset}`;
const THIN = `${c.dim}${'─'.repeat(W)}${c.reset}`;

function renderBrainstorm(data) {
    console.log();
    console.log(LINE);
    console.log(`  ${c.bright}${c.cyan}BRAINSTORM ANALYSIS${c.reset}`);
    console.log(LINE);

    // Problem Understanding
    console.log(`\n  ${c.bright}${c.blue}📋 PROBLEM UNDERSTANDING${c.reset}`);
    console.log(`  ${wrapText(data.problem_understanding || 'N/A', W - 4)}`);

    // Assumptions
    console.log(`\n  ${c.bright}${c.blue}📌 ASSUMPTIONS${c.reset}`);
    const assumptions = data.assumptions || [];
    assumptions.forEach(a => console.log(`  ${c.dim}•${c.reset} ${a}`));

    // Option 1
    console.log();
    console.log(`  ${c.yellow}${'─'.repeat(W - 4)}${c.reset}`);
    console.log(`  ${c.bright}${c.green}▸ OPTION 1: ${data.primary_option?.title || 'Untitled'}${c.reset}`);
    console.log(`  ${c.yellow}${'─'.repeat(W - 4)}${c.reset}`);
    renderOptionBlock(data.primary_option);

    // Option 2
    console.log();
    console.log(`  ${c.yellow}${'─'.repeat(W - 4)}${c.reset}`);
    console.log(`  ${c.bright}${c.blue}▸ OPTION 2: ${data.secondary_option?.title || 'Untitled'}${c.reset}`);
    console.log(`  ${c.yellow}${'─'.repeat(W - 4)}${c.reset}`);
    renderOptionBlock(data.secondary_option);

    // Hybrid
    if (data.hybrid_possibility && data.hybrid_possibility !== 'null') {
        console.log(`\n  ${c.bright}${c.magenta}🔀 HYBRID POSSIBILITY${c.reset}`);
        console.log(`  ${wrapText(data.hybrid_possibility, W - 4)}`);
    }

    // Risk Analysis
    console.log(`\n  ${c.bright}${c.red}⚠  RISK ANALYSIS${c.reset}`);
    const risks = data.risk_analysis || [];
    risks.forEach(r => console.log(`  ${c.red}•${c.reset} ${r}`));

    // Complexity
    const ce = data.complexity_estimate || {};
    console.log(`\n  ${c.bright}${c.yellow}📊 COMPLEXITY ESTIMATE${c.reset}`);
    console.log(`  Option 1: ${colorComplexity(ce.option_1)}  │  Option 2: ${colorComplexity(ce.option_2)}`);
    if (ce.reasoning) console.log(`  ${c.dim}${wrapText(ce.reasoning, W - 4)}${c.reset}`);

    // Recommendation
    console.log(`\n  ${c.bright}${c.green}💡 RECOMMENDATION${c.reset}`);
    console.log(`  ${wrapText(data.recommendation || 'N/A', W - 4)}`);

    console.log();
    console.log(LINE);
    console.log(`  ${c.dim}Next: /option 1 │ /option 2 │ /compare │ /expand <section>${c.reset}`);
    console.log();
}

function renderOptionBlock(opt) {
    if (!opt) { console.log(`  ${c.dim}No data.${c.reset}`); return; }

    console.log(`  ${c.bright}Approach:${c.reset} ${wrapText(opt.approach || '', W - 14, '             ')}`);
    console.log(`  ${c.bright}Steps:${c.reset}`);
    (opt.steps || []).forEach((s, i) => console.log(`    ${c.dim}${i + 1}.${c.reset} ${s}`));
    console.log(`  ${c.green}+ Pros:${c.reset} ${(opt.pros || []).join(' │ ')}`);
    console.log(`  ${c.red}- Cons:${c.reset} ${(opt.cons || []).join(' │ ')}`);
}

function colorComplexity(level) {
    if (!level) return `${c.dim}N/A${c.reset}`;
    const l = level.toLowerCase();
    if (l === 'low') return `${c.green}${level}${c.reset}`;
    if (l === 'medium') return `${c.yellow}${level}${c.reset}`;
    return `${c.red}${level}${c.reset}`;
}

function renderExpand(data) {
    console.log();
    console.log(LINE);
    console.log(`  ${c.bright}${c.cyan}EXPANDED: ${data.section || 'Section'}${c.reset}`);
    console.log(LINE);

    console.log(`\n  ${c.bright}${c.blue}📖 DETAILED ANALYSIS${c.reset}`);
    console.log(`  ${wrapText(data.detailed_analysis || 'N/A', W - 4)}`);

    console.log(`\n  ${c.bright}${c.blue}🔧 IMPLEMENTATION STEPS${c.reset}`);
    (data.implementation_steps || []).forEach((s, i) => console.log(`    ${c.dim}${i + 1}.${c.reset} ${s}`));

    console.log(`\n  ${c.bright}${c.yellow}⚙  TECHNICAL CONSIDERATIONS${c.reset}`);
    (data.technical_considerations || []).forEach(t => console.log(`  ${c.yellow}•${c.reset} ${t}`));

    console.log(`\n  ${c.bright}Effort:${c.reset} ${data.estimated_effort || 'N/A'}`);

    console.log(`\n  ${c.bright}📦 DEPENDENCIES${c.reset}`);
    (data.dependencies || []).forEach(d => console.log(`  ${c.dim}•${c.reset} ${d}`));

    console.log(`\n  ${c.bright}${c.green}⚡ QUICK WINS${c.reset}`);
    (data.quick_wins || []).forEach(q => console.log(`  ${c.green}✓${c.reset} ${q}`));

    console.log();
    console.log(LINE);
    console.log();
}

function renderRefine(data) {
    console.log();
    console.log(LINE);
    console.log(`  ${c.bright}${c.cyan}REFINED IDEA${c.reset}`);
    console.log(LINE);

    console.log(`\n  ${c.bright}${c.dim}Original:${c.reset} ${data.original_idea || 'N/A'}`);
    console.log(`\n  ${c.bright}${c.green}Refined:${c.reset} ${wrapText(data.refined_version || 'N/A', W - 4)}`);

    console.log(`\n  ${c.bright}Key Improvements:${c.reset}`);
    (data.key_improvements || []).forEach(k => console.log(`  ${c.green}↑${c.reset} ${k}`));

    console.log(`\n  ${c.bright}Priority:${c.reset} ${colorComplexity(data.implementation_priority)}`);

    console.log(`\n  ${c.bright}Next Steps:${c.reset}`);
    (data.next_steps || []).forEach((s, i) => console.log(`    ${c.dim}${i + 1}.${c.reset} ${s}`));

    console.log(`\n  ${c.bright}${c.red}Blockers:${c.reset}`);
    (data.potential_blockers || []).forEach(b => console.log(`  ${c.red}!${c.reset} ${b}`));

    console.log();
    console.log(LINE);
    console.log();
}

function renderCompare(data) {
    console.log();
    console.log(LINE);
    console.log(`  ${c.bright}${c.cyan}COMPARISON ANALYSIS${c.reset}`);
    console.log(LINE);

    // Option A
    const a = data.option_a || {};
    console.log(`\n  ${c.bright}${c.green}▸ ${a.name || 'Option A'}${c.reset}`);
    console.log(`  ${c.bright}Strengths:${c.reset}`);
    (a.strengths || []).forEach(s => console.log(`    ${c.green}+${c.reset} ${s}`));
    console.log(`  ${c.bright}Weaknesses:${c.reset}`);
    (a.weaknesses || []).forEach(w => console.log(`    ${c.red}-${c.reset} ${w}`));
    console.log(`  ${c.bright}Best for:${c.reset} ${a.best_for || 'N/A'}`);

    // Option B
    const b = data.option_b || {};
    console.log(`\n  ${c.bright}${c.blue}▸ ${b.name || 'Option B'}${c.reset}`);
    console.log(`  ${c.bright}Strengths:${c.reset}`);
    (b.strengths || []).forEach(s => console.log(`    ${c.green}+${c.reset} ${s}`));
    console.log(`  ${c.bright}Weaknesses:${c.reset}`);
    (b.weaknesses || []).forEach(w => console.log(`    ${c.red}-${c.reset} ${w}`));
    console.log(`  ${c.bright}Best for:${c.reset} ${b.best_for || 'N/A'}`);

    // Comparisons
    console.log(`\n  ${c.bright}${c.yellow}Risk:${c.reset} ${wrapText(data.risk_comparison || 'N/A', W - 10)}`);
    console.log(`  ${c.bright}${c.yellow}Complexity:${c.reset} ${wrapText(data.complexity_comparison || 'N/A', W - 16)}`);

    // Verdict
    console.log(`\n  ${c.bright}${c.green}💡 VERDICT${c.reset}`);
    console.log(`  ${wrapText(data.verdict || 'N/A', W - 4)}`);

    console.log();
    console.log(LINE);
    console.log(`  ${c.dim}Next: /option 1 │ /option 2 │ /pivot${c.reset}`);
    console.log();
}

function renderOptionExpand(data) {
    console.log();
    console.log(LINE);
    console.log(`  ${c.bright}${c.cyan}DEEP DIVE: ${data.chosen_option || 'Chosen Option'}${c.reset}`);
    console.log(LINE);

    console.log(`\n  ${c.bright}${c.blue}📖 APPROACH${c.reset}`);
    console.log(`  ${wrapText(data.detailed_approach || 'N/A', W - 4)}`);

    console.log(`\n  ${c.bright}${c.blue}🏗  ARCHITECTURE${c.reset}`);
    console.log(`  ${wrapText(data.architecture || 'N/A', W - 4)}`);

    console.log(`\n  ${c.bright}${c.blue}📅 IMPLEMENTATION PHASES${c.reset}`);
    (data.implementation_phases || []).forEach((phase, i) => {
        console.log(`\n    ${c.bright}Phase ${i + 1}: ${phase.phase}${c.reset} ${c.dim}(${phase.estimate || '?'})${c.reset}`);
        (phase.tasks || []).forEach(t => console.log(`      ${c.dim}→${c.reset} ${t}`));
    });

    console.log(`\n  ${c.bright}${c.magenta}🛠  TECH STACK SUGGESTIONS${c.reset}`);
    (data.tech_stack_suggestions || []).forEach(t => console.log(`  ${c.magenta}•${c.reset} ${t}`));

    console.log(`\n  ${c.bright}${c.green}🎯 MVP SCOPE${c.reset}`);
    console.log(`  ${wrapText(data.mvp_scope || 'N/A', W - 4)}`);

    console.log(`\n  ${c.bright}${c.red}⚠  RISKS${c.reset}`);
    (data.risks || []).forEach(r => console.log(`  ${c.red}•${c.reset} ${r}`));

    console.log(`\n  ${c.bright}${c.green}✅ ACTION ITEMS${c.reset}`);
    (data.action_items || []).forEach((a, i) => console.log(`    ${c.dim}${i + 1}.${c.reset} ${a}`));

    console.log();
    console.log(LINE);
    console.log(`  ${c.dim}Next: /expand <section> │ /refine <idea> │ /report${c.reset}`);
    console.log();
}

function renderReport(report) {
    console.log();
    console.log(`${c.cyan}${'═'.repeat(W)}${c.reset}`);
    console.log(`  ${c.bright}${c.cyan}SESSION REPORT${c.reset}`);
    console.log(`${c.cyan}${'═'.repeat(W)}${c.reset}`);

    console.log(`\n  ${c.bright}Session:${c.reset}      ${report.session_id}`);
    console.log(`  ${c.bright}Topic:${c.reset}        ${report.topic || 'N/A'}`);
    console.log(`  ${c.bright}Date:${c.reset}         ${new Date(report.date).toLocaleDateString()}`);
    console.log(`  ${c.bright}Duration:${c.reset}     ${report.duration}`);
    console.log(`  ${c.bright}Status:${c.reset}       ${report.status}`);
    console.log(`  ${c.bright}Interactions:${c.reset} ${report.total_interactions}`);
    console.log(`  ${c.bright}Chosen Path:${c.reset}  ${report.chosen_path || 'None yet'}`);

    if (report.primary_option) {
        console.log(`\n  ${c.bright}${c.green}Option 1:${c.reset} ${report.primary_option.title || 'N/A'}`);
    }
    if (report.secondary_option) {
        console.log(`  ${c.bright}${c.blue}Option 2:${c.reset} ${report.secondary_option.title || 'N/A'}`);
    }

    if (report.action_items && report.action_items.length > 0) {
        console.log(`\n  ${c.bright}${c.green}Action Items:${c.reset}`);
        report.action_items.forEach((a, i) => console.log(`    ${i + 1}. ${a}`));
    }

    if (report.pending_questions && report.pending_questions.length > 0) {
        console.log(`\n  ${c.bright}${c.yellow}Pending Questions:${c.reset}`);
        report.pending_questions.forEach(q => console.log(`    ? ${q}`));
    }

    if (report.next_session_focus) {
        console.log(`\n  ${c.bright}Next Focus:${c.reset} ${report.next_session_focus}`);
    }

    console.log();
    console.log(`${c.cyan}${'═'.repeat(W)}${c.reset}`);
    console.log();
}

function renderSummary(session) {
    console.log();
    console.log(THIN);
    console.log(`  ${c.bright}SESSION SUMMARY${c.reset}`);
    console.log(THIN);

    console.log(`  ${c.bright}ID:${c.reset}           ${session.session_id}`);
    console.log(`  ${c.bright}Topic:${c.reset}        ${session.topic || 'Not set'}`);
    console.log(`  ${c.bright}Status:${c.reset}       ${session.status}`);
    console.log(`  ${c.bright}Interactions:${c.reset} ${session.interactions.length}`);
    console.log(`  ${c.bright}Depth:${c.reset}        ${session.expansion_depth || 0}`);
    console.log(`  ${c.bright}Chosen Path:${c.reset}  ${session.chosen_path || 'None'}`);

    if (session.primary_option) {
        console.log(`  ${c.bright}Option 1:${c.reset}     ${c.green}${session.primary_option.title}${c.reset}`);
    }
    if (session.secondary_option) {
        console.log(`  ${c.bright}Option 2:${c.reset}     ${c.blue}${session.secondary_option.title}${c.reset}`);
    }
    if (session.action_items && session.action_items.length > 0) {
        console.log(`  ${c.bright}Actions:${c.reset}      ${session.action_items.length} item(s)`);
    }

    console.log(THIN);
    console.log();
}

function renderSessionList(sessionsList) {
    console.log();
    console.log(LINE);
    console.log(`  ${c.bright}${c.cyan}SAVED BRAINSTORM SESSIONS${c.reset}`);
    console.log(LINE);

    if (sessionsList.length === 0) {
        console.log(`\n  ${c.dim}No sessions found. Start one with: pdtk brainstorm${c.reset}\n`);
        return;
    }

    console.log();
    for (const s of sessionsList) {
        const statusColor = s.status === 'active' ? c.green : c.dim;
        const date = new Date(s.created_at).toLocaleDateString();
        console.log(`  ${c.bright}${s.session_id}${c.reset}  ${statusColor}${s.status}${c.reset}`);
        console.log(`    ${s.topic || 'No topic'}  ${c.dim}│ ${date} │ ${s.interactions_count} interactions${c.reset}`);
        if (s.chosen_path) console.log(`    ${c.dim}Chosen: ${s.chosen_path}${c.reset}`);
        console.log();
    }

    console.log(`  ${c.dim}Load: pdtk brainstorm load <SESSION_ID>${c.reset}`);
    console.log(LINE);
    console.log();
}

function renderHelp() {
    console.log(`
  ${c.bright}${c.cyan}BRAINSTORM COMMANDS${c.reset}
  ${c.dim}${'─'.repeat(46)}${c.reset}
  ${c.yellow}/brainstorm <topic>${c.reset}       Start structured brainstorm
  ${c.yellow}/expand <section>${c.reset}         Deep-dive into a section
  ${c.yellow}/refine <idea>${c.reset}            Refine and improve an idea
  ${c.yellow}/compare${c.reset}                  Compare current options
  ${c.yellow}/compare <A> vs <B>${c.reset}       Compare two custom options

  ${c.bright}${c.cyan}OPTION COMMANDS${c.reset}
  ${c.dim}${'─'.repeat(46)}${c.reset}
  ${c.yellow}/option 1${c.reset}                 Explore primary path
  ${c.yellow}/option 2${c.reset}                 Explore secondary path
  ${c.yellow}/pivot${c.reset}                    Switch to the other option

  ${c.bright}${c.cyan}SESSION COMMANDS${c.reset}
  ${c.dim}${'─'.repeat(46)}${c.reset}
  ${c.yellow}/summary${c.reset}                  Show session overview
  ${c.yellow}/report${c.reset}                   Generate & save full report
  ${c.yellow}/export${c.reset}                   Export session to file
  ${c.yellow}/import <file>${c.reset}             Import previous session context
  ${c.yellow}/clear${c.reset}                    Clear terminal output
  ${c.yellow}/help${c.reset}                     Show this help
  ${c.yellow}/exit${c.reset}                     Exit brainstorm terminal
`);
}

function renderWelcome(session) {
    console.log(`
  ${c.cyan}${c.bright}🧠 PDTK Brainstorm Terminal${c.reset} v1.0
  ${c.cyan}${'━'.repeat(W)}${c.reset}
  ${c.bright}Session:${c.reset} ${session.session_id}${session.topic ? `  │  Topic: ${session.topic}` : ''}
  ${session.interactions.length > 0 ? `${c.dim}Resumed with ${session.interactions.length} prior interactions.${c.reset}` : `${c.dim}New session. Start with /brainstorm <your topic>${c.reset}`}

  ${c.dim}Commands: /help  │  Exit: /exit or Ctrl+C${c.reset}
`);
}

// ─── Anti-Overthinking ───────────────────────────────────────────

/**
 * Show a depth warning if the user has expanded too many times.
 * Blocks further expansion at depth >= 4.
 * @returns {boolean} true if the command should be blocked
 */
function enforceDepthCheck(session) {
    const level = sessions.checkDepth(session);

    if (level === 'hard') {
        console.log(`\n  ${c.red}${c.bright}🛑 EXPANSION LIMIT REACHED${c.reset}`);
        console.log(`  You've expanded ${session.expansion_depth} times without choosing a path.`);
        console.log(`  ${c.yellow}→ Run /compare to evaluate, /option <n> to decide, or /report to wrap up.${c.reset}\n`);
        return true; // Block
    }

    if (level === 'soft') {
        console.log(`\n  ${c.yellow}${c.bright}⚠  DEPTH CHECK${c.reset} ${c.dim}(${session.expansion_depth} expansions without deciding)${c.reset}`);
        console.log(`  ${c.dim}Consider: /compare │ /option <n> │ /report${c.reset}\n`);
        return false; // Warning only
    }

    return false;
}

/**
 * Show MVP suggestion when the AI response indicates high complexity.
 */
function suggestMVP(data) {
    const ce = data?.complexity_estimate;
    if (!ce) return;
    const high = [ce.option_1, ce.option_2].filter(x => x && x.toLowerCase() === 'high').length;
    if (high > 0) {
        console.log(`  ${c.yellow}${c.bright}💡 MVP SUGGESTION:${c.reset} ${c.dim}High complexity detected. Consider starting with the simplest viable slice.${c.reset}`);
        console.log(`  ${c.dim}Use /option <n> to pick one, then /expand mvp scope for a focused plan.${c.reset}\n`);
    }
}

// ─── Command Parser ──────────────────────────────────────────────

function parseCommand(input) {
    if (!input.startsWith('/')) return null;
    const firstSpace = input.indexOf(' ');
    if (firstSpace === -1) {
        return { cmd: input.slice(1).toLowerCase(), args: '' };
    }
    return {
        cmd: input.slice(1, firstSpace).toLowerCase(),
        args: input.slice(firstSpace + 1).trim()
    };
}

// ─── REPL ────────────────────────────────────────────────────────

/**
 * Start the interactive brainstorm REPL.
 */
function startRepl(currentSession, apiKey, model) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `${c.cyan}pdtk >${c.reset} `
    });

    renderWelcome(currentSession);
    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();
        if (!input) { rl.prompt(); return; }

        const parsed = parseCommand(input);
        if (!parsed) {
            console.log(`  ${c.dim}Commands start with /. Type /help for available commands.${c.reset}\n`);
            rl.prompt();
            return;
        }

        // Pause input during async work
        rl.pause();

        try {
            await dispatchCommand(parsed.cmd, parsed.args, currentSession, apiKey, model, rl);
        } catch (err) {
            console.log(`  ${c.red}Error: ${err.message}${c.reset}\n`);
        }

        // Check if REPL should continue (exit command sets session status)
        if (currentSession.status === 'exiting') {
            rl.close();
            return;
        }

        rl.resume();
        rl.prompt();
    });

    rl.on('close', () => {
        if (currentSession.status !== 'exiting') {
            currentSession.status = 'active'; // Keep active if Ctrl+C
        }
        sessions.save(currentSession);
        console.log(`\n  ${c.dim}Session saved: ${currentSession.session_id}${c.reset}\n`);
    });

    // Graceful Ctrl+C
    rl.on('SIGINT', () => {
        currentSession.status = 'active';
        sessions.save(currentSession);
        console.log(`\n\n  ${c.dim}Session saved. Goodbye.${c.reset}\n`);
        process.exit(0);
    });
}

// ─── Command Dispatcher ─────────────────────────────────────────

async function dispatchCommand(cmd, args, session, apiKey, model, rl) {
    switch (cmd) {
        // ── Brainstorm Commands ──
        case 'brainstorm':
            await handleBrainstorm(args, session, apiKey, model);
            break;

        case 'expand':
            await handleExpand(args, session, apiKey, model);
            break;

        case 'refine':
            await handleRefine(args, session, apiKey, model);
            break;

        case 'compare':
            await handleCompare(args, session, apiKey, model);
            break;

        // ── Option Commands ──
        case 'option':
            await handleOption(args, session, apiKey, model);
            break;

        case 'pivot':
            handlePivot(session);
            break;

        // ── Session Commands ──
        case 'summary':
            renderSummary(session);
            break;

        case 'report':
            handleReport(session);
            break;

        case 'export':
            handleExport(session);
            break;

        case 'import':
            handleImport(args, session);
            break;

        case 'clear':
            console.clear();
            renderWelcome(session);
            break;

        case 'help':
            renderHelp();
            break;

        case 'exit':
        case 'quit':
            session.status = 'exiting';
            sessions.save(session);
            break;

        default:
            console.log(`  ${c.red}Unknown command: /${cmd}${c.reset}`);
            console.log(`  ${c.dim}Type /help for available commands.${c.reset}\n`);
    }
}

// ─── Command Handlers ────────────────────────────────────────────

async function handleBrainstorm(topic, session, apiKey, model) {
    if (!topic) {
        console.log(`  ${c.red}Usage: /brainstorm <topic>${c.reset}\n`);
        return;
    }

    session.topic = topic;
    const spinner = createSpinner('Analyzing topic...');

    try {
        const result = await ai.brainstorm(topic, session, apiKey, model);
        spinner.stop(`  ${c.green}✓${c.reset} Analysis complete.`);
        renderBrainstorm(result);
        suggestMVP(result);
        sessions.addInteraction(session, 'brainstorm', topic, result);
    } catch (err) {
        spinner.stop(`  ${c.red}✗ Failed.${c.reset}`);
        throw err;
    }
}

async function handleExpand(section, session, apiKey, model) {
    if (!section) {
        console.log(`  ${c.red}Usage: /expand <section name>${c.reset}\n`);
        return;
    }

    if (session.interactions.length === 0) {
        console.log(`  ${c.yellow}No brainstorm to expand. Run /brainstorm <topic> first.${c.reset}\n`);
        return;
    }

    // Anti-overthinking check
    if (enforceDepthCheck(session)) return;

    const spinner = createSpinner(`Expanding "${section}"...`);

    try {
        const result = await ai.expand(section, session, apiKey, model);
        spinner.stop(`  ${c.green}✓${c.reset} Expansion complete.`);
        renderExpand(result);
        sessions.addInteraction(session, 'expand', section, result);
    } catch (err) {
        spinner.stop(`  ${c.red}✗ Failed.${c.reset}`);
        throw err;
    }
}

async function handleRefine(idea, session, apiKey, model) {
    if (!idea) {
        console.log(`  ${c.red}Usage: /refine <idea or concept>${c.reset}\n`);
        return;
    }

    if (session.interactions.length === 0) {
        console.log(`  ${c.yellow}No context to refine. Run /brainstorm <topic> first.${c.reset}\n`);
        return;
    }

    // Anti-overthinking check
    if (enforceDepthCheck(session)) return;

    const spinner = createSpinner('Refining idea...');

    try {
        const result = await ai.refine(idea, session, apiKey, model);
        spinner.stop(`  ${c.green}✓${c.reset} Refinement complete.`);
        renderRefine(result);
        sessions.addInteraction(session, 'refine', idea, result);
    } catch (err) {
        spinner.stop(`  ${c.red}✗ Failed.${c.reset}`);
        throw err;
    }
}

async function handleCompare(args, session, apiKey, model) {
    let optA, optB;

    if (!args || args.trim() === '') {
        // Compare session's current two options
        if (!session.primary_option || !session.secondary_option) {
            console.log(`  ${c.yellow}No options to compare. Run /brainstorm first.${c.reset}\n`);
            return;
        }
        optA = session.primary_option.title;
        optB = session.secondary_option.title;
    } else {
        // Parse "optionA vs optionB"
        const parts = args.split(/\s+vs\.?\s+/i);
        if (parts.length !== 2) {
            console.log(`  ${c.red}Usage: /compare <option A> vs <option B>${c.reset}`);
            console.log(`  ${c.dim}Or run /compare with no args to compare current options.${c.reset}\n`);
            return;
        }
        optA = parts[0].trim();
        optB = parts[1].trim();
    }

    const spinner = createSpinner('Comparing options...');

    try {
        const result = await ai.compare(optA, optB, session, apiKey, model);
        spinner.stop(`  ${c.green}✓${c.reset} Comparison complete.`);
        renderCompare(result);
        sessions.addInteraction(session, 'compare', `${optA} vs ${optB}`, result);
    } catch (err) {
        spinner.stop(`  ${c.red}✗ Failed.${c.reset}`);
        throw err;
    }
}

async function handleOption(args, session, apiKey, model) {
    const num = parseInt(args, 10);
    if (num !== 1 && num !== 2) {
        console.log(`  ${c.red}Usage: /option 1 or /option 2${c.reset}\n`);
        return;
    }

    const option = num === 1 ? session.primary_option : session.secondary_option;
    if (!option) {
        console.log(`  ${c.yellow}Option ${num} not available. Run /brainstorm first.${c.reset}\n`);
        return;
    }

    sessions.choosePath(session, num);
    console.log(`  ${c.green}✓ Path chosen: Option ${num} — "${option.title}"${c.reset}\n`);

    const spinner = createSpinner(`Deep-diving into Option ${num}...`);

    try {
        const result = await ai.expandOption(num, session, apiKey, model);
        spinner.stop(`  ${c.green}✓${c.reset} Deep dive complete.`);
        renderOptionExpand(result);
        sessions.addInteraction(session, 'option_expand', `Option ${num}: ${option.title}`, result);
    } catch (err) {
        spinner.stop(`  ${c.red}✗ Failed.${c.reset}`);
        throw err;
    }
}

function handlePivot(session) {
    if (!session.chosen_path) {
        console.log(`  ${c.yellow}No path chosen yet. Use /option 1 or /option 2 first.${c.reset}\n`);
        return;
    }

    const oldPath = session.chosen_path;
    sessions.pivot(session);
    console.log(`  ${c.green}✓ Pivoted: ${oldPath} → ${session.chosen_path}${c.reset}`);
    console.log(`  ${c.dim}Expansion depth reset. Run /option ${session.chosen_path === 'Option 1' ? '1' : '2'} to explore the new path.${c.reset}\n`);
}

function handleReport(session) {
    const report = sessions.generateReport(session);
    renderReport(report);

    // Save report file alongside session
    const reportPath = path.join(sessions.SESSIONS_DIR, `${session.session_id}-report.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`  ${c.green}✓ Report saved:${c.reset} ${reportPath}\n`);
}

function handleExport(session) {
    const exportDir = process.cwd();
    const fileName = `brainstorm-${session.session_id}.json`;
    const exportPath = path.join(exportDir, fileName);

    const success = sessions.exportToFile(session.session_id, exportPath);
    if (success) {
        console.log(`  ${c.green}✓ Exported:${c.reset} ${exportPath}\n`);
    } else {
        console.log(`  ${c.red}✗ Export failed.${c.reset}\n`);
    }
}

function handleImport(filePath, session) {
    if (!filePath) {
        console.log(`  ${c.red}Usage: /import <file path>${c.reset}\n`);
        return;
    }

    // Resolve relative paths
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

    const imported = sessions.importFromFile(resolved);
    if (imported) {
        // Inject context from imported session into current session
        if (imported.chosen_path) session.chosen_path = imported.chosen_path;
        if (imported.primary_option) session.primary_option = imported.primary_option;
        if (imported.secondary_option) session.secondary_option = imported.secondary_option;
        if (imported.action_items) {
            session.action_items = [...new Set([...session.action_items, ...imported.action_items])];
        }
        if (imported.pending_questions) {
            session.pending_questions = [...new Set([...session.pending_questions, ...imported.pending_questions])];
        }
        sessions.save(session);

        console.log(`  ${c.green}✓ Imported context from:${c.reset} ${imported.session_id}`);
        console.log(`  ${c.dim}Previous decisions and action items injected into current session.${c.reset}\n`);
    } else {
        console.log(`  ${c.red}✗ Failed to import. Check file path and format.${c.reset}\n`);
    }
}

// ─── Public Entry Points ─────────────────────────────────────────

/**
 * Start the brainstorm terminal (new or resumed session).
 * @param {string|null} sessionId - Optional session ID to resume
 */
async function start(sessionId) {
    const brainstormConfig = config.getBrainstormConfig();

    if (!brainstormConfig || !brainstormConfig.model) {
        console.log(`\n  ${c.red}${c.bright}Brainstorm engine not configured.${c.reset}`);
        console.log(`  Run ${c.yellow}pdtk brainstorm setup${c.reset} to configure your Ollama model.\n`);
        return;
    }

    let currentSession;

    if (sessionId) {
        currentSession = sessions.load(sessionId);
        if (!currentSession) {
            console.log(`\n  ${c.red}Session not found: ${sessionId}${c.reset}\n`);
            return;
        }
        currentSession.status = 'active';
        sessions.save(currentSession);
    } else {
        currentSession = sessions.create(null);
    }

    startRepl(currentSession, null, brainstormConfig.model);
}

/**
 * Configure the brainstorm engine for Ollama.
 */
async function setup() {
    console.log(`\n  ${c.cyan}${c.bright}PDTK Brainstorm — Ollama Setup${c.reset}`);
    console.log(`  ${'─'.repeat(36)}`);
    console.log(`  ${c.dim}This feature uses Ollama (local LLM).${c.reset}`);
    console.log(`  ${c.dim}Install: https://ollama.com  │  Start: ollama serve${c.reset}\n`);

    const existing = config.getBrainstormConfig();
    if (existing && existing.model) {
        const overwrite = await promptInput(`Model "${existing.model}" already configured. Reconfigure? (y/N):`);
        if (overwrite.toLowerCase() !== 'y') {
            console.log(`  ${c.dim}Setup cancelled.${c.reset}\n`);
            return;
        }
    }

    const model = await promptInput('Ollama model name (e.g. llama3, mistral, gemma2):');
    if (!model) {
        console.log(`  ${c.red}✗ Model name is required.${c.reset}\n`);
        return;
    }

    const spinner = createSpinner('Checking Ollama connection...');
    try {
        await ai.verifyOllama(model);
        spinner.stop(`  ${c.green}✓ Ollama connected. Model "${model}" available.${c.reset}`);

        config.saveBrainstormConfig(null, model);

        console.log(`\n  ${c.green}${c.bright}✓ Brainstorm engine configured successfully.${c.reset}`);
        console.log(`  ${c.dim}Model: ${model}  │  Endpoint: http://localhost:11434${c.reset}`);
        console.log(`  Run ${c.yellow}pdtk brainstorm${c.reset} to start a session.\n`);
    } catch (err) {
        spinner.stop(`  ${c.red}✗ Connection failed.${c.reset}`);
        console.log(`  ${c.red}Error: ${err.message}${c.reset}`);
        
        // Still save config so they can use it later after installing Ollama
        const saveAnyway = await promptInput('Save config anyway? You can start Ollama later. (y/N):');
        if (saveAnyway.toLowerCase() === 'y') {
            config.saveBrainstormConfig(null, model);
            console.log(`  ${c.green}✓ Config saved.${c.reset} Start Ollama with: ${c.yellow}ollama serve${c.reset}`);
            console.log(`  Then pull the model: ${c.yellow}ollama pull ${model}${c.reset}\n`);
        } else {
            console.log(`  ${c.dim}Setup cancelled.${c.reset}\n`);
        }
    }
}

/**
 * CLI: List all saved sessions.
 */
function listSessionsCLI() {
    const all = sessions.list();
    renderSessionList(all);
}

/**
 * CLI: Export a session to a file.
 */
function exportSessionCLI(sessionId) {
    if (!sessionId) {
        console.log(`\n  ${c.red}Usage: pdtk brainstorm export <SESSION_ID>${c.reset}\n`);
        return;
    }

    const fileName = `brainstorm-${sessionId}.json`;
    const exportPath = path.join(process.cwd(), fileName);

    const success = sessions.exportToFile(sessionId, exportPath);
    if (success) {
        console.log(`\n  ${c.green}✓ Exported:${c.reset} ${exportPath}\n`);
    } else {
        console.log(`\n  ${c.red}✗ Session not found: ${sessionId}${c.reset}\n`);
    }
}

/**
 * CLI: Import a session from a file.
 */
function importSessionCLI(filePath) {
    if (!filePath) {
        console.log(`\n  ${c.red}Usage: pdtk brainstorm import <FILE_PATH>${c.reset}\n`);
        return;
    }

    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    const imported = sessions.importFromFile(resolved);

    if (imported) {
        console.log(`\n  ${c.green}✓ Imported session:${c.reset} ${imported.session_id}`);
        console.log(`  ${c.dim}Topic: ${imported.topic || 'N/A'}${c.reset}`);
        console.log(`  Load it with: ${c.yellow}pdtk brainstorm load ${imported.session_id}${c.reset}\n`);
    } else {
        console.log(`\n  ${c.red}✗ Import failed. Check file path and JSON format.${c.reset}\n`);
    }
}

module.exports = {
    start,
    setup,
    listSessionsCLI,
    exportSessionCLI,
    importSessionCLI
};
