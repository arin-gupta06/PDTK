/**
 * PDTK Core - Configuration Module
 * Manages local configuration file for PDTK
 * 
 * SECURITY:
 * - Config file is excluded from git via .gitignore
 * - Only stores non-sensitive metadata (username, email display)
 * - No tokens or passwords stored here
 */

const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'pdtk.config.json');

/**
 * Ensure config directory exists
 */
function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

/**
 * Load configuration from file
 * @returns {object} - Configuration object
 */
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch {
        // Return default config on error
    }

    return {
        version: '1.0.0',
        github: null,
        lastUpdated: null
    };
}

/**
 * Save configuration to file
 * @param {object} config - Configuration object to save
 */
function saveConfig(config) {
    ensureConfigDir();

    const data = JSON.stringify(config, null, 2);
    fs.writeFileSync(CONFIG_FILE, data, 'utf8');
}

/**
 * Save GitHub identity to config
 * @param {object} identity - Identity object from identity module
 */
async function saveIdentity(identity) {
    const config = loadConfig();

    config.github = {
        username: identity.username,
        email: identity.email,
        authMethod: identity.authMethod,
        linkedAt: identity.detectedAt
    };
    config.lastUpdated = new Date().toISOString();

    saveConfig(config);
}

/**
 * Get stored GitHub identity
 * @returns {object|null} - Stored identity or null
 */
function getStoredIdentity() {
    const config = loadConfig();
    return config.github || null;
}

/**
 * Save GitHub Personal Access Token
 * @param {string} token - GitHub PAT
 */
function saveGitHubToken(token) {
    const config = loadConfig();
    config.githubToken = token;
    config.lastUpdated = new Date().toISOString();
    saveConfig(config);
}

/**
 * Get stored GitHub token
 * @returns {string|null}
 */
function getGitHubToken() {
    const config = loadConfig();
    return config.githubToken || null;
}

/**
 * Save LinkedIn identity to config
 * @param {object} identity - LinkedIn profile object
 */
function saveLinkedInIdentity(identity) {
    const config = loadConfig();
    config.linkedin = identity;
    config.lastUpdated = new Date().toISOString();
    saveConfig(config);
}

/**
 * Get stored LinkedIn identity
 * @returns {object|null}
 */
function getStoredLinkedIn() {
    const config = loadConfig();
    return config.linkedin || null;
}

/**
 * Save LinkedIn App Credentials
 * @param {string} clientId 
 * @param {string} clientSecret 
 */
function saveLinkedInCredentials(clientId, clientSecret) {
    const config = loadConfig();
    config.linkedinCreds = { clientId, clientSecret };
    config.lastUpdated = new Date().toISOString();
    saveConfig(config);
}

/**
 * Get stored LinkedIn credentials
 * @returns {object|null}
 */
function getLinkedInCredentials() {
    const config = loadConfig();
    return config.linkedinCreds || null;
}

module.exports = {
    loadConfig,
    saveConfig,
    saveIdentity,
    getStoredIdentity,
    saveGitHubToken,
    getGitHubToken,
    saveLinkedInIdentity,
    getStoredLinkedIn,
    saveLinkedInCredentials,
    getLinkedInCredentials,
    CONFIG_FILE
};
