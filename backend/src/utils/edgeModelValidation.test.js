import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  validateEdgeArtifact,
  predictWithEdgeModel,
  predictMatchWithEdge,
  isValidMatchDate,
  makeTeamKey,
  clearEdgeModelsCache
} from './edgeTrainer.js';
import { enrichMatchPredictions } from './predictionEngine.js';

describe('P1 — High-Level Edge Model Integration & Architectural Boundaries', () => {
  beforeEach(() => {
    clearEdgeModelsCache();
  });

  const createValidArtifact = (overrides = {}) => ({
    schema_version: 'predictix-edge-model/1',
    feature_schema: 'rolling-counts/2',
    target: 'football_corners_1mt',
    sport: 'football',
    status: 'candidate',
    model: {
      algorithm: 'ridge_batch_gradient_v1',
      lambda: 0.1,
      intercept: 2.35,
      means: [1.2, 1.1, 1.3, 1.0, 5.0, 5.0],
      scales: [0.8, 0.7, 0.9, 0.6, 2.0, 2.0],
      weights: [0.15, -0.10, 0.20, -0.15, 0.05, -0.05],
      feature_names: [
        'home_rolling_scored',
        'home_rolling_conceded',
        'away_rolling_scored',
        'away_rolling_conceded',
        'home_history_count',
        'away_history_count'
      ]
    },
    history: {
      window: 10,
      minimum_team_history: 3,
      last_match_date: '2026-10-01',
      teams: {
        [JSON.stringify(['matchendirect', 'football', 'Ligue 1', 'Lens'])]: [1.8, 1.0, 5],
        [JSON.stringify(['matchendirect', 'football', 'Ligue 1', 'Lille'])]: [1.6, 1.2, 5]
      }
    },
    ...overrides
  });

  describe('End-to-End Pipeline Integration', () => {
    it('should validate candidate artifact and predict end-to-end with match object', () => {
      const artifact = createValidArtifact();
      expect(validateEdgeArtifact(artifact).valid).toBe(true);

      const match = {
        date: '2026-10-05',
        source: 'matchendirect',
        sport: 'football',
        tournament: 'Ligue 1',
        home_team: 'Lens',
        away_team: 'Lille'
      };

      const predDirect = predictMatchWithEdge(match, artifact.history, artifact.model);
      expect(typeof predDirect).toBe('number');
      expect(Number.isFinite(predDirect)).toBe(true);
      expect(predDirect).toBeGreaterThan(0);

      // Target-based invocation with mock resolver
      const predLookup = predictWithEdgeModel('football_corners_1mt', match, {
        loadArtifact: () => artifact
      });
      expect(predLookup).toBe(predDirect);
    });

    it('should return null when loaded artifact fails candidate validation', () => {
      const invalidArtifact = createValidArtifact({ status: 'insufficient_data' });
      const match = {
        date: '2026-10-05',
        source: 'matchendirect',
        sport: 'football',
        tournament: 'Ligue 1',
        home_team: 'Lens',
        away_team: 'Lille'
      };

      const result = predictWithEdgeModel('football_corners_1mt', match, {
        loadArtifact: () => invalidArtifact
      });
      expect(result).toBeNull();
    });
  });

  describe('Integration with predictionEngine (enrichMatchPredictions)', () => {
    it('should handle chronology rejection gracefully without process crash and fallback to Poisson', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const pastMatchRow = {
        home_team: 'Lens',
        away_team: 'Lille',
        tournament: 'Ligue 1',
        date: '2026-09-15',
        sport: 'football',
        source: 'matchendirect',
        over_odds: '1.90',
        under_odds: '1.90',
        time: '21:00'
      };

      const result = enrichMatchPredictions(
        pastMatchRow,
        {},
        [],
        [],
        [],
        new Set(),
        {},
        5,
        4.5,
        0,
        {},
        true
      );

      expect(result).toBeDefined();
      expect(result.gbdt_predictions).toBeDefined();
      expect(result.gbdt_predictions.first_half.expected).toBeGreaterThan(0);
      expect(result.gbdt_predictions.first_half.over_4_5_prob).toBeGreaterThanOrEqual(0);

      warnSpy.mockRestore();
    });
  });

  describe('Submodule Export Integrity & Architectural Limits', () => {
    it('should export all expected symbols from edgeArtifactValidator.js', async () => {
      const mod = await import('./edgeArtifactValidator.js');
      expect(typeof mod.validateEdgeArtifact).toBe('function');
      expect(mod.SUPPORTED_SCHEMA_VERSIONS).toEqual(['predictix-edge-model/1']);
      expect(mod.SUPPORTED_ALGORITHMS).toEqual(['ridge_batch_gradient_v1']);
      expect(mod.VALID_TARGETS).toHaveLength(6);
      expect(mod.EXPECTED_FEATURE_NAMES).toHaveLength(6);
    });

    it('should export all expected symbols from edgeModelPredictor.js', async () => {
      const mod = await import('./edgeModelPredictor.js');
      expect(typeof mod.predictWithEdgeModel).toBe('function');
      expect(typeof mod.predictMatchWithEdge).toBe('function');
      expect(typeof mod.isValidMatchDate).toBe('function');
      expect(typeof mod.makeTeamKey).toBe('function');
    });

    it('should maintain edgeTrainer.js line count strictly below 300 lines', () => {
      const edgeTrainerPath = path.resolve(process.cwd(), 'src/utils/edgeTrainer.js');
      const lines = fs.readFileSync(edgeTrainerPath, 'utf8').split('\n').length;
      expect(lines).toBeLessThan(300);
    });

    it('should maintain edgeModelValidation.test.js line count strictly below 200 lines', () => {
      const testPath = path.resolve(process.cwd(), 'src/utils/edgeModelValidation.test.js');
      const lines = fs.readFileSync(testPath, 'utf8').split('\n').length;
      expect(lines).toBeLessThan(200);
    });
  });
});
