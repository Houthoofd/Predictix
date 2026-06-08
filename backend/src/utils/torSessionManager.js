import net from 'net';
import fs from 'fs';
import path from 'path';
import { spawn, exec, execSync } from 'child_process';

export const spawnedTorProcesses = new Map();

export function isTorActive(socksPort = 9050) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    const onError = () => { socket.destroy(); resolve(false); };
    socket.on('error', onError);
    socket.on('timeout', onError);
    socket.connect(socksPort, '127.0.0.1');
  });
}

let torRotationIndex = 0;

export async function getActiveTorPorts() {
  const possiblePorts = [9050, 9052, 9054, 9056, 9058, 9060, 9062, 9064, 9066, 9068, 9070, 9072];
  const checks = await Promise.all(possiblePorts.map(async (port) => (await isTorActive(port)) ? port : null));
  return checks.filter(Boolean);
}

export async function getTorPortFromPool() {
  const activePorts = await getActiveTorPorts();
  if (activePorts.length === 0) return null;
  const port = activePorts[torRotationIndex % activePorts.length];
  torRotationIndex = (torRotationIndex + 1) % 1000000;
  return port;
}

export function renewTorSession(controlPort = 9051) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2500);
    socket.on('connect', () => socket.write('AUTHENTICATE ""\r\n'));
    let authenticated = false;
    socket.on('data', (data) => {
      const response = data.toString().trim();
      if (response.startsWith('250')) {
        if (!authenticated) { authenticated = true; socket.write('SIGNAL NEWNYM\r\n'); }
        else { socket.destroy(); resolve(true); }
      } else { socket.destroy(); resolve(false); }
    });
    const onError = () => { socket.destroy(); resolve(false); };
    socket.on('error', onError);
    socket.on('timeout', onError);
    socket.connect(controlPort, '127.0.0.1');
  });
}

export async function bootstrapTorInstances(neededWorkers, scraperPath, log = console.log) {
  const possiblePorts = [9050, 9052, 9054, 9056, 9058, 9060, 9062, 9064, 9066, 9068, 9070, 9072];
  const portsToActivate = possiblePorts.slice(0, neededWorkers);
  log(`[Tor Bootstrap] Allocation demandée : ${neededWorkers} instances. Analyse des ports : ${portsToActivate.join(', ')}...`);
  const torBinName = process.platform === 'win32' ? 'tor.exe' : 'tor';
  const torExe = path.join(scraperPath, 'tor', 'tor', torBinName);
  if (!fs.existsSync(torExe)) {
    log(`[Tor Bootstrap] [Erreur] ${torBinName} introuvable à l'adresse : ${torExe}. Démarrage manuel requis.`);
    return;
  }
  for (const port of portsToActivate) {
    if (await isTorActive(port)) {
      log(`[Tor Bootstrap] Port ${port} : Déjà actif. Réutilisation de l'instance.`);
      continue;
    }
    log(`[Tor Bootstrap] Port ${port} : Inactif. Lancement automatique...`);
    const tempDir = path.join(process.cwd(), `temp_tor_data_${port}`);
    try {
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const child = spawn(torExe, ['--SocksPort', String(port), '--ControlPort', String(port + 1), '--CookieAuthentication', '0', '--DataDirectory', tempDir], { windowsHide: true });
      spawnedTorProcesses.set(port, child);
      let bootstrapSuccessful = false;
      for (let poll = 0; poll < 40; poll++) {
        await new Promise(r => setTimeout(r, 250));
        if (await isTorActive(port)) { bootstrapSuccessful = true; break; }
      }
      if (bootstrapSuccessful) log(`[Tor Bootstrap] Port ${port} : ✓ Instance Tor lancée (Contrôle: ${port + 1}).`);
      else {
        log(`[Tor Bootstrap] Port ${port} : [Erreur] Échec de l'initialisation. Fermeture.`);
        try {
          if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`);
          else child.kill();
        } catch (e) {}
        spawnedTorProcesses.delete(port);
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
      }
    } catch (err) {
      log(`[Tor Bootstrap] Port ${port} : [Erreur] Erreur lors du lancement : ${err.message}`);
    }
  }
}

export async function cleanupSpawnedTor(log = console.log) {
  if (spawnedTorProcesses.size === 0) return;
  log(`[Tor Cleanup] Fermeture propre de ${spawnedTorProcesses.size} instances Tor...`);
  for (const [port, child] of spawnedTorProcesses.entries()) {
    try {
      log(`[Tor Cleanup] Port ${port} : Arrêt du processus enfant (PID: ${child.pid})...`);
      if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`);
      else child.kill();
    } catch (e) { try { child.kill(); } catch (err) {} }
    const tempDir = path.join(process.cwd(), `temp_tor_data_${port}`);
    await new Promise(r => setTimeout(r, 300));
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {
      setTimeout(() => { try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (err) {} }, 1000);
    }
  }
  spawnedTorProcesses.clear();
  log(`[Tor Cleanup] ✓ Toutes les instances Tor dynamiques ont été libérées.`);
}

export function cleanupSpawnedTorSync() {
  if (spawnedTorProcesses.size === 0) return;
  console.log(`[Tor Cleanup Sync] Arrêt forcé de sécurité pour ${spawnedTorProcesses.size} instances Tor...`);
  for (const [port, child] of spawnedTorProcesses.entries()) {
    try {
      if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
      else process.kill(child.pid, 'SIGKILL');
    } catch (e) {}
    const tempDir = path.join(process.cwd(), `temp_tor_data_${port}`);
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
  spawnedTorProcesses.clear();
}

export function isTorRouting(socksPort = 9050) {
  return new Promise(async (resolve) => {
    const testUrl = (url) => new Promise((res) => {
      const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
      const nullOut = process.platform === 'win32' ? 'NUL' : '/dev/null';
      exec(`${curlCmd} --socks5-hostname 127.0.0.1:${socksPort} -s -o ${nullOut} -w "%{http_code}" ${url}`, { timeout: 4000 }, (error, stdout) => {
        if (error) res(false);
        else res(['200', '301', '302'].includes(stdout.trim()));
      });
    });
    const ok = await testUrl('https://api.ipify.org');
    if (ok) return resolve(true);
    resolve(await testUrl('https://html.duckduckgo.com'));
  });
}

export async function healTorPort(port) {
  console.log(`[Tor Self-Healing] Checking Port ${port}...`);
  if (await isTorRouting(port)) {
    console.log(`[Tor Self-Healing] Port ${port} is healthy.`);
    return true;
  }
  console.warn(`[Tor Self-Healing] Port ${port} dead. Rotating IP...`);
  const rotated = await renewTorSession(port + 1);
  if (rotated) {
    await new Promise(r => setTimeout(r, 3500));
    if (await isTorRouting(port)) {
      console.log(`[Tor Self-Healing] Port ${port} recovered after IP rotation.`);
      return true;
    }
  }
  if (spawnedTorProcesses.has(port)) {
    console.warn(`[Tor Self-Healing] Port ${port} still dead. Restarting Tor process...`);
    const child = spawnedTorProcesses.get(port);
    try {
      if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
      else child.kill();
    } catch (e) {}
    spawnedTorProcesses.delete(port);
    const tempDir = path.join(process.cwd(), `temp_tor_data_${port}`);
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
    await bootstrapTorInstances(1, scraperPath, console.log);
    if (await isTorRouting(port)) {
      console.log(`[Tor Self-Healing] Port ${port} successfully healed via relaunch.`);
      return true;
    }
  }
  console.error(`[Tor Self-Healing] Port ${port} remains offline.`);
  return false;
}

export async function healTorPool() {
  const activePorts = await getActiveTorPorts();
  if (activePorts.length === 0) return false;
  let allHealthy = true;
  for (const port of activePorts) {
    const success = await healTorPort(port);
    if (!success) allHealthy = false;
  }
  return allHealthy;
}

process.on('exit', () => cleanupSpawnedTorSync());
process.on('SIGINT', () => { cleanupSpawnedTorSync(); process.exit(); });
process.on('SIGTERM', () => { cleanupSpawnedTorSync(); process.exit(); });
process.on('uncaughtException', (err) => {
  cleanupSpawnedTorSync();
  console.error('[Uncaught Exception Tor Cleanup]', err);
  process.exit(1);
});
