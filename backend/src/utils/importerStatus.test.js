import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { normalizeMatchStatus, isMatchEligibleForImport, isMultiSportLivePeriod } from './statusNormalizer.js';

// Isolate SQLite database path before importer.js / database.js initialization
const tempDbPath = path.join(os.tmpdir(), `predictix_test_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
process.env.PREDICTIX_DB_PATH = tempDbPath;

let importHistoricalMatch;
let closeDatabase;

beforeAll(async () => {
  const importerModule = await import('../db/importer.js');
  importHistoricalMatch = importerModule.importHistoricalMatch;
  const dbModule = await import('../db/database.js');
  closeDatabase = dbModule.closeDatabase;
});

afterAll(async () => {
  if (typeof closeDatabase === 'function') {
    await closeDatabase();
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

describe('Match Status & Integrity Logic (Unified statusNormalizer)', () => {
  describe('Status Normalization with Score (Never deduce finished from score dash alone)', () => {
    it('should NOT treat a postponed match with a score as finished', () => {
      const match = { status: 'Postponed', score: '0 - 0', time: 'Reporté' };
      const res = normalizeMatchStatus(match);
      expect(res.status).toBe('Postponed');
      expect(res.isLive).toBe(0);
      expect(res.isFinished).toBe(0);
    });

    it('should NOT treat a cancelled match with a score as finished', () => {
      const match = { status: 'Cancelled', score: '1 - 1', time: 'Annulé' };
      const res = normalizeMatchStatus(match);
      expect(res.status).toBe('Cancelled');
      expect(res.isLive).toBe(0);
      expect(res.isFinished).toBe(0);
    });

    it('should NOT treat a live match with a score as finished', () => {
      const match = { status: 'Live', score: '2 - 1', time: "65'" };
      const res = normalizeMatchStatus(match);
      expect(res.status).toBe('Live');
      expect(res.isLive).toBe(1);
      expect(res.isFinished).toBe(0);
    });

    it('should NOT treat an unknown/planned match with a score as finished simply because of dash', () => {
      const match = { status: '', score: '0 - 0', time: '20:45' };
      const res = normalizeMatchStatus(match);
      expect(res.status).toBe('Planned');
      expect(res.isLive).toBe(0);
      expect(res.isFinished).toBe(0);
    });

    it('should prioritize explicit Cancelled status over clock time', () => {
      const match = { status: 'Cancelled', time: "45'", score: '1 - 0' };
      const res = normalizeMatchStatus(match);
      expect(res.status).toBe('Cancelled');
      expect(res.isLive).toBe(0);
      expect(res.isFinished).toBe(0);
    });

    it('should prioritize explicit Postponed status over live text', () => {
      const match = { status: 'Postponed', time: 'Live', score: '0 - 0' };
      const res = normalizeMatchStatus(match);
      expect(res.status).toBe('Postponed');
      expect(res.isLive).toBe(0);
      expect(res.isFinished).toBe(0);
    });

    it('should correctly mark Finished when explicit status is Finished', () => {
      const match = { status: 'Finished', score: '3 - 1', time: 'FT' };
      const res = normalizeMatchStatus(match);
      expect(res.status).toBe('Finished');
      expect(res.isLive).toBe(0);
      expect(res.isFinished).toBe(1);
    });

    it('should deduce Finished from time FT or Terminé', () => {
      const match1 = { time: 'FT', score: '2 - 0' };
      const res1 = normalizeMatchStatus(match1);
      expect(res1.status).toBe('Finished');
      expect(res1.isFinished).toBe(1);

      const match2 = { time: 'Terminé', score: '1 - 0' };
      const res2 = normalizeMatchStatus(match2);
      expect(res2.status).toBe('Finished');
      expect(res2.isFinished).toBe(1);

      const match3 = { time: 'Ter.', score: '0 - 0' };
      const res3 = normalizeMatchStatus(match3);
      expect(res3.status).toBe('Finished');
      expect(res3.isFinished).toBe(1);
    });

    it('should deduce Live status from clock time or mi-temps', () => {
      const match = { status: 'Planned', time: "32'" };
      const res = normalizeMatchStatus(match);
      expect(res.status).toBe('Live');
      expect(res.isLive).toBe(1);
      expect(res.isFinished).toBe(0);
    });

    it('should detect multi-sport periods (quarters, OT, periods, sets) as Live', () => {
      const periods = [
        '1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter',
        'Q1', 'Q2', 'Q3', 'Q4',
        'OT', 'Overtime',
        'Period 1', 'Period 2', 'Period 3', 'Period 1/2/3',
        'Set 1', 'Set 2', 'Set 3', 'sets'
      ];
      for (const p of periods) {
        const resFromTime = normalizeMatchStatus({ status: 'scheduled', time: p });
        expect(resFromTime.status).toBe('Live');
        expect(resFromTime.isLive).toBe(1);
        expect(resFromTime.isFinished).toBe(0);

        const resFromStatus = normalizeMatchStatus({ status: p, time: '' });
        expect(resFromStatus.status).toBe('Live');
        expect(resFromStatus.isLive).toBe(1);
        expect(resFromStatus.isFinished).toBe(0);
      }
    });

    it('should preserve Unknown status when status cannot be determined', () => {
      const res1 = normalizeMatchStatus({ status: 'unknown' });
      expect(res1.status).toBe('Unknown');
      expect(res1.isLive).toBe(0);
      expect(res1.isFinished).toBe(0);

      const res2 = normalizeMatchStatus({ status: '', time: '' });
      expect(res2.status).toBe('Unknown');
      expect(res2.isLive).toBe(0);
      expect(res2.isFinished).toBe(0);

      const res3 = normalizeMatchStatus(null);
      expect(res3.status).toBe('Unknown');
      expect(res3.isLive).toBe(0);
      expect(res3.isFinished).toBe(0);
    });

    it('should set Finished when is_finished === true even without score', () => {
      const res1 = normalizeMatchStatus({ is_finished: true });
      expect(res1.status).toBe('Finished');
      expect(res1.isFinished).toBe(1);
      expect(res1.isLive).toBe(0);

      const res2 = normalizeMatchStatus({ is_finished: true, score: '' });
      expect(res2.status).toBe('Finished');
      expect(res2.isFinished).toBe(1);
      expect(res2.isLive).toBe(0);
    });

    it('should support positional arguments signature', () => {
      const resPos = normalizeMatchStatus('scheduled', '4th Quarter', '', false, false);
      expect(resPos.status).toBe('Live');
      expect(resPos.isLive).toBe(1);
      expect(resPos.isFinished).toBe(0);

      const resFinished = normalizeMatchStatus('', '', '', true, false);
      expect(resFinished.status).toBe('Finished');
      expect(resFinished.isFinished).toBe(1);

      const resUnknown = normalizeMatchStatus('unknown', '', '', false, false);
      expect(resUnknown.status).toBe('Unknown');
    });
  });

  describe('Admissibility & Eligibility Logic', () => {
    it('should reject matches with quality_status: failed', () => {
      const match = {
        home_team: 'Arsenal',
        away_team: 'Chelsea',
        quality_status: 'failed'
      };
      const check = isMatchEligibleForImport(match);
      expect(check.eligible).toBe(false);
      expect(check.reason).toBe('quality_status is failed');
    });

    it('should reject matches with missing home_team or away_team', () => {
      const noHome = { home_team: '', away_team: 'Chelsea', quality_status: 'complete' };
      expect(isMatchEligibleForImport(noHome).eligible).toBe(false);

      const noAway = { home_team: 'Arsenal', away_team: '', quality_status: 'complete' };
      expect(isMatchEligibleForImport(noAway).eligible).toBe(false);

      const nullMatch = null;
      expect(isMatchEligibleForImport(nullMatch).eligible).toBe(false);
    });

    it('should reject matches with identical home and away teams', () => {
      const match = { home_team: 'Arsenal', away_team: 'Arsenal', quality_status: 'complete' };
      const check = isMatchEligibleForImport(match);
      expect(check.eligible).toBe(false);
      expect(check.reason).toBe('identical home and away teams');
    });

    it('should accept legitimate complete matches', () => {
      const match = { home_team: 'Arsenal', away_team: 'Chelsea', quality_status: 'complete' };
      expect(isMatchEligibleForImport(match).eligible).toBe(true);
    });
  });

  describe('Historical Import Admissibility Enforcement', () => {
    it('should strictly reject importHistoricalMatch when quality_status is failed', async () => {
      const failedHistMatch = {
        home_team: 'Real Madrid',
        away_team: 'Barcelona',
        quality_status: 'failed',
        score: '2 - 1',
        time: 'FT'
      };
      const result = await importHistoricalMatch('/match/failed-hist-1', failedHistMatch);
      expect(result).toBe(false);
    });

    it('should strictly reject importHistoricalMatch with fatal missing fields', async () => {
      const missingHome = {
        home_team: '',
        away_team: 'Barcelona',
        quality_status: 'complete'
      };
      const result = await importHistoricalMatch('/match/failed-hist-2', missingHome);
      expect(result).toBe(false);
    });
  });
});
