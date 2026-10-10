import { describe, it, expect, beforeEach } from 'vitest';
import {
  predictWithEdgeModel,
  predictMatchWithEdge,
  isValidMatchDate,
  makeTeamKey
} from './edgeModelPredictor.js';
import { clearEdgeModelsCache } from './edgeTrainer.js';

describe('P1 — Edge Model Prediction & Match Chronology Parity (C++ Ridge::predict)', () => {
  beforeEach(() => {
    clearEdgeModelsCache();
  });

  const validModel = {
    algorithm: 'ridge_batch_gradient_v1',
    lambda: 0.1,
    intercept: 2.5,
    weights: [0.3, -0.2, 0.4, -0.1, 0.05, -0.05],
    means: [1.5, 1.0, 2.0, 0.5, 6.0, 4.0],
    scales: [0.5, 1.0, 2.0, 0.5, 2.0, 1.0],
    feature_names: [
      'home_rolling_scored',
      'home_rolling_conceded',
      'away_rolling_scored',
      'away_rolling_conceded',
      'home_history_count',
      'away_history_count'
    ]
  };

  /** Helper simulating exact C++ Ridge::predict logic from predictix-edge/src/model.cpp */
  function cppRidgePredict(model, x, clamp = true) {
    let value = model.intercept;
    for (let j = 0; j < 6; j++) {
      const scaled = (x[j] - model.means[j]) / model.scales[j];
      value += model.weights[j] * scaled;
    }
    return clamp ? Math.max(0.0, value) : value;
  }

  describe('Multi-vector Differential Numerical Tests against C++ Ridge (< 1e-9)', () => {
    it('Vector 1: Analytical known vector (expected = 3.10) with exact C++ parity', () => {
      const features = [2.0, 1.5, 4.0, 1.0, 8.0, 3.0];
      // z0 = (2.0 - 1.5) / 0.5 = 1.0   -> 0.3 * 1.0   = 0.3
      // z1 = (1.5 - 1.0) / 1.0 = 0.5   -> -0.2 * 0.5  = -0.1
      // z2 = (4.0 - 2.0) / 2.0 = 1.0   -> 0.4 * 1.0   = 0.4
      // z3 = (1.0 - 0.5) / 0.5 = 1.0   -> -0.1 * 1.0  = -0.1
      // z4 = (8.0 - 6.0) / 2.0 = 1.0   -> 0.05 * 1.0  = 0.05
      // z5 = (3.0 - 4.0) / 1.0 = -1.0  -> -0.05 * -1.0 = 0.05
      // sum = 0.3 - 0.1 + 0.4 - 0.1 + 0.05 + 0.05 = 0.60
      // pred = 2.5 + 0.60 = 3.10
      const prediction = predictWithEdgeModel(validModel, features);
      const simulated = cppRidgePredict(validModel, features);

      expect(prediction).toBeCloseTo(3.10, 9);
      expect(Math.abs(prediction - simulated)).toBeLessThan(1e-9);
    });

    it('Vector 2: Zero vector features [0, 0, 0, 0, 0, 0]', () => {
      const features = [0, 0, 0, 0, 0, 0];
      const prediction = predictWithEdgeModel(validModel, features);
      const simulated = cppRidgePredict(validModel, features);

      expect(Math.abs(prediction - simulated)).toBeLessThan(1e-9);
      expect(prediction).toBe(simulated);
    });

    it('Vector 3: High-magnitude features vector', () => {
      const features = [15.2, 10.4, 18.0, 7.8, 10.0, 10.0];
      const prediction = predictWithEdgeModel(validModel, features);
      const simulated = cppRidgePredict(validModel, features);

      expect(Math.abs(prediction - simulated)).toBeLessThan(1e-9);
    });

    it('Vector 4: Feature exactly matching means (zero scaled feature)', () => {
      const features = [...validModel.means];
      const prediction = predictWithEdgeModel(validModel, features);
      const simulated = cppRidgePredict(validModel, features);

      expect(prediction).toBe(validModel.intercept);
      expect(Math.abs(prediction - simulated)).toBeLessThan(1e-9);
    });

    it('Vector 5: Negative result clamped to 0 matching C++ std::max(0.0, value)', () => {
      const negativeModel = {
        ...validModel,
        intercept: 0.5,
        weights: [-5.0, 0, 0, 0, 0, 0],
        means: [0, 0, 0, 0, 0, 0],
        scales: [1, 1, 1, 1, 1, 1]
      };
      const features = [1.0, 0, 0, 0, 0, 0];
      const prediction = predictWithEdgeModel(negativeModel, features);
      const simulated = cppRidgePredict(negativeModel, features, true);

      expect(prediction).toBe(0);
      expect(simulated).toBe(0);

      const raw = predictWithEdgeModel(negativeModel, features, { allowNegative: true });
      expect(raw).toBe(-4.5);
    });
  });

  describe('Prediction Input Strict Validation & Error Handling', () => {
    it('should validate feature input strictly: exactly 6 finite numbers required', () => {
      expect(() => predictWithEdgeModel(validModel, [1, 2, 3, 4, 5])).toThrow(/exactly 6 features/i);
      expect(() => predictWithEdgeModel(validModel, [1, 2, 3, 4, 5, 6, 7])).toThrow(/exactly 6 features/i);
      expect(() => predictWithEdgeModel(validModel, null)).toThrow(/exactly 6 features/i);
      expect(() => predictWithEdgeModel(validModel, [1, 2, NaN, 4, 5, 6])).toThrow(/finite number/i);
      expect(() => predictWithEdgeModel(validModel, [1, 2, Infinity, 4, 5, 6])).toThrow(/finite number/i);
      expect(() => predictWithEdgeModel(validModel, [1, 2, '3', 4, 5, 6])).toThrow(/finite number/i);
    });

    it('should reject model with missing means immediately (no silent fallback to 0)', () => {
      const modelNoMeans = {
        intercept: 2.5,
        weights: [0.3, -0.2, 0.4, -0.1, 0.05, -0.05],
        scales: [0.5, 1.0, 2.0, 0.5, 2.0, 1.0]
      };
      expect(() => predictWithEdgeModel(modelNoMeans, [2, 1, 4, 1, 8, 3]))
        .toThrow(/Model feature_means must have 6 items/i);
    });

    it('should reject non-positive scales immediately (scale <= 0)', () => {
      const modelZeroScale = {
        ...validModel,
        scales: [0.5, 0, 2.0, 0.5, 2.0, 1.0]
      };
      expect(() => predictWithEdgeModel(modelZeroScale, [2, 1, 4, 1, 8, 3]))
        .toThrow(/Feature scale at index 1 must be strictly positive and finite/i);

      const modelNegScale = {
        ...validModel,
        scales: [0.5, -1.0, 2.0, 0.5, 2.0, 1.0]
      };
      expect(() => predictWithEdgeModel(modelNegScale, [2, 1, 4, 1, 8, 3]))
        .toThrow(/Feature scale at index 1 must be strictly positive and finite/i);
    });

    it('should reject weights dimension != 6', () => {
      const model7Weights = {
        ...validModel,
        weights: [0.3, -0.2, 0.4, -0.1, 0.05, -0.05, 1.0]
      };
      expect(() => predictWithEdgeModel(model7Weights, [2, 1, 4, 1, 8, 3]))
        .toThrow(/Model weights must have exactly 6 items/i);
    });
  });

  describe('predictMatchWithEdge & Match Chronology', () => {
    const validMatch = {
      date: '2026-10-02',
      source: 'matchendirect',
      sport: 'football',
      tournament: 'Ligue 1',
      home_team: 'Lens',
      away_team: 'Lille'
    };

    const validHistory = {
      last_match_date: '2026-10-01',
      teams: {
        [JSON.stringify(['matchendirect', 'football', 'Ligue 1', 'Lens'])]: [1.8, 1.0, 5],
        [JSON.stringify(['matchendirect', 'football', 'Ligue 1', 'Lille'])]: [1.6, 1.2, 5]
      }
    };

    it('should accept match when match.date > history.last_match_date', () => {
      const pred = predictMatchWithEdge(validMatch, validHistory, validModel);
      expect(typeof pred).toBe('number');
      expect(Number.isFinite(pred)).toBe(true);
      expect(pred).toBeGreaterThan(0);
    });

    it('should strictly reject match when match.date <= history.last_match_date (equal date)', () => {
      const sameDayMatch = { ...validMatch, date: '2026-10-01' };
      expect(() => {
        predictMatchWithEdge(sameDayMatch, validHistory, validModel);
      }).toThrowError('Prediction date must be later than every match in the artifact history (match: 2026-10-01, last_history: 2026-10-01)');
    });

    it('should strictly reject match when match.date < history.last_match_date (prior date)', () => {
      const priorMatch = { ...validMatch, date: '2026-09-25' };
      expect(() => {
        predictMatchWithEdge(priorMatch, validHistory, validModel);
      }).toThrowError('Prediction date must be later than every match in the artifact history (match: 2026-09-25, last_history: 2026-10-01)');
    });

    it('should strictly reject prediction when history.last_match_date is missing or invalid', () => {
      expect(() => predictMatchWithEdge(validMatch, { ...validHistory, last_match_date: undefined }, validModel))
        .toThrowError('Artifact history is missing valid last_match_date');

      expect(() => predictMatchWithEdge(validMatch, { ...validHistory, last_match_date: '' }, validModel))
        .toThrowError('Artifact history is missing valid last_match_date');

      expect(() => predictMatchWithEdge(validMatch, { ...validHistory, last_match_date: '01/10/2026' }, validModel))
        .toThrowError('Artifact history is missing valid last_match_date');
    });

    it('should reject missing required match parameters without applying silent defaults', () => {
      expect(() => predictMatchWithEdge({ ...validMatch, source: '' }, validHistory, validModel))
        .toThrow(/Missing required match parameter: source/i);

      expect(() => predictMatchWithEdge({ ...validMatch, sport: '' }, validHistory, validModel))
        .toThrow(/Missing or invalid required match parameter: sport/i);

      expect(() => predictMatchWithEdge({ ...validMatch, tournament: '' }, validHistory, validModel))
        .toThrow(/Missing required match parameter: tournament/i);

      expect(() => predictMatchWithEdge({ ...validMatch, home_team: '' }, validHistory, validModel))
        .toThrow(/Missing required match parameter: home_team/i);

      expect(() => predictMatchWithEdge({ ...validMatch, away_team: '' }, validHistory, validModel))
        .toThrow(/Missing required match parameter: away_team/i);

      expect(() => predictMatchWithEdge({ ...validMatch, away_team: 'Lens' }, validHistory, validModel))
        .toThrow(/cannot be identical/i);

      expect(() => predictMatchWithEdge({ ...validMatch, date: 'invalid-date' }, validHistory, validModel))
        .toThrow(/Missing or invalid match date/i);
    });

    it('should reject team when missing or has fewer than 3 prior matches in history', () => {
      const unknownTeamMatch = { ...validMatch, away_team: 'Marseille' };
      expect(() => predictMatchWithEdge(unknownTeamMatch, validHistory, validModel))
        .toThrow(/No usable history for team: Marseille/i);

      const insufficientHistory = {
        last_match_date: '2026-10-01',
        teams: {
          [JSON.stringify(['matchendirect', 'football', 'Ligue 1', 'Lens'])]: [1.8, 1.0, 2],
          [JSON.stringify(['matchendirect', 'football', 'Ligue 1', 'Lille'])]: [1.6, 1.2, 5]
        }
      };
      expect(() => predictMatchWithEdge(validMatch, insufficientHistory, validModel))
        .toThrow(/At least three prior matches required for team: Lens/i);
    });
  });

  describe('isValidMatchDate strict format validation', () => {
    it('should accept valid dates in YYYY-MM-DD format', () => {
      expect(isValidMatchDate('2026-10-05')).toBe(true);
      expect(isValidMatchDate('2024-02-29')).toBe(true); // Leap year
      expect(isValidMatchDate('2000-01-01')).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(isValidMatchDate('2026-02-29')).toBe(false); // Non-leap year
      expect(isValidMatchDate('2026-13-01')).toBe(false); // Invalid month
      expect(isValidMatchDate('2026-00-10')).toBe(false);
      expect(isValidMatchDate('2026-04-31')).toBe(false); // April has 30 days
      expect(isValidMatchDate('05/10/2026')).toBe(false); // Slashes
      expect(isValidMatchDate('')).toBe(false);
      expect(isValidMatchDate(null)).toBe(false);
      expect(isValidMatchDate(12345)).toBe(false);
    });
  });
});
