import net from 'net';
import fs from 'fs';
import path from 'path';
import { spawn, exec, execSync } from 'child_process';

// Map to track spawned Tor instances: Port -> ChildProcess
export const spawnedTorProcesses = new Map();

/**
 * Check if Tor SOCKS5 proxy port is active
 */
export function isTorActive(socksPort = 9050) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    
    socket.on('error', onError);
    socket.on('timeout', onError);
    
    socket.connect(socksPort, '127.0.0.1');
  });
}

/**
 * Send a SIGNAL NEWNYM to Tor control port (default 9051) to rotate IP
 */
export function renewTorSession(controlPort = 9051) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2500);

    socket.on('connect', () => {
      // Authenticate with empty password (default configuration)
      socket.write('AUTHENTICATE ""\r\n');
    });

    let authenticated = false;
    socket.on('data', (data) => {
      const response = data.toString().trim();
      if (response.startsWith('250')) {
        if (!authenticated) {
          authenticated = true;
          socket.write('SIGNAL NEWNYM\r\n');
        } else {
          socket.destroy();
          resolve(true); // IP rotation signal accepted successfully
        }
      } else {
        socket.destroy();
        resolve(false); // Authentication or signal error
      }
    });

    const onError = () => {
      socket.destroy();
      resolve(false); // Connection or protocol error
    };

    socket.on('error', onError);
    socket.on('timeout', onError);

    socket.connect(controlPort, '127.0.0.1');
  });
}

/**
 * Dynamically launch Tor instances based on RAM recommendations.
 * Launches Tor on ports that are not already running.
 */
export async function bootstrapTorInstances(neededWorkers, scraperPath, log = console.log) {
  const possiblePorts = [9050, 9052, 9054, 9056, 9058, 9060, 9062, 9064, 9066, 9068, 9070, 9072];
  const portsToActivate = possiblePorts.slice(0, neededWorkers);

  log(`[Tor Bootstrap] Allocation demandée : ${neededWorkers} instances. Analyse des ports : ${portsToActivate.join(', ')}...`);

  const torExe = path.join(scraperPath, 'tor', 'tor', 'tor.exe');
  if (!fs.existsSync(torExe)) {
    log(`[Tor Bootstrap] [Erreur] tor.exe introuvable à l'adresse : ${torExe}. Démarrage manuel requis.`);
    return;
  }

  for (const port of portsToActivate) {
    const active = await isTorActive(port);
    if (active) {
      log(`[Tor Bootstrap] Port ${port} : Déjà actif. Réutilisation de l'instance existante.`);
      continue;
    }

    log(`[Tor Bootstrap] Port ${port} : Inactif. Lancement automatique d'une nouvelle instance Tor...`);
    const tempDir = path.join(process.cwd(), `temp_tor_data_${port}`);
    
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const child = spawn(torExe, [
        '--SocksPort', String(port),
        '--ControlPort', String(port + 1),
        '--CookieAuthentication', '0',
        '--DataDirectory', tempDir
      ], {
        windowsHide: true
      });

      spawnedTorProcesses.set(port, child);

      // Wait for Tor to bootstrap and listen on the port (timeout 10s)
      let bootstrapSuccessful = false;
      for (let poll = 0; poll < 40; poll++) {
        await new Promise(r => setTimeout(r, 250));
        const isUp = await isTorActive(port);
        if (isUp) {
          bootstrapSuccessful = true;
          break;
        }
      }

      if (bootstrapSuccessful) {
        log(`[Tor Bootstrap] Port ${port} : ✓ Instance Tor lancée et opérationnelle avec succès (Contrôle: ${port + 1}).`);
      } else {
        log(`[Tor Bootstrap] Port ${port} : [Erreur] Échec de l'initialisation dans le délai imparti. Fermeture.`);
        try {
          if (process.platform === 'win32') {
            execSync(`taskkill /pid ${child.pid} /T /F`);
          } else {
            child.kill();
          }
        } catch (e) {}
        spawnedTorProcesses.delete(port);
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
      }
    } catch (err) {
      log(`[Tor Bootstrap] Port ${port} : [Erreur] Erreur lors du lancement : ${err.message}`);
    }
  }
}

/**
 * Terminate all dynamically spawned Tor instances and clean up directories
 */
export async function cleanupSpawnedTor(log = console.log) {
  if (spawnedTorProcesses.size === 0) return;

  log(`[Tor Cleanup] Fermeture propre de ${spawnedTorProcesses.size} instances Tor dynamiques...`);

  for (const [port, child] of spawnedTorProcesses.entries()) {
    try {
      log(`[Tor Cleanup] Port ${port} : Arrêt du processus enfant (PID: ${child.pid})...`);
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${child.pid} /T /F`);
      } else {
        child.kill();
      }
    } catch (e) {
      try { child.kill(); } catch (err) {}
    }

    const tempDir = path.join(process.cwd(), `temp_tor_data_${port}`);
    await new Promise(r => setTimeout(r, 300));
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      setTimeout(() => {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (err) {}
      }, 1000);
    }
  }

  spawnedTorProcesses.clear();
  log(`[Tor Cleanup] ✓ Toutes les instances Tor dynamiques ont été libérées.`);
}

/**
 * Synchronous cleanup for process exit events to avoid zombie processes
 */
export function cleanupSpawnedTorSync() {
  if (spawnedTorProcesses.size === 0) return;
  console.log(`[Tor Cleanup Sync] Arrêt forcé de sécurité pour ${spawnedTorProcesses.size} instances Tor avant arrêt serveur...`);

  for (const [port, child] of spawnedTorProcesses.entries()) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
      } else {
        process.kill(child.pid, 'SIGKILL');
      }
    } catch (e) {}

    const tempDir = path.join(process.cwd(), `temp_tor_data_${port}`);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
  spawnedTorProcesses.clear();
}

// Register process hooks to prevent zombie Tor processes
process.on('exit', () => {
  cleanupSpawnedTorSync();
});
process.on('SIGINT', () => {
  cleanupSpawnedTorSync();
  process.exit();
});
process.on('SIGTERM', () => {
  cleanupSpawnedTorSync();
  process.exit();
});
process.on('uncaughtException', (err) => {
  cleanupSpawnedTorSync();
  console.error('[Uncaught Exception Tor Cleanup]', err);
  process.exit(1);
});
