import { requireFreshDetailedHistory } from './edgeHistoryValidator.js';
/**
 * Predictix Edge Model Predictor
 *
 * Provides Ridge linear model prediction and match feature aggregation,
 * with strict validation matching C++ src/features.cpp and src/model.cpp:
 * - Exactly 6 features, strictly finite
 * - Scaling: (x - mean) / scale
 * - Intercept + dot product
 * - Bounded at 0: Math.max(0, prediction)
 * - Strict match chronology (match.date > history.last_match_date)
 * - No silent defaults for missing match or history data
 */

import { validateEdgeArtifact } from './edgeArtifactValidator.js';

let defaultArtifactResolver = null;

/**
 * Registers a global artifact resolver function for target name lookup.
 * @param {Function} resolver (target: string) => object | null
 */
export function registerArtifactResolver(resolver) {
  defaultArtifactResolver = resolver;
}

/**
 * Validates date in YYYY-MM-DD format strictly matching C++ valid_date in predictix-edge.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidMatchDate(value) {
  if (typeof value !== 'string' || value.length !== 10) return false;
  if (value[4] !== '-' || value[7] !== '-') return false;
  for (let i = 0; i < 10; i++) {
    if (i !== 4 && i !== 7) {
      const code = value.charCodeAt(i);
      if (code < 48 || code > 57) return false;
    }
  }
  const year = parseInt(value.slice(0, 4), 10);
  const month = parseInt(value.slice(5, 7), 10);
  const day = parseInt(value.slice(8, 10), 10);
  if (year < 1900 || year > 2200 || month < 1 || month > 12) return false;
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
    days[1] = 29;
  }
  return day >= 1 && day <= days[month - 1];
}

/**
 * Builds canonical team key matching C++ team_key in predictix-edge/src/features.cpp.
 * @param {string} source
 * @param {string} sport
 * @param {string} competition
 * @param {string} team
 * @returns {string} JSON-encoded key
 */
export function makeTeamKey(source, sport, competition, team) {
  return JSON.stringify([source, sport, competition, team]);
}

/**
 * Evaluates prediction using an Edge model artifact (linear ridge weights).
 *
 * Supports two invocation styles:
 * 1. predictWithEdgeModel(model, features, options):
 *    Direct calculation with model object and raw 6-feature numeric array.
 * 2. predictWithEdgeModel(target, matchOrFeatures, options):
 *    Looks up the latest candidate artifact for the target, validates it,
 *    and delegates to predictMatchWithEdge or direct feature calculation.
 *
 * @param {object|string} modelOrTarget Model object or target name
 * @param {Array<number>|object} featuresOrMatch 6-feature array or match object
 * @param {object} [options={}]
 * @param {boolean} [options.allowNegative=false]
 * @param {Function} [options.loadArtifact]
 * @returns {number|null} Predicted expected total or null if unavailable
 */
export function predictWithEdgeModel(modelOrTarget, featuresOrMatch, options = {}) {
  // Style 2: target-based lookup (e.g. 'football_corners_1mt')
  if (typeof modelOrTarget === 'string') {
    const target = modelOrTarget;
    const resolver = (options && options.loadArtifact) || defaultArtifactResolver;
    if (!resolver) {
      return null;
    }
    const artifact = resolver(target);
    if (!artifact || artifact.status !== 'candidate') {
      return null;
    }
    const validation = validateEdgeArtifact(artifact, target);
    if (!validation.valid) {
      return null;
    }
    const model = artifact.model || artifact;
    if (Array.isArray(featuresOrMatch)) {
      return predictWithEdgeModel(model, featuresOrMatch, options);
    }
    if (featuresOrMatch && typeof featuresOrMatch === 'object') {
      if (Array.isArray(featuresOrMatch.feature_values)) {
        return predictWithEdgeModel(model, featuresOrMatch.feature_values, options);
      }
      return predictMatchWithEdge(featuresOrMatch, artifact.history, model, options);
    }
    return null;
  }

  if (modelOrTarget?.schema_version !== undefined) {
    const validation = validateEdgeArtifact(modelOrTarget);
    if (!validation.valid) throw new Error(validation.reason);
  }

  // Style 1: Direct model prediction: predictWithEdgeModel(model, features, options)
  const model = (modelOrTarget && modelOrTarget.model) ? modelOrTarget.model : modelOrTarget;
  if (!model || typeof model !== 'object') {
    throw new Error('Model object is required for predictWithEdgeModel');
  }

  // If modelOrTarget is an artifact and featuresOrMatch is a match object
  if (
    modelOrTarget &&
    modelOrTarget.history &&
    featuresOrMatch &&
    typeof featuresOrMatch === 'object' &&
    !Array.isArray(featuresOrMatch) &&
    !Array.isArray(featuresOrMatch.feature_values)
  ) {
    return predictMatchWithEdge(featuresOrMatch, modelOrTarget.history, model, options);
  }

  const features = featuresOrMatch;
  if (!Array.isArray(features) || features.length !== 6) {
    throw new Error(
      `Feature input must contain exactly 6 features, got ${Array.isArray(features) ? features.length : typeof features}`
    );
  }
  for (let i = 0; i < 6; i++) {
    if (typeof features[i] !== 'number' || !Number.isFinite(features[i])) {
      throw new Error(`Feature at index ${i} is not a finite number: ${features[i]}`);
    }
  }

  const weights = model.weights;
  if (!Array.isArray(weights) || weights.length !== 6) {
    throw new Error(`Model weights must have exactly 6 items, got ${weights?.length}`);
  }
  for (let i = 0; i < 6; i++) {
    if (typeof weights[i] !== 'number' || !Number.isFinite(weights[i])) {
      throw new Error(`Model weight at index ${i} is not a finite number: ${weights[i]}`);
    }
  }

  const intercept = model.intercept;
  if (typeof intercept !== 'number' || !Number.isFinite(intercept)) {
    throw new Error(`Model intercept must be a finite number, got ${intercept}`);
  }

  const scales = model.scales;
  if (!Array.isArray(scales) || scales.length !== 6) {
    throw new Error(`Model feature_scales must have 6 items, got ${scales?.length}`);
  }
  for (let i = 0; i < 6; i++) {
    const scale = scales[i];
    if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0) {
      throw new Error(`Feature scale at index ${i} must be strictly positive and finite: ${scale}`);
    }
  }

  const means = model.means;
  if (!Array.isArray(means) || means.length !== 6) {
    throw new Error(`Model feature_means must have 6 items, got ${means?.length}`);
  }
  for (let i = 0; i < 6; i++) {
    const mean = means[i];
    if (typeof mean !== 'number' || !Number.isFinite(mean)) {
      throw new Error(`Feature mean at index ${i} is not a finite number: ${mean}`);
    }
  }

  let dot = 0;
  for (let j = 0; j < 6; j++) {
    const scaled = (features[j] - means[j]) / scales[j];
    dot += weights[j] * scaled;
  }
  const prediction = intercept + dot;

  if (typeof prediction !== 'number' || !Number.isFinite(prediction)) {
    throw new Error(`Non-finite prediction computed: ${prediction}`);
  }

  return (options && options.allowNegative) ? prediction : Math.max(0, prediction);
}

/**
 * Evaluates prediction for a match from historical team stats and an Edge model.
 *
 * Enforces strict C++ features.cpp checks:
 * - Match date must be strictly posterior to history last match date (match.date > last_match_date)
 * - Required parameters (date, source, sport, tournament, home_team, away_team) must be non-empty (no silent defaults)
 * - Teams in match must have at least 3 historical matches in history.teams
 *
 * @param {object} match
 * @param {object} history
 * @param {object} model
 * @param {object} [options={}]
 * @returns {number}
 */
export function predictMatchWithEdge(match, history, model, options = {}) {
  if (!match || typeof match !== 'object') {
    throw new Error('Match must be a valid object');
  }

  if (!match.date || typeof match.date !== 'string' || !isValidMatchDate(match.date)) {
    throw new Error(`Missing or invalid match date: ${match?.date}`);
  }

  if (!match.source || typeof match.source !== 'string' || match.source.trim() === '') {
    throw new Error('Missing required match parameter: source');
  }

  if (!match.sport || (match.sport !== 'football' && match.sport !== 'basketball')) {
    throw new Error(`Missing or invalid required match parameter: sport (${match?.sport})`);
  }

  const tournament = match.tournament || match.league || match.competition;
  if (!tournament || typeof tournament !== 'string' || tournament.trim() === '') {
    throw new Error('Missing required match parameter: tournament');
  }

  if (!match.home_team || typeof match.home_team !== 'string' || match.home_team.trim() === '') {
    throw new Error('Missing required match parameter: home_team');
  }

  if (!match.away_team || typeof match.away_team !== 'string' || match.away_team.trim() === '') {
    throw new Error('Missing required match parameter: away_team');
  }

  if (match.home_team.trim() === match.away_team.trim()) {
    throw new Error('Invalid teams: home_team and away_team cannot be identical');
  }

  if (!history || typeof history !== 'object') {
    throw new Error('History must be a valid object');
  }

  // Mandatory chronology check matching C++ src/features.cpp:
  if (!history.last_match_date || typeof history.last_match_date !== 'string' || !isValidMatchDate(history.last_match_date)) {
    throw new Error('Artifact history is missing valid last_match_date');
  }

  if (match.date <= history.last_match_date) {
    throw new Error(
      `Prediction date must be later than every match in the artifact history (match: ${match.date}, last_history: ${history.last_match_date})`
    );
  }

  if (!history.teams || typeof history.teams !== 'object') {
    throw new Error('History must contain teams statistics');
  }

  const homeKey = makeTeamKey(match.source, match.sport, tournament, match.home_team);
  const awayKey = makeTeamKey(match.source, match.sport, tournament, match.away_team);

  if (history.schema_version !== undefined) {
    requireFreshDetailedHistory(history, { ...match, tournament }, homeKey, awayKey);
  }
  const homeStats = history.teams[homeKey];
  const awayStats = history.teams[awayKey];

  if (!homeStats) {
    throw new Error(`No usable history for team: ${match.home_team}`);
  }
  if (!awayStats) {
    throw new Error(`No usable history for team: ${match.away_team}`);
  }

  if (!Array.isArray(homeStats) || homeStats.length < 3 || homeStats[2] < 3) {
    throw new Error(`At least three prior matches required for team: ${match.home_team}`);
  }
  if (!Array.isArray(awayStats) || awayStats.length < 3 || awayStats[2] < 3) {
    throw new Error(`At least three prior matches required for team: ${match.away_team}`);
  }

  const features = [
    homeStats[0],
    homeStats[1],
    awayStats[0],
    awayStats[1],
    homeStats[2],
    awayStats[2]
  ];

  if (!model) {
    throw new Error('Model is required for prediction');
  }

  return predictWithEdgeModel(model, features, options);
}
