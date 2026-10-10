/**
 * Predictix Edge Trainer
 * Coordinates execution of Predictix Edge training processes,
 * manages artifact report lifecycles, and caches candidate models.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { validateEdgeArtifact, validateEdgeAdmission, SUPPORTED_SCHEMA_VERSIONS } from './edgeArtifactValidator.js';
import {
  predictWithEdgeModel,
  predictMatchWithEdge,
  isValidMatchDate,
  makeTeamKey,
  registerArtifactResolver
} from './edgeModelPredictor.js';

// Backward compatibility re-exports
export {
  validateEdgeArtifact,
  validateEdgeAdmission,
  SUPPORTED_SCHEMA_VERSIONS,
  predictWithEdgeModel,
  predictMatchWithEdge,
  isValidMatchDate,
  makeTeamKey
};

export const EDGE_TARGETS = [
  'football_corners_1mt',
  'football_corners_ft',
  'football_corners_2mt',
  'basketball_points_1mt',
  'basketball_points_1qt',
  'basketball_points_ft'
];

/**
 * Resolves the Predictix Edge executable binary path.
 */
export function getPredictixEdgePath() {
  const custom = process.env.PREDICTIX_EDGE_BIN || process.env.PREDICTIX_EDGE_PATH;
  if (custom !== undefined && custom !== '') return fs.existsSync(custom) ? custom : null;
  const defaultWin = 'E:\\Developpement\\predictix-edge\\build\\predictix-edge.exe';
  if (fs.existsSync(defaultWin)) return defaultWin;
  const defaultUnix = '/opt/predictix-edge/build/predictix-edge';
  if (fs.existsSync(defaultUnix)) return defaultUnix;
  const rel = path.resolve(
    process.cwd(),
    '../predictix-edge/build',
    process.platform === 'win32' ? 'predictix-edge.exe' : 'predictix-edge'
  );
  return fs.existsSync(rel) ? rel : null;
}

/**
 * Selects the scraper data directory for training.
 */
export function getEdgeDataDir() {
  if (process.env.EDGE_DATA_DIR && fs.existsSync(process.env.EDGE_DATA_DIR)) return process.env.EDGE_DATA_DIR;
  if (process.env.SCRAPER_DATA_DIR && fs.existsSync(process.env.SCRAPER_DATA_DIR)) return process.env.SCRAPER_DATA_DIR;
  const scraperPath = process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3';
  for (const d of [
    path.join(scraperPath, 'data_edge'),
    path.join(scraperPath, 'data'),
    path.resolve(process.cwd(), '../scrapper-v3/data_edge'),
    path.resolve(process.cwd(), '../scrapper-v3/data')
  ]) {
    if (fs.existsSync(d)) return d;
  }
  return null;
}

export const getScraperDataDir = getEdgeDataDir;

/**
 * Locates or creates the reports directory for Predictix Edge training outputs.
 */
export function getEdgeReportsDir() {
  const custom = process.env.EDGE_REPORTS_DIR;
  if (custom) {
    if (!fs.existsSync(custom)) try { fs.mkdirSync(custom, { recursive: true }); } catch (e) {}
    return custom;
  }
  const edgePath = getPredictixEdgePath();
  if (edgePath) {
    const parentReports = path.join(path.dirname(edgePath), '..', 'reports');
    if (fs.existsSync(parentReports)) return parentReports;
  }
  const localReports = path.resolve(process.cwd(), 'reports', 'edge');
  if (!fs.existsSync(localReports)) try { fs.mkdirSync(localReports, { recursive: true }); } catch (e) {}
  return localReports;
}

/**
 * Runs training on Predictix Edge for a specific target with strict timeout and validation.
 */
export function runEdgeTrain(edgeExe, dataDir, target, options = {}) {
  return new Promise((resolve) => {
    const reportsDir = getEdgeReportsDir();
    const reportPath = options?.reportPath || path.join(reportsDir, `training-${target}-${Date.now()}-${process.pid}.json`);

    try {
      const parentDir = path.dirname(reportPath);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    } catch (e) {
      console.warn(`[Predictix Edge] Failed to create reports dir: ${e.message}`);
    }

    const timeoutMs = (typeof options?.timeoutMs === 'number' && options.timeoutMs > 0) ? options.timeoutMs : 30000;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { controller.abort(); } catch (e) {}
    }, timeoutMs);

    console.log(`[Predictix Edge] Spawning training: ${edgeExe} train "${dataDir}" "${target}" "${reportPath}" (timeout: ${timeoutMs}ms)`);

    let child;
    try {
      child = spawn(edgeExe, ['train', dataDir, target, reportPath], { signal: controller.signal });
    } catch (spawnErr) {
      clearTimeout(timer);
      return resolve({
        success: false, exitCode: -1, target, status: 'error', training_status: 'error',
        error: spawnErr.message, reportPath, timestamp: new Date().toISOString()
      });
    }

    let stdout = '', stderr = '';
    if (child.stdout) child.stdout.on('data', (d) => { stdout += d.toString(); });
    if (child.stderr) child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      clearTimeout(timer);
      const isTimeout = timedOut || err.name === 'AbortError' || err.code === 'ABORT_ERR';
      resolve({
        success: false, exitCode: isTimeout ? -2 : -1, target, status: 'error', training_status: 'error',
        error: isTimeout ? `Training timed out after ${timeoutMs}ms` : err.message,
        reportPath, stdout: stdout.trim(), stderr: stderr.trim(), timestamp: new Date().toISOString()
      });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      let artifact = null, parseError = null;
      if (fs.existsSync(reportPath)) {
        try { artifact = JSON.parse(fs.readFileSync(reportPath, 'utf8')); } catch (e) { parseError = e.message; }
      }

      let training_status = 'error', validationReason = null;
      if (artifact?.status) {
        if (artifact.status === 'candidate') {
          const val = validateEdgeAdmission(artifact, target);
          training_status = val.valid ? 'candidate' : 'error';
          if (!val.valid) validationReason = `Artifact validation failed: ${val.reason}`;
        } else {
          training_status = artifact.status;
        }
      } else if (code === 2) {
        training_status = (stderr.includes('baseline_not_beaten') || artifact?.status === 'baseline_not_beaten')
          ? 'baseline_not_beaten' : 'insufficient_data';
      }

      const isSuccess = (code === 0) && (training_status === 'candidate') && (artifact !== null);
      const metrics = {
        samples: artifact?.samples || 0,
        cold_start_skipped: artifact?.cold_start_skipped || 0,
        mae: artifact?.test?.mae, rmse: artifact?.test?.rmse,
        baseline_mae: artifact?.test?.baseline_mae, baseline_rmse: artifact?.test?.baseline_rmse,
        split: artifact?.split
      };

      const reason = validationReason || artifact?.reason ||
        (training_status === 'baseline_not_beaten' ? 'Model did not improve test MAE over baseline' :
        (training_status === 'insufficient_data' ? 'At least 50 usable chronological samples required' :
        (parseError ? `Failed to parse report JSON: ${parseError}` : (code !== 0 ? `Process exited with code ${code}` : undefined))));

      resolve({
        success: isSuccess, exitCode: code, target, status: training_status, training_status,
        reason, reportPath, artifactPath: isSuccess ? reportPath : null, artifact, metrics,
        timestamp: new Date().toISOString(), stdout: stdout.trim(), stderr: stderr.trim()
      });
    });
  });
}

// In-memory cache for loaded candidate Edge models
const edgeModelsCache = new Map();

export function clearEdgeModelsCache() {
  edgeModelsCache.clear();
}

/**
 * Searches and loads the most recent candidate artifact for a target.
 */
export function loadLatestEdgeArtifact(target, reportsDir = getEdgeReportsDir()) {
  if (edgeModelsCache.has(target)) return edgeModelsCache.get(target);
  if (!fs.existsSync(reportsDir)) return null;

  try {
    const files = fs.readdirSync(reportsDir)
      .filter(f => f.startsWith(`training-${target}`) && f.endsWith('.json'))
      .map(f => path.join(reportsDir, f))
      .sort((a, b) => {
        try { return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs; } catch (e) { return 0; }
      });

    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(file, 'utf8'));
        const validation = content?.admission_policy !== undefined
          ? validateEdgeAdmission(content, target) : validateEdgeArtifact(content, target);
        if (content?.status === 'candidate' && validation.valid) {
          edgeModelsCache.set(target, content);
          return content;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null;
}

// Register loadLatestEdgeArtifact as the default resolver for target lookup
registerArtifactResolver(loadLatestEdgeArtifact);

/**
 * Gets the active Edge candidate model object for a target.
 */
export function getEdgeModel(target) {
  const artifact = loadLatestEdgeArtifact(target);
  if (!artifact || artifact.status !== 'candidate' || !artifact.model) return null;
  return validateEdgeArtifact(artifact, target).valid ? artifact.model : null;
}

/**
 * Runs training across specified Edge targets and returns aggregated diagnostic.
 */
export async function trainEdgeModels(edgeExe, dataDir, targets = EDGE_TARGETS, options = {}) {
  const targetResults = {};
  for (const target of targets) {
    const res = await runEdgeTrain(edgeExe, dataDir, target, options);
    targetResults[target] = res;
    if (res.success && res.artifact) edgeModelsCache.set(target, res.artifact);
  }

  const list = Object.values(targetResults);
  const hasCandidate = list.some(r => r.training_status === 'candidate');
  const hasBaselineNotBeaten = list.some(r => r.training_status === 'baseline_not_beaten');
  const allErrors = list.length > 0 && list.every(r => r.training_status === 'error');
  const hasError = list.some(r => r.training_status === 'error');

  const overallStatus = hasCandidate ? 'candidate'
    : (allErrors || hasError) ? 'error'
    : hasBaselineNotBeaten ? 'baseline_not_beaten'
    : 'insufficient_data';

  return {
    success: hasCandidate,
    configured: true,
    status: overallStatus,
    training_status: overallStatus,
    edgePath: edgeExe,
    dataDir,
    results: targetResults,
    message: `Predictix Edge training completed for targets: ${targets.join(', ')} (Status: ${overallStatus})`
  };
}
