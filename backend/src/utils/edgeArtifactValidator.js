import { validateDetailedEdgeHistory } from './edgeHistoryValidator.js';
import { validateAdmissionMetadata } from './edgeAdmissionValidator.js';
/**
 * Predictix Edge Artifact Validator
 *
 * Strict artifact validation matching C++ src/features.cpp and src/model.cpp:
 * - Exact schema_version: "predictix-edge-model/1"
 * - Exact feature_schema: "rolling-counts/2"
 * - Exact status: "candidate"
 * - Exact algorithm: "ridge_batch_gradient_v1" (ONLY supported algorithm)
 * - Exact target: one of the 6 valid targets
 * - Exact feature_names: ["home_rolling_scored", "home_rolling_conceded", "away_rolling_scored", "away_rolling_conceded", "home_history_count", "away_history_count"]
 * - Model object must exist (no loose fallback where artifact root is treated as model)
 * - Exact 6 weights, all finite numbers
 * - Intercept: finite number
 * - Exact 6 feature scales, all strictly positive finite numbers (no loose aliases)
 * - Exact 6 feature means, all finite numbers (MANDATORY, no loose aliases)
 * - Lambda: strictly positive finite number
 * - Returns { valid: true } or { valid: false, reason: '...' }
 */

export const SUPPORTED_SCHEMA_VERSIONS = [
  'predictix-edge-model/1'
];

export const VALID_TARGETS = [
  'football_corners_1mt',
  'football_corners_ft',
  'football_corners_2mt',
  'basketball_points_1mt',
  'basketball_points_1qt',
  'basketball_points_ft'
];

export const EXPECTED_FEATURE_NAMES = [
  'home_rolling_scored',
  'home_rolling_conceded',
  'away_rolling_scored',
  'away_rolling_conceded',
  'home_history_count',
  'away_history_count'
];

export const SUPPORTED_ALGORITHMS = [
  'ridge_batch_gradient_v1'
];

/**
 * Validates an Edge model artifact against C++ features and model requirements.
 *
 * @param {object} artifact
 * @param {string} [target]
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateEdgeArtifact(artifact, target) {
  if (!artifact || typeof artifact !== 'object') {
    return { valid: false, reason: 'Artifact must be a valid non-null object' };
  }

  // 1. schema_version check: must be "predictix-edge-model/1"
  if (!artifact.schema_version || typeof artifact.schema_version !== 'string') {
    return { valid: false, reason: 'Missing schema_version in artifact' };
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(artifact.schema_version)) {
    return {
      valid: false,
      reason: `Unsupported schema_version '${artifact.schema_version}': must be predictix-edge-model/1`
    };
  }

  // 2. feature_schema check: must be "rolling-counts/2"
  if (!artifact.feature_schema || artifact.feature_schema !== 'rolling-counts/2') {
    return {
      valid: false,
      reason: `Unsupported feature_schema '${artifact.feature_schema}': must be 'rolling-counts/2'`
    };
  }

  // 3. status check: must be "candidate"
  if (artifact.status !== 'candidate') {
    return {
      valid: false,
      reason: `Artifact status must be 'candidate', got '${artifact.status}'`
    };
  }

  const consistency = validateAdmissionMetadata(artifact);
  if (!consistency.valid) return consistency;

  // 4. target check: must be one of the 6 valid targets
  if (!artifact.target || typeof artifact.target !== 'string') {
    return { valid: false, reason: 'Missing or invalid target in artifact' };
  }
  if (!VALID_TARGETS.includes(artifact.target)) {
    return {
      valid: false,
      reason: `Unknown artifact target '${artifact.target}': must be one of ${VALID_TARGETS.join(', ')}`
    };
  }
  if (target && artifact.target !== target) {
    return {
      valid: false,
      reason: `Artifact target '${artifact.target}' does not match requested target '${target}'`
    };
  }

  // 5. sport check
  const targetSport = artifact.target.startsWith('football_')
    ? 'football'
    : (artifact.target.startsWith('basketball_') ? 'basketball' : null);

  if (!targetSport) {
    return {
      valid: false,
      reason: `Artifact target '${artifact.target}' does not belong to a supported sport (football or basketball)`
    };
  }

  const artifactSport = artifact.sport || targetSport;
  if (artifactSport !== 'football' && artifactSport !== 'basketball') {
    return { valid: false, reason: `Unsupported sport '${artifactSport}': must be football or basketball` };
  }
  if (artifact.sport && artifact.sport !== targetSport) {
    return {
      valid: false,
      reason: `Artifact sport '${artifact.sport}' does not match target prefix '${targetSport}'`
    };
  }

  // 6. model object check: must exist as an object (no loose fallback where artifact root is treated as model)
  if (!artifact.model || typeof artifact.model !== 'object' || Array.isArray(artifact.model)) {
    return { valid: false, reason: 'Artifact must contain a valid model object' };
  }
  const model = artifact.model;

  // 7. algorithm check: strictly "ridge_batch_gradient_v1"
  if (!model.algorithm || model.algorithm !== 'ridge_batch_gradient_v1') {
    return {
      valid: false,
      reason: "Unsupported algorithm: must be 'ridge_batch_gradient_v1'"
    };
  }

  // 8. reject loose alias fields on model
  if (model.feature_scales !== undefined || model.feature_means !== undefined) {
    return {
      valid: false,
      reason: "Unsupported model schema: loose alias fields ('feature_scales', 'feature_means') are not permitted"
    };
  }

  // 9. lambda check: strictly positive finite number
  if (typeof model.lambda !== 'number' || !Number.isFinite(model.lambda) || model.lambda <= 0) {
    return {
      valid: false,
      reason: `Model lambda must be a strictly positive finite number: ${model.lambda}`
    };
  }

  // 10. feature_names check: exact 6 names in exact order
  if (!Array.isArray(model.feature_names) || model.feature_names.length !== EXPECTED_FEATURE_NAMES.length) {
    return {
      valid: false,
      reason: `Model feature_names must be an array of exactly ${EXPECTED_FEATURE_NAMES.length} feature names`
    };
  }
  for (let i = 0; i < EXPECTED_FEATURE_NAMES.length; i++) {
    if (model.feature_names[i] !== EXPECTED_FEATURE_NAMES[i]) {
      return {
        valid: false,
        reason: `Invalid feature_names at index ${i}: expected '${EXPECTED_FEATURE_NAMES[i]}', got '${model.feature_names[i]}'`
      };
    }
  }

  // 11. weights check: exactly 6 finite numbers
  if (!Array.isArray(model.weights)) {
    return { valid: false, reason: 'Model weights must be an array' };
  }
  if (model.weights.length !== 6) {
    return {
      valid: false,
      reason: `Weights dimension mismatch: expected exactly 6 weights, got ${model.weights.length}`
    };
  }
  for (let i = 0; i < 6; i++) {
    const w = model.weights[i];
    if (typeof w !== 'number' || !Number.isFinite(w)) {
      return { valid: false, reason: `Weight at index ${i} is not a finite number: ${w}` };
    }
  }

  // 12. intercept check: finite number
  if (typeof model.intercept !== 'number' || !Number.isFinite(model.intercept)) {
    return { valid: false, reason: `Model intercept must be a finite number: ${model.intercept}` };
  }

  // 13. feature_scales check: exactly 6 strictly positive finite numbers
  if (!Array.isArray(model.scales)) {
    return { valid: false, reason: 'Model feature scales must be an array' };
  }
  if (model.scales.length !== 6) {
    return { valid: false, reason: `Feature scales dimension mismatch: expected 6 scales, got ${model.scales.length}` };
  }
  for (let i = 0; i < 6; i++) {
    const s = model.scales[i];
    if (typeof s !== 'number' || !Number.isFinite(s) || s <= 0) {
      return { valid: false, reason: `Feature scale at index ${i} must be strictly positive and finite: ${s}` };
    }
  }

  // 14. feature_means check: exactly 6 finite numbers (MANDATORY)
  if (!Array.isArray(model.means)) {
    return { valid: false, reason: 'Model feature means must be an array' };
  }
  if (model.means.length !== 6) {
    return { valid: false, reason: `Feature means dimension mismatch: expected 6 means, got ${model.means.length}` };
  }
  for (let i = 0; i < 6; i++) {
    const m = model.means[i];
    if (typeof m !== 'number' || !Number.isFinite(m)) {
      return { valid: false, reason: `Feature mean at index ${i} is not a finite number: ${m}` };
    }
  }

  // 15. detailed history check if history contains detailed schema or games
  if (artifact.history && (artifact.history.schema_version !== undefined || artifact.history.team_games !== undefined)) {
    const historyValidation = validateDetailedEdgeHistory(artifact.history, targetSport);
    if (!historyValidation.valid) return historyValidation;
  }

  return { valid: true };
}

export function validateEdgeAdmission(artifact, target) {
  const compatible = validateEdgeArtifact(artifact, target);
  return compatible.valid ? validateAdmissionMetadata(artifact, true) : compatible;
}
