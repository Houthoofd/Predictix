import { describe, it, expect } from 'vitest';
import { enrichNonFootballMatch } from './nonFootballPredictor.js';

describe('Basketball Predictions & First Half Points', () => {
  it('should parse first_half_points from statistics_json correctly', () => {
    const row = {
      home_team: 'Spurs',
      away_team: 'Lakers',
      sport: 'basketball'
    };

    const h2hMatches = [
      {
        home_team: 'Spurs',
        away_team: 'Lakers',
        score: '110 - 100',
        statistics_json: JSON.stringify({
          first_half_points: { home: 55, away: 45 }
        })
      }
    ];

    const result = enrichNonFootballMatch(
      row,
      h2hMatches,
      [],
      [],
      'logo_home',
      'logo_away',
      {},
      [],
      [],
      []
    );

    // Calculated line should be average first half points: 55 + 45 = 100 rounded to near .5 (100.5)
    expect(result.card_line).toBe('100.5 Points 1ère MT');
  });

  it('should fallback to 49% of total score if first_half_points is missing in statistics_json', () => {
    const row = {
      home_team: 'Spurs',
      away_team: 'Lakers',
      sport: 'basketball'
    };

    const h2hMatches = [
      {
        home_team: 'Spurs',
        away_team: 'Lakers',
        score: '100 - 100', // total = 200
        statistics_json: null
      }
    ];

    const result = enrichNonFootballMatch(
      row,
      h2hMatches,
      [],
      [],
      'logo_home',
      'logo_away',
      {},
      [],
      [],
      []
    );

    // 200 * 0.49 = 98. Average is 98. Rounded to nearest .5 is 98.5
    expect(result.card_line).toBe('98.5 Points 1ère MT');
  });
});
