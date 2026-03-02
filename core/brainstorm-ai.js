/**
 * PDTK Core - Brainstorm AI Module
 * Handles Ollama (local LLM) integration for structured brainstorming output.
 * All responses are requested in JSON format for reliable parsing.
 * Ollama runs locally at http://localhost:11434
 */

const http = require('http');

// ─── System Prompts ──────────────────────────────────────────────

const SYSTEM_PROMPTS = {
    brainstorm: `You are PDTK Brainstorm Engine — a structured ideation assistant for software developers.

RULES:
- Be analytical, precise, and developer-focused
- Never use filler or conversational language
- Always provide TWO distinct, meaningfully different solution paths
- Focus on technical feasibility, trade-offs, and actionable steps
- Keep each field concise but meaningful

Respond ONLY in this exact JSON format:
{
  "problem_understanding": "Clear single-paragraph restatement of the core problem",
  "assumptions": ["assumption 1", "assumption 2", "assumption 3"],
  "primary_option": {
    "title": "Descriptive title for Option 1",
    "approach": "Detailed approach description (2-3 sentences)",
    "steps": ["step 1", "step 2", "step 3", "step 4"],
    "pros": ["advantage 1", "advantage 2"],
    "cons": ["disadvantage 1", "disadvantage 2"]
  },
  "secondary_option": {
    "title": "Descriptive title for Option 2",
    "approach": "Detailed alternative approach (2-3 sentences)",
    "steps": ["step 1", "step 2", "step 3", "step 4"],
    "pros": ["advantage 1", "advantage 2"],
    "cons": ["disadvantage 1", "disadvantage 2"]
  },
  "hybrid_possibility": "How both options could merge (1-2 sentences), or null if not applicable",
  "risk_analysis": ["risk with brief impact note", "risk with brief impact note"],
  "complexity_estimate": {
    "option_1": "Low|Medium|High",
    "option_2": "Low|Medium|High",
    "reasoning": "Brief explanation of complexity factors"
  },
  "recommendation": "Clear recommendation with 1-2 sentence justification"
}`,

    expand: `You are PDTK Brainstorm Engine. Expand the specified section with deep technical detail.

Respond ONLY in this exact JSON format:
{
  "section": "Name of section being expanded",
  "detailed_analysis": "In-depth 3-5 sentence analysis",
  "implementation_steps": ["detailed step 1", "detailed step 2", "detailed step 3", "detailed step 4", "detailed step 5"],
  "technical_considerations": ["consideration 1", "consideration 2", "consideration 3"],
  "estimated_effort": "Time estimate with reasoning",
  "dependencies": ["dependency 1", "dependency 2"],
  "quick_wins": ["actionable quick win 1", "actionable quick win 2"]
}`,

    refine: `You are PDTK Brainstorm Engine. Refine and improve the specified idea with sharper focus.

Respond ONLY in this exact JSON format:
{
  "original_idea": "Brief restatement of the original",
  "refined_version": "Improved, clearer version of the idea (2-3 sentences)",
  "key_improvements": ["improvement 1", "improvement 2"],
  "implementation_priority": "High|Medium|Low",
  "next_steps": ["concrete next step 1", "concrete next step 2", "concrete next step 3"],
  "potential_blockers": ["blocker 1", "blocker 2"]
}`,

    compare: `You are PDTK Brainstorm Engine. Analytically compare the two specified options.

Respond ONLY in this exact JSON format:
{
  "option_a": {
    "name": "Option A name",
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "best_for": "Scenario where this option excels"
  },
  "option_b": {
    "name": "Option B name",
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "best_for": "Scenario where this option excels"
  },
  "risk_comparison": "Which carries more risk and why (1-2 sentences)",
  "complexity_comparison": "Which is more complex and why (1-2 sentences)",
  "verdict": "Clear recommendation with justification (2-3 sentences)"
}`,

    chat: `You are PDTK Brainstorm Engine — a sharp, developer-focused assistant.
Answer the user's message clearly and directly. No filler, no repetition.
Keep responses concise. If the topic deserves deep structured analysis, say so.
Do NOT repeat the user's question back. Just answer it.`,

    option_expand: `You are PDTK Brainstorm Engine. The user has chosen to explore a specific option in depth. Provide a complete implementation breakdown.

Respond ONLY in this exact JSON format:
{
  "chosen_option": "Name of the chosen option",
  "detailed_approach": "Comprehensive 3-5 sentence description of the approach",
  "architecture": "High-level architecture or structure description",
  "implementation_phases": [
    {"phase": "Phase 1 name", "tasks": ["task 1", "task 2"], "estimate": "time estimate"},
    {"phase": "Phase 2 name", "tasks": ["task 1", "task 2"], "estimate": "time estimate"},
    {"phase": "Phase 3 name", "tasks": ["task 1", "task 2"], "estimate": "time estimate"}
  ],
  "tech_stack_suggestions": ["tech 1", "tech 2", "tech 3"],
  "mvp_scope": "What the minimum viable version looks like (2-3 sentences)",
  "risks": ["specific risk 1", "specific risk 2"],
  "action_items": ["immediate action 1", "immediate action 2", "immediate action 3"]
}`
};

// ─── Ollama API Caller ───────────────────────────────────────────

const OLLAMA_HOST = 'localhost';
const OLLAMA_PORT = 11434;

/**
 * Structured JSON call to Ollama — used for brainstorm/expand/refine/compare.
 */
function callOllama(messages, _unused, model) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: model || 'mistral',
            messages,
            stream: false,
            format: 'json'
        });

        _ollamaRequest(body, resolve, reject);
    });
}

/**
 * Plain-text call to Ollama — used for free-form chat.
 * Does NOT use format:'json' so the model responds naturally.
 */
function callOllamaRaw(messages, _unused, model) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: model || 'mistral',
            messages,
            stream: false
        });

        const options = {
            hostname: OLLAMA_HOST,
            port: OLLAMA_PORT,
            path: '/api/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json.message?.content?.trim() || '');
                    } else {
                        reject(new Error(json.error || `Ollama API Error: ${res.statusCode}`));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse Ollama response: ${e.message}`));
                }
            });
        });

        req.on('error', (e) => {
            if (e.code === 'ECONNREFUSED') {
                reject(new Error('Ollama is not running. Start it with: ollama serve'));
            } else {
                reject(new Error(`Network error: ${e.message}`));
            }
        });
        req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error('Request timed out (120s).'));
        });
        req.write(body);
        req.end();
    });
}

/**
 * Shared HTTP request handler for structured (JSON) Ollama calls.
 */
function _ollamaRequest(body, resolve, reject) {
    const options = {
        hostname: OLLAMA_HOST,
        port: OLLAMA_PORT,
        path: '/api/chat',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const content = json.message?.content || '';
                    try {
                        resolve(JSON.parse(content));
                    } catch {
                        const jsonMatch = content.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            resolve(JSON.parse(jsonMatch[0]));
                        } else {
                            reject(new Error('AI returned an invalid JSON structure. Try a different model or rephrase.'));
                        }
                    }
                } else {
                    const errMsg = json.error || `Ollama API Error: ${res.statusCode}`;
                    reject(new Error(errMsg));
                }
            } catch (e) {
                reject(new Error(`Failed to parse Ollama response: ${e.message}`));
            }
        });
    });

    req.on('error', (e) => {
        if (e.code === 'ECONNREFUSED') {
            reject(new Error('Ollama is not running. Start it with: ollama serve'));
        } else {
            reject(new Error(`Network error: ${e.message}`));
        }
    });
    req.setTimeout(120000, () => {
        req.destroy();
        reject(new Error('Request timed out (120s). Model may be too large or still loading.'));
    });
    req.write(body);
    req.end();
}

// ─── Context Builder ─────────────────────────────────────────────

/**
 * Build context messages from session interaction history.
 * Includes up to the last 6 interactions to stay within token limits.
 */
function buildContext(session) {
    if (!session || !session.interactions || session.interactions.length === 0) return [];

    const msgs = [];
    const recent = session.interactions.slice(-6);
    for (const interaction of recent) {
        msgs.push({ role: 'user', content: `[Previous ${interaction.type}]: ${interaction.input}` });
        msgs.push({ role: 'assistant', content: JSON.stringify(interaction.output) });
    }
    return msgs;
}

// ─── Public AI Functions ─────────────────────────────────────────

/**
 * Generate a structured brainstorm analysis for a topic.
 */
async function brainstorm(topic, session, apiKey, model) {
    const messages = [
        { role: 'system', content: SYSTEM_PROMPTS.brainstorm },
        ...buildContext(session),
        { role: 'user', content: `Brainstorm: ${topic}` }
    ];
    return await callOllama(messages, apiKey, model);
}

/**
 * Deep-expand a specific section from the brainstorm.
 */
async function expand(section, session, apiKey, model) {
    const messages = [
        { role: 'system', content: SYSTEM_PROMPTS.expand },
        ...buildContext(session),
        { role: 'user', content: `Expand this section in detail: ${section}` }
    ];
    return await callOllama(messages, apiKey, model);
}

/**
 * Refine and improve a specific idea.
 */
async function refine(idea, session, apiKey, model) {
    const messages = [
        { role: 'system', content: SYSTEM_PROMPTS.refine },
        ...buildContext(session),
        { role: 'user', content: `Refine this idea: ${idea}` }
    ];
    return await callOllama(messages, apiKey, model);
}

/**
 * Analytically compare two options.
 */
async function compare(optionA, optionB, session, apiKey, model) {
    const messages = [
        { role: 'system', content: SYSTEM_PROMPTS.compare },
        ...buildContext(session),
        { role: 'user', content: `Compare Option A: "${optionA}" vs Option B: "${optionB}"` }
    ];
    return await callOllama(messages, apiKey, model);
}

/**
 * Deep-expand a chosen option (1 or 2) with full implementation plan.
 */
async function expandOption(optionNum, session, apiKey, model) {
    const option = optionNum === 1 ? session.primary_option : session.secondary_option;
    if (!option) {
        throw new Error(`Option ${optionNum} not available. Run /brainstorm first.`);
    }

    const messages = [
        { role: 'system', content: SYSTEM_PROMPTS.option_expand },
        ...buildContext(session),
        { role: 'user', content: `I choose Option ${optionNum}: "${option.title}". Expand it fully.\n\nOption details: ${JSON.stringify(option)}` }
    ];
    return await callOllama(messages, apiKey, model);
}

/**
 * Free-form chat — handles any natural language message.
 * Uses plain-text (no JSON format) so the model responds naturally.
 * Only passes a brief topic summary as context, not full brainstorm blobs.
 */
async function chat(message, session, apiKey, model) {
    const messages = [
        { role: 'system', content: SYSTEM_PROMPTS.chat }
    ];

    // Add brief session context if a topic exists — no JSON blobs
    if (session && session.topic) {
        messages.push({
            role: 'system',
            content: `Current brainstorm topic: "${session.topic}". ` +
                     `Chosen path: ${session.chosen_path || 'none yet'}.`
        });
    }

    messages.push({ role: 'user', content: message });

    return await callOllamaRaw(messages, apiKey, model);
}

/**
 * Verify Ollama is running and the model is available.
 * @param {string} model - Model name to check
 * @returns {Promise<boolean>}
 */
function verifyOllama(model) {
    return new Promise((resolve, reject) => {
        // First check if Ollama is running
        const req = http.request({
            hostname: OLLAMA_HOST,
            port: OLLAMA_PORT,
            path: '/api/tags',
            method: 'GET'
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const json = JSON.parse(data);
                        const models = (json.models || []).map(m => m.name.split(':')[0]);
                        if (models.includes(model)) {
                            resolve(true);
                        } else {
                            reject(new Error(
                                `Model "${model}" not found. Available: ${models.join(', ') || 'none'}\n` +
                                `  Pull it with: ollama pull ${model}`
                            ));
                        }
                    } catch {
                        // Ollama is running but couldn't parse models — that's OK
                        resolve(true);
                    }
                } else {
                    reject(new Error(`Ollama responded with status ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => {
            if (e.code === 'ECONNREFUSED') {
                reject(new Error('Ollama is not running. Start it with: ollama serve'));
            } else {
                reject(new Error(`Connection error: ${e.message}`));
            }
        });
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Connection to Ollama timed out.'));
        });
        req.end();
    });
}

module.exports = {
    brainstorm,
    expand,
    refine,
    compare,
    expandOption,
    chat,
    verifyOllama
};
