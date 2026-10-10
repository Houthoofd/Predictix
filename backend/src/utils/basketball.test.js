import { describe, it, expect } from 'vitest';
import { enrichNonFootballMatch } from './nonFootballPredictor.js';

describe('Basketball Predictions & Pace/Ratings Model', () => {
  it('should calculate pace and efficiency ratings correctly with complete stats, applying exponential time-decay weighting and HCA', () => {
    const row = {
      home_team: 'Spurs',
      away_team: 'Lakers',
      sport: 'basketball'
    };

    // Home Team: Spurs
    const homeMatches = [
      {
        home_team: 'Spurs',
        away_team: 'Warriors',
        score: '110 - 100',
        statistics_json: JSON.stringify({
          field_goals_attempted: { home: 75, away: 80 }
        })
      },
      {
        home_team: 'Rockets',
        away_team: 'Spurs',
        score: '90 - 120',
        statistics_json: JSON.stringify({
          field_goals_attempted: { home: 70, away: 85 }
        })
      }
    ];

    // Away Team: Lakers
    const awayMatches = [
      {
        home_team: 'Lakers',
        away_team: 'Suns',
        score: '105 - 95',
        statistics_json: JSON.stringify({
          field_goals_attempted: { home: 80, away: 70 }
        })
      },
      {
        home_team: 'Kings',
        away_team: 'Lakers',
        score: '115 - 110',
        statistics_json: JSON.stringify({
          field_goals_attempted: { home: 75, away: 70 }
        })
      }
    ];

    const h2hMatches = [
      {
        home_team: 'Spurs',
        away_team: 'Lakers',
        score: '100 - 90',
        statistics_json: JSON.stringify({
          first_half_points: { home: 52, away: 45 }
        })
      }
    ];

    const result = enrichNonFootballMatch(
      row,
      h2hMatches,
      homeMatches,
      awayMatches,
      'logo_home',
      'logo_away',
      {},
      [],
      [],
      []
    );

    // Math Validation (detailed in walkthrough.md / test logs):
    // Expected Pace and efficiencies are regressed with K = 8.
    // HCA is adjusted to +/- 1% on offensive/defensive multipliers.

    expect(result.home_avg_first_half_points).toBeCloseTo(46.48, 1);
    expect(result.away_avg_first_half_points).toBeCloseTo(43.26, 1);
    expect(result.h2h_avg_first_half_points).toBe(97); // 52 + 45 = 97
    expect(result.card_line).toBe('89.5 Points 1ère MT');
  });

  it('should use fallback values and apply HCA if recent match lists are empty', () => {
    const row = {
      home_team: 'Spurs',
      away_team: 'Lakers',
      sport: 'basketball'
    };

    const result = enrichNonFootballMatch(
      row,
      [],
      [],
      [],
      'logo_home',
      'logo_away',
      {},
      [],
      [],
      []
    );

    // Fallbacks: FGA = 70 (1st half pace = 35.14), EFF = 1.15
    // expectedHome = 35.14 * (1.15 * 1.01 * 1.01) = 41.22
    // expectedAway = 35.14 * (1.15 * 0.99 * 0.99) = 39.61
    // expectedTotal = 80.83. Line = 80.5
    expect(result.home_avg_first_half_points).toBeCloseTo(41.22, 2);
    expect(result.away_avg_first_half_points).toBeCloseTo(39.61, 2);
    expect(result.h2h_avg_first_half_points).toBeCloseTo(80.83, 2);
    expect(result.card_line).toBe('80.5 Points 1ère MT');
  });

  it('should use dynamic league averages if provided, applying HCA', () => {
    const row = {
      home_team: 'Spurs',
      away_team: 'Lakers',
      sport: 'basketball',
      tournament: 'NBA'
    };

    const basketballLeagueAverages = {
      nba: { avgFGA: 90, avgEFF: 1.20 }
    };

    const result = enrichNonFootballMatch(
      row,
      [],
      [],
      [],
      'logo_home',
      'logo_away',
      {},
      [],
      [],
      [],
      0,
      basketballLeagueAverages
    );

    // Dynamic NBA Baselines: FGA = 90, EFF = 1.20
    // Expected 1st Half Pace = 45.18
    // expectedHome = 45.18 * (1.20 * 1.01 * 1.01) = 55.31
    // expectedAway = 45.18 * (1.20 * 0.99 * 0.99) = 53.13
    // expectedTotal = 108.44. Line = 108.5
    expect(result.home_avg_first_half_points).toBeCloseTo(55.31, 1);
    expect(result.away_avg_first_half_points).toBeCloseTo(53.13, 1);
    expect(result.card_line).toBe('108.5 Points 1ère MT');
  });

  it('should calculate card probability and best tip using Bivariate Poisson model', () => {
    const row = {
      home_team: 'Spurs',
      away_team: 'Lakers',
      sport: 'basketball'
    };

    const result = enrichNonFootballMatch(
      row,
      [],
      [],
      [],
      'logo_home',
      'logo_away',
      {},
      [],
      [],
      [],
      0
    );

    expect(result.best_tip).toBe('Plus de');
    expect(result.probability).toBe('51%');
    expect(result.win_rate).toBe('46%');
  });
});

