#!/usr/bin/env node

/**
 * PDTK v1.0 — Personal Development ToolKit
 * CLI Entry Point
 */

const path = require('path');
const identity = require('../core/identity');
const config = require('../core/config');

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
 * Display PDTK existence confirmation
 */
function showWelcome() {
  console.log(`
${colors.cyan}${colors.bright}🧰 PDTK${colors.reset} v${VERSION} — Personal Development ToolKit
${colors.dim}Status: Active${colors.reset}

Run ${colors.yellow}pdtk verify${colors.reset} to check ${colors.bright}PDTK${colors.reset} GitHub identity.
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
  ${colors.yellow}verify${colors.reset}, ${colors.yellow}status${colors.reset}    Check GitHub identity configuration
  ${colors.yellow}help${colors.reset}              Show this help message

${colors.bright}COMING IN v1.0${colors.reset}
  push              Push code to GitHub
  deploy            Deploy to configured platform
  brainstorm        Get a second opinion on an idea
`);
}

/**
 * Verify and display GitHub identity
 */
async function verifyIdentity() {
  console.log(`
${colors.cyan}${colors.bright}GitHub Identity Verification${colors.reset}
${'─'.repeat(30)}`);

  try {
    const id = await identity.detectGitIdentity();

    // Display detected identity
    console.log(`  ${colors.bright}Username:${colors.reset} ${id.username || colors.dim + 'Not configured' + colors.reset}`);
    console.log(`  ${colors.bright}Email:${colors.reset}    ${id.email || colors.dim + 'Not configured' + colors.reset}`);
    console.log(`  ${colors.bright}Auth:${colors.reset}     ${id.authMethod}`);

    // Save to local config cache
    if (id.username && id.email) {
      await config.saveIdentity(id);
      console.log(`
${colors.green}✓ ${colors.bright}PDTK${colors.reset}${colors.green} GitHub identity successfully linked.${colors.reset}
`);
    } else {
      console.log(`
${colors.yellow}⚠ GitHub identity incomplete. Configure with:${colors.reset}
  git config --global user.name "Your Name"
  git config --global user.email "your@email.com"
`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`
${colors.red}✗ Error detecting GitHub identity:${colors.reset}
  ${error.message}
`);
    process.exit(1);
  }
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  switch (command) {
    case undefined:
    case '':
      showWelcome();
      break;

    case 'verify':
    case 'status':
      await verifyIdentity();
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
