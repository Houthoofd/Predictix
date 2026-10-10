import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import {
  isWindows,
  exeName,
  getCrawlerExecutablePath,
  createTempOutputFile,
  cleanupFiles,
  buildCrawlerArgs,
  buildSingleMatchArgs,
  formatCrawlerSpawnOptions,
  isCrawlerBuildNeeded
} from './crawlerArgs.js';

export {
  isWindows,
  exeName,
  getCrawlerExecutablePath,
  createTempOutputFile,
  cleanupFiles,
  buildCrawlerArgs,
  buildSingleMatchArgs,
  formatCrawlerSpawnOptions,
  isCrawlerBuildNeeded
};

/**
 * Kill a process and its child process tree safely
 */
export function killProcessTree(child) {
  if (!child?.pid) return;
  try {
    if (isWindows) {
      exec(`taskkill /pid ${child.pid} /T /F`, (err) => {
        if (err) console.error('Failed to taskkill timed-out child process tree:', err.message);
      });
    } else {
      child.kill();
    }
  } catch (err) {
    try { child.kill(); } catch (e) {}
  }
}

/**
 * Low-level execution of a crawler command with timeout guard, stream handling, and exit code verification
 */
export async function executeCrawlerCommand({
  scraperPath,
  args,
  tmpOutFile,
  timeoutMs = 50000,
  onSpawn = null,
  logPrefix = 'Predictix Scraper',
  streamStdout = false,
  streamStderr = false,
  extraCleanupFiles = []
}) {
  return new Promise((resolve) => {
    let resolved = false;
    const exePath = getCrawlerExecutablePath(scraperPath);
    const child = spawn(exePath, args, { windowsHide: true });

    if (onSpawn && typeof onSpawn === 'function') onSpawn(child);
    if (streamStdout && child.stdout) child.stdout.on('data', (d) => process.stdout.write(`[${logPrefix}] ${d}`));
    if (streamStderr && child.stderr) child.stderr.on('data', (d) => process.stderr.write(`[${logPrefix} Err] ${d}`));

    const cleanup = () => cleanupFiles(tmpOutFile, ...extraCleanupFiles);

    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      console.warn(`[${logPrefix}] Scraper process timed out (${Math.round(timeoutMs / 1000)}s). Terminating.`);
      killProcessTree(child);
      cleanup();
      resolve({ success: false, timedOut: true, data: null });
    }, timeoutMs);

    child.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      console.error(`[${logPrefix}] Failed to spawn scraper process:`, err.message);
      cleanup();
      resolve({ success: false, error: err, data: null });
    });

    child.on('close', (code) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      if (code === 0 && tmpOutFile && fs.existsSync(tmpOutFile)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(tmpOutFile, 'utf-8'));
          cleanup();
          resolve({ success: true, code: 0, data: parsed });
        } catch (e) {
          console.error(`[${logPrefix}] Failed to parse scraper output JSON:`, e);
          cleanup();
          resolve({ success: false, code, error: e, data: null });
        }
      } else {
        cleanup();
        resolve({ success: false, code, data: null });
      }
    });
  });
}

/**
 * Spawns the predictix-crawler Go executable with provided args and options.
 */
export function spawnCrawlerProcess(args, options = {}) {
  const { exePath, spawnOpts, onSpawn, sendEvent } = formatCrawlerSpawnOptions(options);
  const child = spawn(exePath, args, spawnOpts);

  if (sendEvent && typeof sendEvent === 'function') attachCrawlerEventListener(child, sendEvent);
  if (onSpawn && typeof onSpawn === 'function') onSpawn(child);
  return child;
}

/**
 * Attaches a stdout listener to crawler process to detect structured [EVENT] JSON lines
 */
export function attachCrawlerEventListener(child, sendEvent) {
  if (!child?.stdout || typeof sendEvent !== 'function') return;

  let buffer = '';
  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    for (const line of lines) processCrawlerOutputLine(line, sendEvent);
  });

  child.stdout.on('end', () => {
    if (buffer && buffer.trim()) {
      processCrawlerOutputLine(buffer, sendEvent);
      buffer = '';
    }
  });
}

/**
 * Parses and processes a single line of stdout from the crawler process.
 */
export function processCrawlerOutputLine(line, sendEvent) {
  if (typeof line !== 'string' || typeof sendEvent !== 'function') return;
  const trimmed = line.trim();
  if (!trimmed.startsWith('[EVENT] ')) return;

  try {
    const parsed = JSON.parse(trimmed.slice(8).trim());
    const eventType = parsed.event || parsed.type;
    if (!eventType) return;

    let payload = parsed.payload;
    if (typeof payload !== 'object' || payload === null) payload = { value: payload };

    if (eventType === 'error') {
      sendEvent('error', { ...payload, message: payload.error || payload.message || 'Crawler error' });
    } else {
      sendEvent(eventType, payload);
    }
  } catch (err) {}
}

/**
 * Automatically compile predictix-crawler if missing (only in development)
 */
export function ensureScraperCompiled(scraperPath) {
  return new Promise((resolve, reject) => {
    const exePath = getCrawlerExecutablePath(scraperPath);
    const goDir = path.join(scraperPath, 'cmd', 'predictix-crawler');

    if (!isCrawlerBuildNeeded(scraperPath, exePath)) return resolve();

    if (process.env.NODE_ENV === 'production') {
      const msg = `[Predictix Crawler] Precompiled binary not found at ${exePath} for production mode.`;
      console.error(msg);
      return reject(new Error(msg));
    }

    console.log(`[Predictix Crawler] Executable not found or outdated. Compiling at: ${scraperPath}`);
    exec(`go build -o ${exeName} main.go`, { cwd: goDir }, (err, stdout, stderr) => {
      if (err) {
        console.error('[Predictix Crawler] Compilation failed:', stderr || err.message);
        return reject(new Error(`Failed to compile predictix-crawler: ${stderr || err.message}`));
      }
      console.log('[Predictix Crawler] ✓ Consolidated crawler compiled successfully!');
      resolve();
    });
  });
}
