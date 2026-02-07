const vscode = require('vscode');
const minimatch = require('minimatch');
const http = require('http');
const https = require('https');
const { URL } = require('url');

function matchIgnore(filePath, workspaceFolder, ignoreGlobs) {
  const rel = workspaceFolder
    ? vscode.workspace.asRelativePath(filePath, false)
    : filePath;
  for (const pattern of ignoreGlobs) {
    if (minimatch(rel, pattern, { dot: true, nocase: true })) {
      return pattern;
    }
  }
  return null;
}

function postJson(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(endpoint);
    const isHttps = urlObj.protocol === 'https:';
    const body = Buffer.from(JSON.stringify(payload));

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length
      }
    };

    const req = (isHttps ? https : http).request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`PDTK snapshot failed with status ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sendSnapshot() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor to capture.');
    return;
  }

  const doc = editor.document;
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
  const config = vscode.workspace.getConfiguration('pdtkLink');
  const ignoreGlobs = config.get('ignoreGlobs') || [];
  const endpoint = config.get('endpoint') || 'http://localhost:4000/pdtk/editor/snapshot';

  const ignoredBy = matchIgnore(doc.fileName, workspaceFolder, ignoreGlobs);
  if (ignoredBy) {
    vscode.window.showInformationMessage(`PDTK snapshot skipped (ignored by pattern: ${ignoredBy}).`);
    return;
  }

  const cursor = editor.selection.active;
  const payload = {
    filePath: doc.fileName,
    cursor: { line: cursor.line + 1, character: cursor.character + 1 },
    content: doc.getText()
  };

  try {
    await postJson(endpoint, payload);
    vscode.window.showInformationMessage('PDTK snapshot sent.');
  } catch (err) {
    vscode.window.showErrorMessage(`PDTK snapshot failed: ${err.message}`);
  }
}

function activate(context) {
  const disposable = vscode.commands.registerCommand('pdtk.sendSnapshot', sendSnapshot);
  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
