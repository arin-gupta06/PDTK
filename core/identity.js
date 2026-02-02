/**
 * PDTK Core - Identity Module
 * Detects GitHub identity from local git configuration
 * 
 * SECURITY: 
 * - Only reads git config values (username, email)
 * - Only checks SSH key file existence, never reads contents
 * - No secrets are stored or transmitted
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Execute a git config command safely
 * @param {string} key - Git config key to retrieve
 * @returns {string|null} - Config value or null if not set
 */
function getGitConfig(key) {
    try {
        const result = execSync(`git config --global ${key}`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return result.trim() || null;
    } catch {
        return null;
    }
}

/**
 * Check if SSH keys exist (does NOT read key contents)
 * @returns {object} - SSH detection result
 */
function detectSSHKeys() {
    const sshDir = path.join(os.homedir(), '.ssh');
    const keyFiles = ['id_rsa', 'id_ed25519', 'id_ecdsa', 'id_dsa'];

    const detected = [];

    for (const keyFile of keyFiles) {
        const keyPath = path.join(sshDir, keyFile);
        const pubPath = path.join(sshDir, `${keyFile}.pub`);

        // Only check existence, never read contents
        if (fs.existsSync(keyPath) || fs.existsSync(pubPath)) {
            detected.push(keyFile);
        }
    }

    return {
        hasSSH: detected.length > 0,
        keyTypes: detected
    };
}

/**
 * Detect the full GitHub identity from local configuration
 * @returns {Promise<object>} - Identity object with username, email, authMethod
 */
async function detectGitIdentity() {
    const username = getGitConfig('user.name');
    const email = getGitConfig('user.email');
    const ssh = detectSSHKeys();

    let authMethod = 'Not detected';

    if (ssh.hasSSH) {
        authMethod = `SSH key detected (${ssh.keyTypes.join(', ')})`;
    } else {
        // Check if credential helper is configured
        const credentialHelper = getGitConfig('credential.helper');
        if (credentialHelper) {
            authMethod = `Credential helper: ${credentialHelper}`;
        } else {
            authMethod = 'HTTPS (no credential helper)';
        }
    }

    return {
        username,
        email,
        authMethod,
        sshKeys: ssh.keyTypes,
        detectedAt: new Date().toISOString()
    };
}

module.exports = {
    detectGitIdentity,
    getGitConfig,
    detectSSHKeys
};
