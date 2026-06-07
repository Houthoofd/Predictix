import { exec } from 'child_process';
import os from 'os';
import { scraperState } from './scraperState.js';
import { 
  isTorActive, 
  renewTorSession, 
  cleanupSpawnedTor, 
  bootstrapTorInstances 
} from '../utils/scraperHelpers.js';
import { processQueueItem } from './integrityWorker.js';
import { updateKeepAwakeStatus } from '../utils/keepAwake.js';

export async function runIntegrityBatchLoop() {
  await updateKeepAwakeStatus(true);
  const activeIntegrityBatch = scraperState.activeIntegrityBatch;
  const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';

  const freeRAMBytes = os.freemem();
  const freeRAMMB = freeRAMBytes / (1024 * 1024);
  const reservedRAMMB = 1500;
  const usableRAMMB = Math.max(0, freeRAMMB - reservedRAMMB);
  
  const recommendedWorkers = Math.max(1, Math.min(12, Math.floor(usableRAMMB / 180)));
  activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [RAM] Diagnostic RAM : ${Math.round(freeRAMMB)} Mo libres. Marge 1,5 Go réservée. Allocation ciblée : ${recommendedWorkers} instances.`);

  await bootstrapTorInstances(recommendedWorkers, scraperPath, (msg) => {
    activeIntegrityBatch.logs.push(msg);
  });

  const possiblePorts = [9050, 9052, 9054, 9056, 9058, 9060, 9062, 9064, 9066, 9068, 9070, 9072].slice(0, recommendedWorkers);
  const activePorts = [];
  for (const port of possiblePorts) {
    const active = await isTorActive(port);
    if (active) {
      activePorts.push(port);
    }
  }

  if (activePorts.length === 0) {
    activeIntegrityBatch.status = 'idle';
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Erreur] Erreur : Aucun port proxy Tor actif détecté. Réparation annulée.`);
    await updateKeepAwakeStatus(false);
    return;
  }

  activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Réseau] Détection réseau : ${activePorts.length} proxy Tor opérationnels (Ports: ${activePorts.join(', ')}).`);
  if (activePorts.length > 1) {
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Scraper] Mode Parallèle activé (traitement sur ${activePorts.length} circuits en même temps).`);
  } else {
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Scraper] Mode Séquentiel activé (un seul proxy Tor actif).`);
  }

  const worker = async (socksPort) => {
    let workerProcessedCount = 0;

    while (activeIntegrityBatch.status === 'running') {
      let indexToProcess = -1;
      
      if (activeIntegrityBatch.currentIndex < activeIntegrityBatch.queue.length) {
        indexToProcess = activeIntegrityBatch.currentIndex;
        activeIntegrityBatch.currentIndex++;
      } else {
        break;
      }

      const matchObj = activeIntegrityBatch.queue[indexToProcess];
      const timeStr = new Date().toLocaleTimeString();

      if (workerProcessedCount > 0 && workerProcessedCount % 3 === 0) {
        activeIntegrityBatch.logs.push(`[${timeStr}] [Tor Port ${socksPort}] [Rotation IP] Rotation d'IP Tor périodique...`);
        const rotated = await renewTorSession(socksPort + 1);
        if (rotated) {
          activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] ✓ Nouvelle IP obtenue. Stabilisation de 1.5s...`);
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      workerProcessedCount++;
      activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Tor Port ${socksPort}] [${indexToProcess + 1}/${activeIntegrityBatch.queue.length}] Analyse : ${matchObj.home_team} vs ${matchObj.away_team}...`);

      await processQueueItem(socksPort, indexToProcess, scraperPath, activeIntegrityBatch);

      for (const child of activeIntegrityBatch.spawnedChildren) {
        if (child.killed || child.exitCode !== null) {
          activeIntegrityBatch.spawnedChildren.delete(child);
        }
      }

      if (activeIntegrityBatch.status === 'running') {
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  };

  try {
    await Promise.all(activePorts.map(port => worker(port)));
  } catch (err) {
    console.error('[Integrity Parallel Workers Error]', err);
  }

  await cleanupSpawnedTor((msg) => {
    activeIntegrityBatch.logs.push(msg);
  });

  if (activeIntegrityBatch.currentIndex >= activeIntegrityBatch.queue.length) {
    activeIntegrityBatch.status = 'idle';
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Terminé] Réparation globale terminée. Succès: ${activeIntegrityBatch.successCount}, Erreurs: ${activeIntegrityBatch.errorCount}.`);
  } else if (activeIntegrityBatch.status === 'paused') {
    activeIntegrityBatch.logs.push(`[${new Date().toLocaleTimeString()}] [Pause] Réparation globale mise en pause.`);
  }
  await updateKeepAwakeStatus(false);
}
