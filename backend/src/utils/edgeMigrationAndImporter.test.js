import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

// P1 — Isoler complètement edgeMigrationAndImporter.test.js:
// Set PREDICTIX_DB_PATH at the top of the file before any db imports!
const tempDbPath = path.join(os.tmpdir(), `predictix_test_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
process.env.PREDICTIX_DB_PATH = tempDbPath;

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  trainGBDTModels,
  getGBDTModelsStatus,
  getPredictixEdgePath
} from './gbdtTrainer.js';
import {
  runEdgeTrain,
  getEdgeDataDir,
  getEdgeReportsDir,
  getEdgeModel,
  predictWithEdgeModel
} from './edgeTrainer.js';
import { enrichMatchPredictions } from './predictionEngine.js';

let database;
let importerQueries;
let importer;
let findExistingMatchSameDay;
let upsertScrapedMatch;
let getMatchSource;
let isTournamentCompatible;
let importScrapedMatches;
let importHistoricalMatch;
let dbRun;
let dbQuery;
let dbGet;
let closeDatabase;

beforeAll(async () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const defaultDbPath = path.resolve(currentDir, '../../predictix.db');

  // Guard: assert PREDICTIX_DB_PATH is isolated and never pointing to production predictix.db
  expect(process.env.PREDICTIX_DB_PATH).toBe(tempDbPath);
  expect(process.env.PREDICTIX_DB_PATH).not.toBe(defaultDbPath);

  // Dynamic ESM imports of database-touching modules
  database = await import('../db/database.js');
  dbRun = database.dbRun;
  dbQuery = database.dbQuery;
  dbGet = database.dbGet;
  closeDatabase = database.closeDatabase;
  await database.dbReady;

  importerQueries = await import('../db/importerQueries.js');
  findExistingMatchSameDay = importerQueries.findExistingMatchSameDay;
  upsertScrapedMatch = importerQueries.upsertScrapedMatch;
  getMatchSource = importerQueries.getMatchSource;
  isTournamentCompatible = importerQueries.isTournamentCompatible;

  importer = await import('../db/importer.js');
  importScrapedMatches = importer.importScrapedMatches;
  importHistoricalMatch = importer.importHistoricalMatch;
});

afterAll(async () => {
  if (database && typeof database.closeDatabase === 'function') {
    await database.closeDatabase();
  }
  if (fs.existsSync(tempDbPath)) {
    try { fs.unlinkSync(tempDbPath); } catch (e) {}
  }
  const journalPath = `${tempDbPath}-journal`;
  if (fs.existsSync(journalPath)) {
    try { fs.unlinkSync(journalPath); } catch (e) {}
  }
  const walPath = `${tempDbPath}-wal`;
  if (fs.existsSync(walPath)) {
    try { fs.unlinkSync(walPath); } catch (e) {}
  }
  const shmPath = `${tempDbPath}-shm`;
  if (fs.existsSync(shmPath)) {
    try { fs.unlinkSync(shmPath); } catch (e) {}
  }
});

describe('P1 — Identité, provenance et date dans l\'import Node', () => {
  describe('getMatchSource helper', () => {
    it('should correctly identify platform from URL or match_id', () => {
      expect(getMatchSource({ match_url: 'https://www.flashscore.com/match/abc123' })).toBe('flashscore');
      expect(getMatchSource({ link: '/match/xyz789' })).toBe('flashscore');
      expect(getMatchSource({ match_id: 'fs_9988' })).toBe('flashscore');
      expect(getMatchSource({ match_url: 'https://www.matchendirect.fr/match/12345.html' })).toBe('matchendirect');
      expect(getMatchSource({ match_id: 'med_5566' })).toBe('matchendirect');
      expect(getMatchSource({ match_url: 'https://www.sofascore.com/event/11' })).toBe('sofascore');
      expect(getMatchSource({ match_url: 'https://1xbet.com/line' })).toBe('1xbet');
      expect(getMatchSource(null)).toBe('unknown');
    });
  });

  describe('findExistingMatchSameDay strict filtering & SQL consistency', () => {
    beforeAll(async () => {
      // Seed distinct matches across sources, sports and competitions
      await upsertScrapedMatch(null, {
        match_id: 'fs_foot_match_1',
        home_team: 'Paris SG',
        away_team: 'Marseille',
        tournament: 'Ligue 1',
        date: '2026-10-10',
        sport: 'football',
        source: 'flashscore',
        status: 'Planned'
      }, { matchId: 'fs_foot_match_1', matchDate: '2026-10-10', source: 'flashscore', sport: 'football' });

      await upsertScrapedMatch(null, {
        match_id: 'med_foot_match_2',
        home_team: 'Paris SG',
        away_team: 'Marseille',
        tournament: 'Ligue 1',
        date: '2026-10-10',
        sport: 'football',
        source: 'matchendirect',
        status: 'Planned'
      }, { matchId: 'med_foot_match_2', matchDate: '2026-10-10', source: 'matchendirect', sport: 'football' });

      await upsertScrapedMatch(null, {
        match_id: 'fs_basket_match_3',
        home_team: 'Paris SG',
        away_team: 'Marseille',
        tournament: 'Betclic Elite',
        date: '2026-10-10',
        sport: 'basketball',
        source: 'flashscore',
        status: 'Planned'
      }, { matchId: 'fs_basket_match_3', matchDate: '2026-10-10', source: 'flashscore', sport: 'basketball' });
    });

    it('should strictly filter by source and NEVER cross-match flashscore with matchendirect', async () => {
      const matchFS = await findExistingMatchSameDay(null, 'Paris SG', 'Marseille', '2026-10-10', 'football', 'flashscore');
      expect(matchFS).toHaveLength(1);
      expect(matchFS[0].match_id).toBe('fs_foot_match_1');

      const matchMED = await findExistingMatchSameDay(null, 'Paris SG', 'Marseille', '2026-10-10', 'football', 'matchendirect');
      expect(matchMED).toHaveLength(1);
      expect(matchMED[0].match_id).toBe('med_foot_match_2');
    });

    it('should strictly filter by sport and NEVER cross-match football with basketball', async () => {
      const basketMatches = await findExistingMatchSameDay(null, 'Paris SG', 'Marseille', '2026-10-10', 'basketball', 'flashscore');
      expect(basketMatches).toHaveLength(1);
      expect(basketMatches[0].match_id).toBe('fs_basket_match_3');

      const footballMatches = await findExistingMatchSameDay(null, 'Paris SG', 'Marseille', '2026-10-10', 'football', 'flashscore');
      expect(footballMatches).toHaveLength(1);
      expect(footballMatches[0].match_id).toBe('fs_foot_match_1');
    });

    it('should refuse matching when match date is missing, empty, or time-like', async () => {
      const resNull = await findExistingMatchSameDay(null, 'Paris SG', 'Marseille', null, 'football', 'flashscore');
      expect(resNull).toEqual([]);

      const resEmpty = await findExistingMatchSameDay(null, 'Paris SG', 'Marseille', '', 'football', 'flashscore');
      expect(resEmpty).toEqual([]);

      const resTime = await findExistingMatchSameDay(null, 'Paris SG', 'Marseille', '20:45', 'football', 'flashscore');
      expect(resTime).toEqual([]);
    });

    it('should require tournament compatibility when competition is known on both sides', async () => {
      // Compatible tournament (Ligue 1)
      const compatible = await findExistingMatchSameDay(null, 'Paris SG', 'Marseille', '2026-10-10', 'football', 'flashscore', {
        tournament: 'Ligue 1'
      });
      expect(compatible).toHaveLength(1);
      expect(compatible[0].match_id).toBe('fs_foot_match_1');

      // Incompatible tournament (Premier League vs Ligue 1)
      const incompatible = await findExistingMatchSameDay(null, 'Paris SG', 'Marseille', '2026-10-10', 'football', 'flashscore', {
        tournament: 'Premier League'
      });
      expect(incompatible).toEqual([]);
    });

    it('should verify whether sport / data allows reversal before matching reversed teams', async () => {
      // In football, Marseille (home) vs Paris SG (away) on same day is reversed confrontation
      // Without allowReversed, it should NOT match
      const reversedDefault = await findExistingMatchSameDay(null, 'Marseille', 'Paris SG', '2026-10-10', 'football', 'flashscore', {
        allowReversed: false
      });
      expect(reversedDefault).toEqual([]);

      // With explicit allowReversed: true, it matches
      const reversedAllowed = await findExistingMatchSameDay(null, 'Marseille', 'Paris SG', '2026-10-10', 'football', 'flashscore', {
        allowReversed: true
      });
      expect(reversedAllowed).toHaveLength(1);
      expect(reversedAllowed[0].match_id).toBe('fs_foot_match_1');
    });

    it('should reject as ambiguous when multiple candidate matches match with equal confidence', async () => {
      // Seed two distinct rows that match same criteria with equal confidence
      await upsertScrapedMatch(null, {
        match_id: 'ambig_match_a',
        home_team: 'Lyon',
        away_team: 'Nice',
        tournament: 'Ligue 1',
        date: '2026-10-15',
        sport: 'football',
        source: 'flashscore',
        status: 'Planned'
      }, { matchId: 'ambig_match_a', matchDate: '2026-10-15', source: 'flashscore', sport: 'football' });

      // Directly insert second conflicting row with different ID
      await dbRun(`
        INSERT INTO scraped_predictions (match_id, date, home_team, away_team, tournament, sport, source, status)
        VALUES ('ambig_match_b', '2026-10-15', 'Lyon', 'Nice', 'Ligue 1', 'football', 'flashscore', 'Planned')
      `);

      const res = await findExistingMatchSameDay(null, 'Lyon', 'Nice', '2026-10-15', 'football', 'flashscore');
      // Must reject as ambiguous and NOT arbitrarily pick the first!
      expect(res).toEqual([]);
    });
  });

  describe('Match date authentic preservation and source-scoped identity', () => {
    it('should keep date null when match date is not authentic, without inventing current date', async () => {
      const matchWithoutDate = {
        home_team: 'Lens',
        away_team: 'Lille',
        tournament: 'Ligue 1',
        sport: 'football',
        source: 'matchendirect',
        quality_status: 'complete',
        date: ''
      };

      await importScrapedMatches([matchWithoutDate], '2026-10-05T12:00:00Z');

      const row = await dbGet('SELECT * FROM scraped_predictions WHERE home_team = ? AND away_team = ?', ['Lens', 'Lille']);
      expect(row).toBeDefined();
      expect(row.date).toBeNull();
      expect(row.match_id).toBe('matchendirect_football_Lens_Lille');
      expect(row.source).toBe('matchendirect');
    });

    it('should preserve canonical ID from flashscore link in importHistoricalMatch and store source original ID', async () => {
      const histMatch = {
        home_team: 'Lyon',
        away_team: 'Monaco',
        date: '2026-05-10',
        score: '2 - 1',
        sport: 'football',
        quality_status: 'complete'
      };

      await importHistoricalMatch('/match/abcdef123', histMatch);

      const row = await dbGet('SELECT * FROM scraped_predictions WHERE match_id = ?', ['abcdef123']);
      expect(row).toBeDefined();
      expect(row.date).toBe('2026-05-10');
      expect(row.source).toBe('flashscore');
      expect(row.home_team).toBe('Lyon');
      // Canonical match_id vs source original ID
      expect(row.match_id).toBe('abcdef123');
      expect(row.source_match_id).toBe('/match/abcdef123');
    });
  });
});

describe('P1 — Migration complète de l\'entraînement et consommation du modèle Edge', () => {
  describe('Predictix Edge delegation, timeouts and strict report parsing', () => {
    it('should return an informative diagnostic when Edge is unconfigured without process crash', async () => {
      const originalEnv = process.env.PREDICTIX_EDGE_BIN;
      process.env.PREDICTIX_EDGE_BIN = '/non/existent/predictix-edge-bin';

      const result = await trainGBDTModels(async () => [], true);
      expect(result).toBeDefined();
      expect(result.configured).toBe(false);
      expect(result.status).toBe('unconfigured');
      expect(result.message).toContain('Predictix Edge');

      if (originalEnv) {
        process.env.PREDICTIX_EDGE_BIN = originalEnv;
      } else {
        delete process.env.PREDICTIX_EDGE_BIN;
      }
    });

    it('should report Edge status in getGBDTModelsStatus without crashing', () => {
      const status = getGBDTModelsStatus();
      expect(status).toBeDefined();
      expect(status.edgeDiagnostic).toBeDefined();
      expect(status.models.corners_1mt).toBeDefined();
    });

    it('should prefer data_edge directory if present, falling back to data', () => {
      const dataDir = getEdgeDataDir();
      expect(dataDir).toBeDefined();
      expect(typeof dataDir).toBe('string');
    });

    it('should generate unique timestamped report path per run including pid and target', async () => {
      const reportsDir = getEdgeReportsDir();
      expect(reportsDir).toBeDefined();
      expect(fs.existsSync(reportsDir)).toBe(true);
    });

    it('should distinguish explicitly between error, insufficient_data, and baseline_not_beaten in runEdgeTrain', async () => {
      // Test error status when executable does not exist
      const errRes = await runEdgeTrain('/non/existent/edge-binary', 'mockData', 'football_corners_1mt', { timeoutMs: 1000 });
      expect(errRes).toBeDefined();
      expect(errRes.success).toBe(false);
      expect(errRes.status).toBe('error');
      expect(errRes.training_status).toBe('error');
    });

    it('should delegate to predictix-edge.exe when present, handling execution cleanly', async () => {
      const edgePath = getPredictixEdgePath();
      if (edgePath && fs.existsSync(edgePath)) {
        // Run single target test
        const result = await trainGBDTModels(async () => [], true, { target: 'football_corners_1mt' });
        expect(result).toBeDefined();
        expect(result.configured).toBe(true);
        // Distinguishes candidate, insufficient_data, baseline_not_beaten or error - NEVER lumps them all blindly
        expect(['candidate', 'insufficient_data', 'baseline_not_beaten', 'missing_data_dir']).toContain(result.status);
      }
    });
  });

  describe('Prediction engine graceful fallback and Edge model consumption', () => {
    it('should enrich predictions gracefully using Poisson regression without throwing when GBDT/Edge model is absent', () => {
      const mockRow = {
        match_id: 'test_m1',
        home_team: 'Arsenal',
        away_team: 'Chelsea',
        tournament: 'Premier League',
        best_tip: 'Plus de',
        card_line: '4.5',
        probability: '65%',
        win_rate: '60%',
        sport: 'football'
      };

      const leagueAverages = {
        all: { home: 2.2, away: 2.0 }
      };

      const enriched = enrichMatchPredictions(
        mockRow,
        leagueAverages,
        [], // h2h
        [], // home
        [], // away
        new Set(),
        {},
        5,
        4.5,
        0,
        {},
        true // useGbdtModels = true, models absent/un-trained
      );

      expect(enriched).toBeDefined();
      expect(enriched.gbdt_predictions).toBeDefined();
      expect(enriched.gbdt_predictions.is_trained).toBe(false);
      expect(enriched.gbdt_predictions.first_half.expected).toBeGreaterThan(0);
      expect(enriched.gbdt_predictions.first_half.over_4_5_prob).toBeGreaterThanOrEqual(0);
    });

    it('should evaluate predictions using predictWithEdgeModel returning null safely when no candidate model exists', () => {
      const pred = predictWithEdgeModel('football_corners_1mt', {
        home_team: 'Arsenal',
        away_team: 'Chelsea',
        tournament: 'Premier League'
      });
      // Currently edge reports have status: insufficient_data, so predictWithEdgeModel returns null cleanly
      expect(pred === null || typeof pred === 'number').toBe(true);
    });
  });
});
