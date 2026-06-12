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
    // Expected Pace = ((79.7368 * 1.01) + (75.2632 * 0.99)) / 2 = 77.52. 1st Half Pace = 38.915
    // Expected Eff Home = (1.4389 * 1.025) * ((1.4436 * 1.025) / 1.15) = 1.8978
    // Expected Eff Away = (1.4266 * 0.975) * ((1.2657 * 0.975) / 1.15) = 1.4926
    // Expected Home Score = 38.915 * 1.8978 = 73.85
    // Expected Away Score = 38.915 * 1.4926 = 58.08
    // Expected Total = 73.85 + 58.08 = 131.93. Line = 131.5

    expect(result.home_avg_first_half_points).toBeCloseTo(73.86, 1);
    expect(result.away_avg_first_half_points).toBeCloseTo(58.09, 1);
    expect(result.h2h_avg_first_half_points).toBe(97); // 52 + 45 = 97
    expect(result.card_line).toBe('131.5 Points 1ère MT');
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
    // expectedHome = 35.14 * (1.15 * 1.025 * 1.025) = 42.46
    // expectedAway = 35.14 * (1.15 * 0.975 * 0.975) = 38.41
    // expectedTotal = 80.87. Line = 80.5
    expect(result.home_avg_first_half_points).toBeCloseTo(42.46, 2);
    expect(result.away_avg_first_half_points).toBeCloseTo(38.42, 2);
    expect(result.h2h_avg_first_half_points).toBeCloseTo(80.87, 2);
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
    // expectedHome = 45.18 * (1.20 * 1.025 * 1.025) = 56.96
    // expectedAway = 45.18 * (1.20 * 0.975 * 0.975) = 51.54
    // expectedTotal = 108.5. Line = 108.5
    expect(result.home_avg_first_half_points).toBeCloseTo(56.96, 1);
    expect(result.away_avg_first_half_points).toBeCloseTo(51.54, 1);
    expect(result.card_line).toBe('108.5 Points 1ère MT');
  });
});
