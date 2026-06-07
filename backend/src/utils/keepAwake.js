import { spawn } from 'child_process';
import { dbGet } from '../db/database.js';

let activeTasksCount = 0;
let psProcess = null;
let keepAwakeState = false; // Is system active keep-awake engaged?

/**
 * Starts the background PowerShell keep-awake process
 */
export function startKeepAwake() {
  if (process.platform !== 'win32') return;
  if (psProcess) return;

  console.log('[Predictix Keep-Awake] Engaging Windows system keep-awake locking...');

  // C# code to call SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
  // ES_SYSTEM_REQUIRED (0x00000001) keeps CPU awake.
  // ES_CONTINUOUS (0x80000000) keeps it persistent until next call.
  // This allows the monitor to sleep normally but keeps CPU alive.
  const psScript = `
    $code = @'
    using System;
    using System.Runtime.InteropServices;
    public class KeepAwake {
        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        public static extern uint SetThreadExecutionState(uint esFlags);
        public const uint ES_CONTINUOUS = 0x80000000;
        public const uint ES_SYSTEM_REQUIRED = 0x00000001;
    }
    '@
    Add-Type -TypeDefinition $code
    Write-Output "Predictix Keep-Awake Daemon Started"
    while ($true) {
        [KeepAwake]::SetThreadExecutionState([KeepAwake]::ES_CONTINUOUS -bor [KeepAwake]::ES_SYSTEM_REQUIRED)
        Start-Sleep -Seconds 30
    }
  `;

  try {
    psProcess = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', psScript]);
    keepAwakeState = true;

    psProcess.stdout?.on('data', (data) => {
      console.log(`[Predictix Keep-Awake Daemon]: ${data.toString().trim()}`);
    });

    psProcess.on('close', (code) => {
      console.log(`[Predictix Keep-Awake Daemon] Stopped (Exit code: ${code})`);
      psProcess = null;
      keepAwakeState = false;
    });

    psProcess.on('error', (err) => {
      console.error('[Predictix Keep-Awake Daemon] Error:', err);
    });
  } catch (err) {
    console.error('[Predictix Keep-Awake] Failed to spawn PowerShell keep-awake daemon:', err);
  }
}

/**
 * Stops the background PowerShell keep-awake process
 */
export function stopKeepAwake() {
  if (!psProcess) return;
  console.log('[Predictix Keep-Awake] Releasing Windows system keep-awake locking...');
  try {
    psProcess.kill();
    psProcess = null;
    keepAwakeState = false;
  } catch (err) {
    console.error('[Predictix Keep-Awake] Failed to kill PowerShell daemon:', err);
  }
}

/**
 * Re-evaluates Keep-Awake status based on DB settings and active tasks
 */
export async function reevaluateKeepAwake() {
  try {
    const row = await dbGet("SELECT value FROM settings WHERE key = 'keep_awake_mode'");
    const mode = row ? row.value : 'active_only';

    if (mode === 'always') {
      startKeepAwake();
    } else if (mode === 'disabled') {
      stopKeepAwake();
    } else if (mode === 'active_only') {
      if (activeTasksCount > 0) {
        startKeepAwake();
      } else {
        stopKeepAwake();
      }
    }
  } catch (err) {
    console.error('[Predictix Keep-Awake] Error reevaluating status:', err);
  }
}

/**
 * Called by scrapers/cron jobs when starting or finishing tasks
 * @param {boolean} isStarting - True if a task starts, false if it finishes
 */
export async function updateKeepAwakeStatus(isStarting) {
  if (isStarting) {
    activeTasksCount++;
  } else {
    activeTasksCount = Math.max(0, activeTasksCount - 1);
  }

  await reevaluateKeepAwake();
}

/**
 * Checks if the system keep-awake is active
 * @returns {boolean}
 */
export function isKeepAwakeActive() {
  return keepAwakeState;
}

// Clean up processes on exit
process.on('exit', () => {
  stopKeepAwake();
});
process.on('SIGINT', () => {
  stopKeepAwake();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stopKeepAwake();
  process.exit(0);
});
