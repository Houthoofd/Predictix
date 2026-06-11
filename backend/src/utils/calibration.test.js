import { describe, it, expect } from 'vitest';
import { enrichMatchPredictions } from './predictionEngine.js';
import { enrichNonFootballMatch } from './nonFootballPredictor.js';

describe('Bayesian Odds Calibration Math', () => {
  it('should correctly shift Poisson probabilities by calibrationDelta', () => {
    // Mock row
    const mockRow = {
      match_id: 'test_football',
      sport: 'football',
      tournament: 'Ligue 1',
      home_team: 'PSG',
      away_team: 'Marseille',
      best_tip: 'Plus de',
      card_line: '4.5',
      probability: '50%',
      win_rate: '50%',
      odds_corners: JSON.stringify([
        { line: 2.5, market_type: '1st_half', over_decimal: 2.0, under_decimal: 2.0 }
      ])
    };

    // Averages and matches mock
    const leagueAverages = { 'ligue 1': { home: 2.2, away: 2.0 } };
    const homeMatches = [];
    const awayMatches = [];
    const h2hMatches = [];

    // Let's run enrich with calibrationDelta = +0.10 (+10% win rate above prediction)
    const enrichedPositive = enrichMatchPredictions(
      mockRow, leagueAverages, h2hMatches, homeMatches, awayMatches, 
      new Set(), {}, 5, 4.5, 0.10
    );

    // Probability string is e.g. "63%" or whatever calculated + 10%
    const probPos = parseInt(enrichedPositive.probability);
    
    // Now run with calibrationDelta = -0.10 (-10%)
    const enrichedNegative = enrichMatchPredictions(
      mockRow, leagueAverages, h2hMatches, homeMatches, awayMatches, 
      new Set(), {}, 5, 4.5, -0.10
    );

    const probNeg = parseInt(enrichedNegative.probability);

    expect(probPos).toBeGreaterThan(probNeg);

    // Check that odds corners are adjusted
    const oddsPos = enrichedPositive.odds_corners.find(o => o.line === 2.5);
    const oddsNeg = enrichedNegative.odds_corners.find(o => o.line === 2.5);

    expect(oddsPos.over_probability).toBeDefined();
    expect(parseInt(oddsPos.over_probability)).toBeGreaterThan(parseInt(oddsNeg.over_probability));
    expect(oddsPos.over_fair_odds).toBeLessThan(oddsNeg.over_fair_odds);
  });

  it('should adjust basketball/non-football probabilities using calibrationDelta', () => {
    const mockRow = {
      match_id: 'test_basketball',
      sport: 'basketball',
      home_team: 'Lakers',
      away_team: 'Celtics',
      score: '100-98',
      scraped_at: new Date().toISOString()
    };

    // Positive calibration delta
    const enrichedPositive = enrichNonFootballMatch(
      mockRow, [], [], [], null, null, {}, [], [], [], 0.08
    );
    const probPos = parseInt(enrichedPositive.probability);

    // Negative calibration delta
    const enrichedNegative = enrichNonFootballMatch(
      mockRow, [], [], [], null, null, {}, [], [], [], -0.05
    );
    const probNeg = parseInt(enrichedNegative.probability);

    expect(probPos).toBeGreaterThan(probNeg);
  });
});
