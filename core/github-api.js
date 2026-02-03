/**
 * PDTK Core - GitHub API Module
 * Handles interactions with GitHub REST API
 */

const https = require('https');

/**
 * Make a secure HTTPS request to GitHub API
 * @param {string} endpoint - API endpoint (e.g., '/user')
 * @param {string} token - GitHub Personal Access Token
 * @returns {Promise<object>} - JSON response
 */
function githubFetch(endpoint, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: endpoint,
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'PDTK-CLI-v1.0',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        reject(new Error(json.message || `GitHub API error: ${res.statusCode}`));
                    }
                } catch (e) {
                    reject(new Error('Failed to parse GitHub API response'));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

/**
 * Fetch GitHub user profile
 * @param {string} token 
 */
async function getUserProfile(token) {
    return await githubFetch('/user', token);
}

/**
 * Fetch GitHub user repositories
 * @param {string} token 
 */
async function getUserRepos(token) {
    return await githubFetch('/user/repos?sort=updated&per_page=100', token);
}

module.exports = {
    getUserProfile,
    getUserRepos
};
