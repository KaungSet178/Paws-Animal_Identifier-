const { spawn } = require('child_process');
const path = require('path');
const env = require('../config/env');
const { ApiError } = require('../utils/errors');

function reason(observations, options = {}) {
  const swiplPath = options.swiplPath || env.swiplPath;
  const timeoutMs = options.timeoutMs || env.prologTimeoutMs;
  const projectRoot = options.projectRoot || env.projectRoot;
  const prologFile = options.prologFile || path.join(projectRoot, 'prolog', 'backend_api.pl');
  const payload = JSON.stringify({ observations });

  return new Promise((resolve, reject) => {
    const child = spawn(swiplPath, ['-q', '-s', prologFile], {
      cwd: projectRoot,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      settled = true;
      child.kill();
      reject(new ApiError('PROLOG_TIMEOUT', 'The Prolog reasoning engine timed out.', 502));
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });

    child.on('error', error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new ApiError('PROLOG_EXECUTION_FAILED', 'Unable to start the Prolog reasoning engine.', 502, error.message));
    });

    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        reject(new ApiError('PROLOG_EXECUTION_FAILED', 'The Prolog reasoning engine failed.', 502, stderr.trim()));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (_error) {
        reject(new ApiError('PROLOG_INVALID_RESPONSE', 'The Prolog reasoning engine returned invalid JSON.', 502));
      }
    });

    child.stdin.end(payload);
  });
}

module.exports = {
  reason
};
