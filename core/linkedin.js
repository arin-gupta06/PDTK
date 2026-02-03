/**
 * PDTK Core - LinkedIn Module
 * Handles LinkedIn OAuth 2.0 and API interactions
 */

const https = require('https');
const http = require('http');
const url = require('url');
const { exec } = require('child_process');

const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES = 'w_member_social openid profile email';

/**
 * Generate LinkedIn Authorization URL
 * @param {string} clientId 
 * @returns {string}
 */
function getAuthUrl(clientId) {
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=PDTK_AUTH&scope=${encodeURIComponent(SCOPES)}`;
}

/**
 * Start a temporary server to catch the redirect code
 * @returns {Promise<string>} - Authorization code
 */
function listenForCode() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            // Use modern URL API (req.url is relative, so we use a dummy base)
            const baseURL = `http://${req.headers.host}`;
            const parsedUrl = new URL(req.url, baseURL);

            // Only handle the callback path
            if (parsedUrl.pathname === '/callback') {
                const code = parsedUrl.searchParams.get('code');
                const error = parsedUrl.searchParams.get('error');
                const errorDescription = parsedUrl.searchParams.get('error_description');

                if (code) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<h1>Authentication Successful!</h1><p>You can close this window now and return to the terminal.</p>');
                    server.close();
                    resolve(code);
                } else if (error) {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end(`<h1>Authentication Failed</h1><p>Error: ${errorDescription || error}</p>`);
                    server.close();
                    reject(new Error(`LinkedIn Error: ${errorDescription || error}`));
                } else {
                    // Ignore other requests on this path if code/error not present
                    res.writeHead(400);
                    res.end('Authentication failed: Invalid request.');
                }
            } else {
                // Ignore requests like favicon.ico
                res.writeHead(404);
                res.end();
            }
        });

        server.listen(3000, () => {
            console.log('Waiting for authentication in your browser...');
        });

        // Set timeout for 2 minutes
        setTimeout(() => {
            server.close();
            reject(new Error('Authentication timed out after 2 minutes'));
        }, 120000);
    });
}

/**
 * Exchange code for access token
 * @param {string} code 
 * @param {string} clientId 
 * @param {string} clientSecret 
 */
function exchangeCodeForToken(code, clientId, clientSecret) {
    return new Promise((resolve, reject) => {
        const postData = `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;

        const options = {
            hostname: 'www.linkedin.com',
            path: '/oauth/v2/accessToken',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode === 200) {
                        resolve(json);
                    } else {
                        reject(new Error(json.error_description || `LinkedIn Token Exchange Error: ${res.statusCode}`));
                    }
                } catch (e) {
                    reject(new Error('Failed to parse token response'));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

/**
 * Fetch LinkedIn Profile (via OpenID Connect)
 * @param {string} token 
 */
function getProfile(token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.linkedin.com',
            path: '/v2/userinfo',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode === 200) {
                        resolve(json);
                    } else {
                        reject(new Error(`LinkedIn Profile Error: ${res.statusCode}`));
                    }
                } catch (e) {
                    reject(new Error('Failed to parse profile response'));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

/**
 * Post to LinkedIn
 * @param {string} token 
 * @param {string} personId (sub from userinfo)
 * @param {string} text 
 */
function createPost(token, personId, text) {
    return new Promise((resolve, reject) => {
        const postBody = JSON.stringify({
            author: `urn:li:person:${personId}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: { text },
                    shareMediaCategory: 'NONE'
                }
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
            }
        });

        const options = {
            hostname: 'api.linkedin.com',
            path: '/v2/ugcPosts',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'Content-Length': Buffer.byteLength(postBody)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 201) {
                    resolve(true);
                } else {
                    try {
                        const json = JSON.parse(data);
                        reject(new Error(json.message || `LinkedIn Post Error: ${res.statusCode}`));
                    } catch (e) {
                        reject(new Error(`LinkedIn Post Error: ${res.statusCode}`));
                    }
                }
            });
        });

        req.on('error', reject);
        req.write(postBody);
        req.end();
    });
}

module.exports = {
    getAuthUrl,
    listenForCode,
    exchangeCodeForToken,
    getProfile,
    createPost
};
