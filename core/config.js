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

module.exports = {
    loadConfig,
    saveConfig,
    saveIdentity,
    getStoredIdentity,
    CONFIG_FILE
};
