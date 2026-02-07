#!/usr/bin/env node

/**
 * PDTK v1.0 — Personal Development ToolKit
 * CLI Entry Point
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const identity = require('../core/identity');
const config = require('../core/config');
const githubApi = require('../core/github-api');
const linkedin = require('../core/linkedin');

const VERSION = '1.0.0';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

/**
 * Helper to prompt for user input
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${colors.cyan}? ${colors.reset}${question} `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Display PDTK existence confirmation
 */
function showWelcome() {
  console.log(`
${colors.cyan}${colors.bright}🧰 PDTK${colors.reset} v${VERSION} — Personal Development ToolKit
${colors.dim}Status: Active${colors.reset}

Run ${colors.yellow}pdtk verify${colors.reset} to check ${colors.bright}PDTK${colors.reset} sync status.
Run ${colors.yellow}pdtk help${colors.reset} for available commands.
`);
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
${colors.cyan}${colors.bright}PDTK${colors.reset} v${VERSION} — Personal Development ToolKit

${colors.bright}USAGE${colors.reset}
  pdtk <command>

${colors.bright}COMMANDS${colors.reset}
  ${colors.yellow}verify${colors.reset}                 Check GitHub/LinkedIn sync status
  
  ${colors.yellow}github sync${colors.reset}            Link GitHub via Personal Access Token
  ${colors.yellow}github details${colors.reset}         Show GitHub profile, repos, and activity
  
  ${colors.yellow}linkedin sync${colors.reset}          Link LinkedIn via OAuth flow
  ${colors.yellow}linkedin capture${colors.reset}       Capture profile data from Chrome Extension
  ${colors.yellow}linkedin details${colors.reset}       Show LinkedIn profile and about section
  
  ${colors.yellow}help${colors.reset}                   Show this help message

${colors.bright}COMING SOON${colors.reset}
  linkedin post      Post shared content to LinkedIn
  push               Push code to GitHub
  deploy             Deploy to configured platform
`);
}

/**
 * Enhanced Verify Command
 */
async function verifySyncStatus() {
  console.log(`
${colors.cyan}${colors.bright}PDTK Sync Verification${colors.reset}
${'─'.repeat(30)}`);

  const storedIdentity = config.getStoredGitHubIdentity();
  const githubToken = config.getGitHubToken();
  const linkedinInfo = config.getStoredLinkedIn();

  // GitHub Status
  console.log(`\n${colors.bright}GitHub Identity:${colors.reset}`);
  if (storedIdentity) {
    console.log(`  ${colors.green}✓ Linked${colors.reset}`);
    console.log(`  ${colors.bright}Username:${colors.reset} ${storedIdentity.username}`);
    console.log(`  ${colors.bright}Email:${colors.reset}    ${storedIdentity.email}`);
    console.log(`  ${colors.bright}API Access:${colors.reset} ${githubToken ? colors.green + 'Ready' : colors.yellow + 'Not Synced (Run github sync)'}${colors.reset}`);
  } else {
    console.log(`  ${colors.red}✗ Not Linked${colors.reset}`);
  }

  // LinkedIn Status
  console.log(`\n${colors.bright}LinkedIn Identity:${colors.reset}`);
  if (linkedinInfo) {
    console.log(`  ${colors.green}✓ Linked${colors.reset}`);
    console.log(`  ${colors.bright}Name:${colors.reset}     ${linkedinInfo.name}`);
    console.log(`  ${colors.bright}Email:${colors.reset}    ${linkedinInfo.email}`);
    console.log(`  ${colors.bright}Auth Status:${colors.reset} ${colors.green}Authenticated${colors.reset}`);
  } else {
    console.log(`  ${colors.red}✗ Not Linked${colors.reset} (Run linkedin sync)`);
  }

  console.log();
}

/**
 * GitHub Sync Command
 */
async function syncGitHub() {
  console.log(`\n${colors.cyan}${colors.bright}GitHub API Sync${colors.reset}`);
  console.log(`${colors.dim}To fetch repos and details, PDTK needs a Personal Access Token.${colors.reset}`);
  console.log(`${colors.dim}Create one at: https://github.com/settings/tokens (select 'repo' and 'user' scopes)${colors.reset}\n`);

  const token = await prompt('Enter your GitHub Personal Access Token:');

  if (!token) {
    console.log(`${colors.red}✗ Token is required.${colors.reset}`);
    return;
  }

  try {
    process.stdout.write('Verifying token... ');
    const profile = await githubApi.getUserProfile(token);
    console.log(`${colors.green}Success!${colors.reset}`);

    config.saveGitHubToken(token);
    // Also update identity info
    await config.saveGitHubIdentity({
      username: profile.login,
      email: profile.email || 'Not public',
      authMethod: 'Personal Access Token',
      detectedAt: new Date().toISOString()
    });

    console.log(`\n${colors.green}✓ GitHub successfully synced.${colors.reset}`);
    console.log(`  Username: ${profile.login}\n`);
  } catch (error) {
    console.log(`${colors.red}Failed.${colors.reset}`);
    console.error(`  Error: ${error.message}`);
  }
}

/**
 * GitHub Details Command
 */
async function showGitHubDetails() {
  const token = config.getGitHubToken();
  if (!token) {
    console.log(`\n${colors.red}✗ GitHub not synced.${colors.reset} Run ${colors.yellow}pdtk github sync${colors.reset} first.`);
    return;
  }

  try {
    console.log(`\n${colors.cyan}${colors.bright}GitHub Profile Details${colors.reset}`);
    console.log(`${'─'.repeat(30)}`);

    process.stdout.write('Fetching data... ');
    const [profile, repos] = await Promise.all([
      githubApi.getUserProfile(token),
      githubApi.getUserRepos(token)
    ]);
    console.log(`${colors.green}Done!${colors.reset}\n`);

    console.log(`  ${colors.bright}Username:${colors.reset}  ${profile.login}`);
    console.log(`  ${colors.bright}Name:${colors.reset}      ${profile.name || 'N/A'}`);
    console.log(`  ${colors.bright}Bio:${colors.reset}       ${profile.bio || 'N/A'}`);
    console.log(`  ${colors.bright}Repos:${colors.reset}     ${repos.length}`);

    if (repos.length > 0) {
      const recent = repos[0]; // Already sorted by updated
      console.log(`  ${colors.bright}Recent Repo:${colors.reset} ${colors.yellow}${recent.name}${colors.reset} (${new Date(recent.pushed_at).toLocaleDateString()})`);
      console.log(`  ${colors.dim}${recent.html_url}${colors.reset}`);

      console.log(`\n  ${colors.bright}Repositories:${colors.reset}`);
      repos.slice(0, 10).forEach(repo => {
        console.log(`  - ${repo.name} ${colors.dim}(${repo.stargazers_count} ★)${colors.reset}`);
      });
      if (repos.length > 10) console.log(`    ${colors.dim}...and ${repos.length - 10} more${colors.reset}`);
    }
    console.log();
  } catch (error) {
    console.error(`\n${colors.red}✗ Error fetching GitHub details:${colors.reset} ${error.message}`);
  }
}

/**
 * LinkedIn Sync Command
 */
async function syncLinkedIn() {
  console.log(`\n${colors.cyan}${colors.bright}LinkedIn API Sync (OAuth)${colors.reset}`);

  let creds = config.getLinkedInCredentials();

  if (creds) {
    const reset = await prompt('App credentials found. Do you want to re-enter them? (y/N):');
    if (reset.toLowerCase() === 'y') {
      creds = null;
    }
  }

  if (!creds) {
    console.log(`${colors.dim}Enter your LinkedIn Developer App details.${colors.reset}\n`);
    const clientId = await prompt('Client ID:');
    const clientSecret = await prompt('Client Secret:');

    if (!clientId || !clientSecret) {
      console.log(`${colors.red}✗ Both ID and Secret are required.${colors.reset}`);
      return;
    }

    config.saveLinkedInCredentials(clientId, clientSecret);
    creds = { clientId, clientSecret };
  }

  try {
    const authUrl = linkedin.getAuthUrl(creds.clientId);
    console.log(`\n${colors.bright}Action Required:${colors.reset}`);
    console.log(`1. Open this URL in your browser:`);
    console.log(`${colors.blue}${authUrl}${colors.reset}`);
    console.log(`2. Approve the permissions.`);

    // Try to open browser automatically
    const start = (process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open');
    const { exec } = require('child_process');
    exec(`${start} "${authUrl}"`);

    const code = await linkedin.listenForCode();
    process.stdout.write('Exchanging code for token... ');

    const tokenData = await linkedin.exchangeCodeForToken(code, creds.clientId, creds.clientSecret);
    const profile = await linkedin.getProfile(tokenData.access_token);

    console.log(`${colors.green}Success!${colors.reset}`);

    const about = await prompt('Enter your LinkedIn "About" section summary (optional):');
    const projectsRaw = await prompt('Enter your Projects (comma-separated, optional):');
    const skillsRaw = await prompt('Enter your Skills (comma-separated, optional):');

    const projects = projectsRaw ? projectsRaw.split(',').map(p => p.trim()) : [];
    const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()) : [];

    config.saveLinkedInIdentity({
      name: profile.name,
      email: profile.email || '',
      sub: profile.sub,
      about: about || '',
      projects: projects,
      skills: skills,
      accessToken: tokenData.access_token,
      expiry: Date.now() + (tokenData.expires_in * 1000),
      linkedAt: new Date().toISOString()
    });

    console.log(`\n${colors.green}✓ LinkedIn successfully synced.${colors.reset}`);
    console.log(`  Welcome, ${profile.given_name}!\n`);
  } catch (error) {
    console.log(`${colors.red}Failed.${colors.reset}`);
    console.error(`  Error: ${error.message}`);

    if (error.message.includes('authentication failed')) {
      console.log(`\n${colors.yellow}TIP: Your Client Secret might be wrong or have extra spaces.${colors.reset}`);
      const retry = await prompt('Do you want to re-enter credentials and try again? (y/N):');
      if (retry.toLowerCase() === 'y') {
        return await syncLinkedIn();
      }
    }
  }
}

/**
 * LinkedIn Details Command
 */
async function showLinkedInDetails() {
  const info = config.getStoredLinkedIn();
  if (!info) {
    console.log(`\n${colors.red}✗ LinkedIn not synced.${colors.reset} Run ${colors.yellow}pdtk linkedin sync${colors.reset} first.`);
    return;
  }

  console.log(`\n${colors.cyan}${colors.bright}LinkedIn Profile Details${colors.reset}`);
  console.log(`${'─'.repeat(30)}`);
  console.log(`  ${colors.bright}Name:${colors.reset}     ${info.name}`);
  console.log(`  ${colors.bright}Email:${colors.reset}    ${info.email}`);
  console.log(`  ${colors.bright}Status:${colors.reset}   ${colors.green}Connected${colors.reset}`);
  console.log(`\n  ${colors.bright}About Section:${colors.reset}`);
  if (info.about) {
    console.log(`  ${info.about}`);
  } else {
    console.log(`  ${colors.dim}No description provided.${colors.reset}`);
  }

  console.log(`\n  ${colors.bright}Projects:${colors.reset}`);
  if (info.projects && info.projects.length > 0) {
    info.projects.forEach(project => {
      console.log(`  ${colors.yellow}•${colors.reset} ${project.title || project}`);
      if (project.description) console.log(`    ${colors.dim}${project.description}${colors.reset}`);
    });
  } else {
    console.log(`  ${colors.dim}No projects listed.${colors.reset}`);
  }

  console.log(`\n  ${colors.bright}Skills:${colors.reset}`);
  if (info.skills && info.skills.length > 0) {
    console.log(`  ${info.skills.join(' • ')}`);
  } else {
    console.log(`  ${colors.dim}No skills listed.${colors.reset}`);
  }
  console.log();
}

/**
 * LinkedIn Capture Command (Local Server)
 */
async function captureLinkedIn() {
  const http = require('http');

  console.log(`\n${colors.cyan}${colors.bright}LinkedIn Data Capture Mode${colors.reset}`);
  console.log(`${colors.dim}Listening for data from the PDTK Chrome Extension...${colors.reset}\n`);

  const server = http.createServer((req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/pdtk/linkedin/sync') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          console.log(`${colors.green}✓ Data received from extension!${colors.reset}`);

          const currentLinkedIn = config.getStoredLinkedIn() || {};
          config.saveLinkedInIdentity({
            ...currentLinkedIn,
            name: data.name,
            about: data.about,
            projects: data.projects,
            skills: data.skills,
            linkedAt: data.synced_at
          });

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ status: 'success' }));

          console.log(`\n${colors.green}✓ LinkedIn profile successfully updated.${colors.reset}`);
          console.log(`  Name: ${data.name}`);
          console.log(`  Sync completed at: ${new Date().toLocaleTimeString()}\n`);
          console.log(`${colors.dim}Press Ctrl+C to stop the listener.${colors.reset}`);

        } catch (error) {
          console.error(`${colors.red}Error parsing capture data:${colors.reset}`, error.message);
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ status: 'error', message: error.message }));
        }
      });
    } else if (req.method === 'POST' && req.url === '/pdtk/editor/snapshot') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const logPath = path.join(__dirname, '..', 'config', 'editor-snapshots.log');

          const entry = {
            receivedAt: new Date().toISOString(),
            filePath: data.filePath,
            cursor: data.cursor,
            contentLength: data.content ? data.content.length : 0
          };

          fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ status: 'success' }));

          console.log(`\n${colors.green}✓ Editor snapshot received.${colors.reset}`);
          console.log(`  File: ${data.filePath}`);
          console.log(`  Cursor: line ${data.cursor?.line ?? '?'} col ${data.cursor?.character ?? '?'}`);
        } catch (error) {
          console.error(`${colors.red}Error parsing editor snapshot:${colors.reset}`, error.message);
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ status: 'error', message: error.message }));
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(4000, () => {
    console.log(`${colors.yellow}Listener active at http://localhost:4000${colors.reset}`);
    console.log(`${colors.dim}1. Open your LinkedIn profile in Chrome.${colors.reset}`);
    console.log(`${colors.dim}2. Click the 'Sync with PDTK' button (bottom-right).${colors.reset}`);
  });
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  const subCommand = args[1]?.toLowerCase();

  switch (command) {
    case undefined:
    case '':
      showWelcome();
      break;

    case 'verify':
    case 'status':
      await verifySyncStatus();
      break;

    case 'github':
      if (subCommand === 'sync') await syncGitHub();
      else if (subCommand === 'details') await showGitHubDetails();
      else {
        console.log(`\nUsage: ${colors.yellow}pdtk github [sync|details]${colors.reset}`);
      }
      break;

    case 'linkedin':
      if (subCommand === 'sync') await syncLinkedIn();
      else if (subCommand === 'capture') await captureLinkedIn();
      else if (subCommand === 'details') await showLinkedInDetails();
      else {
        console.log(`\nUsage: ${colors.yellow}pdtk linkedin [sync|capture|details]${colors.reset}`);
      }
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    case '--version':
    case '-v':
      console.log(`${colors.bright}PDTK${colors.reset} v${VERSION}`);
      break;

    default:
      console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
      console.log(`Run ${colors.yellow}pdtk help${colors.reset} for available commands.`);
      process.exit(1);
  }
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset} ${error.message}`);
  process.exit(1);
});
