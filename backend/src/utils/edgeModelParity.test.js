import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateEdgeArtifact,
  SUPPORTED_SCHEMA_VERSIONS,
  SUPPORTED_ALGORITHMS,
  VALID_TARGETS,
  EXPECTED_FEATURE_NAMES
} from './edgeArtifactValidator.js';
import { clearEdgeModelsCache } from './edgeTrainer.js';

describe('P1 — Edge Model Parity & Schema Alignment (C++ features.cpp / model.cpp)', () => {
  beforeEach(() => {
    clearEdgeModelsCache();
  });

  // Base valid artifact fixture aligned strictly with C++ src/model.cpp and src/features.cpp
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

  describe('Strict Algorithm & Schema Alignment', () => {
    it('should accept a fully valid candidate artifact with exact schema and ridge_batch_gradient_v1', () => {
      const artifact = createValidArtifact();
      const res = validateEdgeArtifact(artifact, 'football_corners_1mt');
      expect(res.valid).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it('should strictly reject ridge_regression matching C++ model.cpp rejection', () => {
      const art = createValidArtifact();
      art.model.algorithm = 'ridge_regression';
      const res = validateEdgeArtifact(art, 'football_corners_1mt');
      expect(res.valid).toBe(false);
      expect(res.reason).toBe("Unsupported algorithm: must be 'ridge_batch_gradient_v1'");
    });

    it('should only support ridge_batch_gradient_v1 in SUPPORTED_ALGORITHMS', () => {
      expect(SUPPORTED_ALGORITHMS).toEqual(['ridge_batch_gradient_v1']);
      expect(SUPPORTED_ALGORITHMS).not.toContain('ridge_regression');
    });

    it('should strictly reject any other unsupported algorithms', () => {
      const invalidAlgorithms = ['random_forest', 'gradient_boost', 'linear_regression', 'svm', ''];
      for (const alg of invalidAlgorithms) {
        const art = createValidArtifact();
        art.model.algorithm = alg;
        const res = validateEdgeArtifact(art);
        expect(res.valid).toBe(false);
        expect(res.reason).toBe("Unsupported algorithm: must be 'ridge_batch_gradient_v1'");
      }
    });

    it('should require artifact.feature_schema === rolling-counts/2 strictly', () => {
      // Missing feature_schema
      const artMissing = createValidArtifact();
      delete artMissing.feature_schema;
      const resMissing = validateEdgeArtifact(artMissing);
      expect(resMissing.valid).toBe(false);
      expect(resMissing.reason).toMatch(/Unsupported feature_schema/i);

      // Wrong feature_schema
      const artWrong = createValidArtifact({ feature_schema: 'rolling-counts/1' });
      const resWrong = validateEdgeArtifact(artWrong);
      expect(resWrong.valid).toBe(false);
      expect(resWrong.reason).toMatch(/Unsupported feature_schema/i);
    });

    it('should require artifact.model to exist as an object (no loose fallback where root is treated as model)', () => {
      // Root-only model fields without artifact.model object
      const artRootOnly = {
        schema_version: 'predictix-edge-model/1',
        feature_schema: 'rolling-counts/2',
        target: 'football_corners_1mt',
        sport: 'football',
        status: 'candidate',
        algorithm: 'ridge_batch_gradient_v1',
        lambda: 0.1,
        intercept: 2.35,
        means: [1.2, 1.1, 1.3, 1.0, 5.0, 5.0],
        scales: [0.8, 0.7, 0.9, 0.6, 2.0, 2.0],
        weights: [0.15, -0.10, 0.20, -0.15, 0.05, -0.05],
        feature_names: EXPECTED_FEATURE_NAMES
      };
      const res = validateEdgeArtifact(artRootOnly);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/Artifact must contain a valid model object/i);

      // Null or non-object model
      expect(validateEdgeArtifact(createValidArtifact({ model: null })).valid).toBe(false);
      expect(validateEdgeArtifact(createValidArtifact({ model: 'not-an-object' })).valid).toBe(false);
      expect(validateEdgeArtifact(createValidArtifact({ model: [1, 2, 3] })).valid).toBe(false);
    });

    it('should reject loose alias fields on model (feature_scales, feature_means)', () => {
      const artAliases = createValidArtifact();
      artAliases.model.feature_scales = [1, 1, 1, 1, 1, 1];
      const res = validateEdgeArtifact(artAliases);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/loose alias fields/i);

      const artAliases2 = createValidArtifact();
      artAliases2.model.feature_means = [1, 1, 1, 1, 1, 1];
      const res2 = validateEdgeArtifact(artAliases2);
      expect(res2.valid).toBe(false);
      expect(res2.reason).toMatch(/loose alias fields/i);
    });
  });

  describe('Artifact Schema & Envelope Validation', () => {
    it('should strictly reject non-exact or legacy schema versions', () => {
      const legacyVersions = ['predictix-edge/1', '1.0.0', '1.0', '2.0.0', 'predictix-edge/2'];
      for (const ver of legacyVersions) {
        const art = createValidArtifact({ schema_version: ver });
        const res = validateEdgeArtifact(art, 'football_corners_1mt');
        expect(res.valid).toBe(false);
        expect(res.reason).toMatch(/Unsupported schema_version/i);
      }

      const missingSchema = createValidArtifact({ schema_version: '' });
      expect(validateEdgeArtifact(missingSchema).valid).toBe(false);
    });

    it('should reject non-object or null artifact', () => {
      expect(validateEdgeArtifact(null).valid).toBe(false);
      expect(validateEdgeArtifact(undefined).valid).toBe(false);
      expect(validateEdgeArtifact('string').valid).toBe(false);
      expect(validateEdgeArtifact(12345).valid).toBe(false);
    });

    it('should strictly reject non-candidate status', () => {
      const nonCandidateStatuses = ['insufficient_data', 'baseline_not_beaten', 'error', 'ready', 'draft', ''];
      for (const st of nonCandidateStatuses) {
        const art = createValidArtifact({ status: st });
        const res = validateEdgeArtifact(art, 'football_corners_1mt');
        expect(res.valid).toBe(false);
        expect(res.reason).toMatch(/Artifact status must be 'candidate'/i);
      }
    });

    it('should accept all 6 valid targets and reject unknown targets', () => {
      for (const t of VALID_TARGETS) {
        const sport = t.startsWith('football_') ? 'football' : 'basketball';
        const art = createValidArtifact({ target: t, sport });
        const res = validateEdgeArtifact(art, t);
        expect(res.valid).toBe(true);
      }

      const unknownTargets = ['football_goals_ft', 'football_cards_ft', 'tennis_sets', 'basketball_assists'];
      for (const ut of unknownTargets) {
        const art = createValidArtifact({ target: ut });
        const res = validateEdgeArtifact(art);
        expect(res.valid).toBe(false);
        expect(res.reason).toMatch(/Unknown artifact target/i);
      }
    });

    it('should reject target mismatch when requested target differs', () => {
      const artifact = createValidArtifact({ target: 'football_corners_ft' });
      const res = validateEdgeArtifact(artifact, 'football_corners_1mt');
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/does not match requested target/i);
    });

    it('should reject sport mismatch with target prefix', () => {
      const sportMismatch = createValidArtifact({ sport: 'basketball', target: 'football_corners_1mt' });
      const res = validateEdgeArtifact(sportMismatch);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/does not match/i);
    });
  });

  describe('Model Hyperparameters & Feature Names', () => {
    it('should reject non-positive or non-finite lambda strictly matching C++', () => {
      const artZero = createValidArtifact();
      artZero.model.lambda = 0;
      expect(validateEdgeArtifact(artZero).valid).toBe(false);

      const artNeg = createValidArtifact();
      artNeg.model.lambda = -0.5;
      expect(validateEdgeArtifact(artNeg).valid).toBe(false);

      const artNaN = createValidArtifact();
      artNaN.model.lambda = NaN;
      expect(validateEdgeArtifact(artNaN).valid).toBe(false);

      const artInf = createValidArtifact();
      artInf.model.lambda = Infinity;
      expect(validateEdgeArtifact(artInf).valid).toBe(false);

      const artStr = createValidArtifact();
      artStr.model.lambda = '0.1';
      expect(validateEdgeArtifact(artStr).valid).toBe(false);
    });

    it('should reject permuted, missing or invalid feature_names strictly matching C++', () => {
      // Permuted feature names (swapped index 0 and 1)
      const artPermuted = createValidArtifact();
      artPermuted.model.feature_names = [
        'home_rolling_conceded',
        'home_rolling_scored',
        'away_rolling_scored',
        'away_rolling_conceded',
        'home_history_count',
        'away_history_count'
      ];
      let res = validateEdgeArtifact(artPermuted);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/Invalid feature_names at index 0/i);

      // Permuted at last indices
      const artPermutedEnd = createValidArtifact();
      artPermutedEnd.model.feature_names = [
        'home_rolling_scored',
        'home_rolling_conceded',
        'away_rolling_scored',
        'away_rolling_conceded',
        'away_history_count',
        'home_history_count'
      ];
      res = validateEdgeArtifact(artPermutedEnd);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/Invalid feature_names at index 4/i);

      // 5 feature names
      const art5Names = createValidArtifact();
      art5Names.model.feature_names = EXPECTED_FEATURE_NAMES.slice(0, 5);
      expect(validateEdgeArtifact(art5Names).valid).toBe(false);

      // Unknown feature name
      const artWrongName = createValidArtifact();
      artWrongName.model.feature_names = ['home_goals', ...EXPECTED_FEATURE_NAMES.slice(1)];
      expect(validateEdgeArtifact(artWrongName).valid).toBe(false);
    });
  });

  describe('Weights, Intercept, Scales and Means Dimensions & Finiteness', () => {
    it('should strictly reject weights dimension != 6', () => {
      const art7 = createValidArtifact();
      art7.model.weights = [0.15, -0.10, 0.20, -0.15, 0.05, -0.05, 2.35];
      expect(validateEdgeArtifact(art7).valid).toBe(false);

      const art5 = createValidArtifact();
      art5.model.weights = [0.15, -0.10, 0.20, -0.15, 0.05];
      expect(validateEdgeArtifact(art5).valid).toBe(false);
    });

    it('should reject non-finite weights (NaN, Infinity, -Infinity, string, boolean)', () => {
      for (const badWeight of [NaN, Infinity, -Infinity, '0.2', true, false]) {
        const art = createValidArtifact();
        art.model.weights = [0.1, badWeight, 0.3, 0.4, 0.5, 0.6];
        expect(validateEdgeArtifact(art).valid).toBe(false);
      }
    });

    it('should reject non-finite or missing intercept', () => {
      for (const badIntercept of [NaN, Infinity, -Infinity, undefined, '2.35']) {
        const art = createValidArtifact();
        art.model.intercept = badIntercept;
        expect(validateEdgeArtifact(art).valid).toBe(false);
      }
    });

    it('should reject zero, negative, or non-finite feature scales', () => {
      // 0 scale
      const artZero = createValidArtifact();
      artZero.model.scales = [1.0, 1.0, 0, 1.0, 1.0, 1.0];
      expect(validateEdgeArtifact(artZero).valid).toBe(false);

      // Negative scale
      const artNeg = createValidArtifact();
      artNeg.model.scales = [1.0, -0.5, 1.0, 1.0, 1.0, 1.0];
      expect(validateEdgeArtifact(artNeg).valid).toBe(false);

      // NaN scale
      const artNaN = createValidArtifact();
      artNaN.model.scales = [1.0, NaN, 1.0, 1.0, 1.0, 1.0];
      expect(validateEdgeArtifact(artNaN).valid).toBe(false);

      // Dimension mismatch
      const artScales5 = createValidArtifact();
      artScales5.model.scales = [1.0, 1.0, 1.0, 1.0, 1.0];
      expect(validateEdgeArtifact(artScales5).valid).toBe(false);
    });

    it('should strictly reject missing or non-finite feature means (mandatory)', () => {
      const artMissingMeans = createValidArtifact();
      delete artMissingMeans.model.means;
      expect(validateEdgeArtifact(artMissingMeans).valid).toBe(false);

      const artMeans5 = createValidArtifact();
      artMeans5.model.means = [0, 0, 0, 0, 0];
      expect(validateEdgeArtifact(artMeans5).valid).toBe(false);

      const artMeansNaN = createValidArtifact();
      artMeansNaN.model.means = [1.0, NaN, 1.0, 1.0, 1.0, 1.0];
      expect(validateEdgeArtifact(artMeansNaN).valid).toBe(false);
    });
  });

  describe('Detailed History Schema Mutations Parity', () => {
    it('should reject detailed history with fractional match count', () => {
      const artDetailed = createValidArtifact({
        history: {
          schema_version: 'predictix-edge-history/2',
          feature_schema: 'rolling-counts/2',
          window: 10,
          minimum_team_history: 3,
          maximum_age_days: 365,
          last_match_date: '2026-10-01',
          teams: {
            [JSON.stringify(['matchendirect', 'football', 'Ligue 1', 'Lens'])]: [1.8, 1.0, 3.5], // fractional count!
            [JSON.stringify(['matchendirect', 'football', 'Ligue 1', 'Lille'])]: [1.6, 1.2, 5]
          },
          team_games: {
            [JSON.stringify(['matchendirect', 'football', 'Ligue 1', 'Lens'])]: [
              { match_key: 'm1', date: '2026-09-10', scored: 2, conceded: 1, home: true },
              { match_key: 'm2', date: '2026-09-20', scored: 1, conceded: 1, home: false },
              { match_key: 'm3', date: '2026-10-01', scored: 2, conceded: 1, home: true }
            ],
            [JSON.stringify(['matchendirect', 'football', 'Ligue 1', 'Lille'])]: [
              { match_key: 'm4', date: '2026-09-05', scored: 1, conceded: 1, home: true },
              { match_key: 'm5', date: '2026-09-12', scored: 2, conceded: 1, home: false },
              { match_key: 'm6', date: '2026-09-19', scored: 1, conceded: 2, home: true },
              { match_key: 'm7', date: '2026-09-26', scored: 2, conceded: 1, home: false },
              { match_key: 'm8', date: '2026-10-01', scored: 2, conceded: 1, home: true }
            ]
          }
        }
      });
      const res = validateEdgeArtifact(artDetailed);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/Invalid history window or summary|History summary differs/i);
    });
  });
});
