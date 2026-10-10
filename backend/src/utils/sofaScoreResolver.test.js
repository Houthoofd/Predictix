import { describe, it, expect } from 'vitest';
import {
  extractTeamCategory,
  areCategoriesCompatible,
  findSofaEventId,
  mapSofaStatsToPredictix
} from './sofaScoreResolver.js';

describe('SofaScore Resolver', () => {
  describe('extractTeamCategory & areCategoriesCompatible', () => {
    it('should classify senior teams correctly', () => {
      const cat = extractTeamCategory('Arsenal FC');
      expect(cat.hasWomenTag).toBe(false);
      expect(cat.hasReserveTag).toBe(false);
      expect(cat.ageClass).toBe('');
    });

    it('should detect women / ladies squads', () => {
      const womenTeams = [
        'Arsenal Women',
        'Chelsea Ladies',
        'Lyon Féminines',
        'Barcelona (W)',
        'PSG Feminin',
        'Bayern Frauen',
        'Wolfsburg WFC'
      ];
      for (const t of womenTeams) {
        const cat = extractTeamCategory(t);
        expect(cat.hasWomenTag).toBe(true);
      }
    });

    it('should detect youth age brackets', () => {
      const u21 = extractTeamCategory('Arsenal U21');
      expect(u21.ageClass).toBe('u21');

      const u23 = extractTeamCategory('Liverpool U23');
      expect(u23.ageClass).toBe('u23');

      const u19 = extractTeamCategory('Real Madrid Under 19');
      expect(u19.ageClass).toBe('u19');

      const sub20 = extractTeamCategory('Santos Sub-20');
      expect(sub20.ageClass).toBe('u20');
    });

    it('should detect reserve squads', () => {
      const bTeam = extractTeamCategory('Real Madrid B');
      expect(bTeam.hasReserveTag).toBe(true);

      const iiTeam = extractTeamCategory('Bayern Munich II');
      expect(iiTeam.hasReserveTag).toBe(true);

      const resTeam = extractTeamCategory('Lyon Reserves');
      expect(resTeam.hasReserveTag).toBe(true);
    });

    it('should NEVER match a senior team with youth, women, or reserve squad', () => {
      const senior = extractTeamCategory('Arsenal');
      const u21 = extractTeamCategory('Arsenal U21');
      const women = extractTeamCategory('Arsenal Women');
      const reserve = extractTeamCategory('Arsenal Reserves');

      expect(areCategoriesCompatible(senior, u21)).toBe(false);
      expect(areCategoriesCompatible(senior, women)).toBe(false);
      expect(areCategoriesCompatible(senior, reserve)).toBe(false);
    });

    it('should allow matching between matching categories', () => {
      const senior1 = extractTeamCategory('Arsenal');
      const senior2 = extractTeamCategory('Chelsea');
      expect(areCategoriesCompatible(senior1, senior2)).toBe(true);

      const u19_1 = extractTeamCategory('Arsenal U19');
      const u19_2 = extractTeamCategory('Chelsea U-19');
      expect(areCategoriesCompatible(u19_1, u19_2)).toBe(true);

      const b1 = extractTeamCategory('Porto B');
      const b2 = extractTeamCategory('Benfica B');
      expect(areCategoriesCompatible(b1, b2)).toBe(true);
    });
  });

  describe('findSofaEventId', () => {
    const mockEvents = [
      {
        id: 1001,
        startTimestamp: 1770000000,
        homeTeam: { name: 'Arsenal' },
        awayTeam: { name: 'Chelsea' }
      },
      {
        id: 1002,
        startTimestamp: 1770000000,
        homeTeam: { name: 'Real Madrid' },
        awayTeam: { name: 'Barcelona' }
      },
      {
        id: 1003,
        startTimestamp: 1770000000,
        homeTeam: { name: 'Arsenal U21' },
        awayTeam: { name: 'Chelsea U21' }
      },
      {
        id: 1004,
        startTimestamp: 1770000000,
        homeTeam: { name: 'Lyon Women' },
        awayTeam: { name: 'PSG Féminines' }
      }
    ];

    it('should match direct match and return isReversed: false', () => {
      const match = findSofaEventId(mockEvents, 'Arsenal', 'Chelsea');
      expect(match).not.toBeNull();
      expect(match.eventId).toBe(1001);
      expect(match.isReversed).toBe(false);
    });

    it('should match reversed match and return isReversed: true', () => {
      const match = findSofaEventId(mockEvents, 'Barcelona', 'Real Madrid');
      expect(match).not.toBeNull();
      expect(match.eventId).toBe(1002);
      expect(match.isReversed).toBe(true);
    });

    it('should reject matching senior team against youth event', () => {
      const match = findSofaEventId(mockEvents, 'Arsenal', 'Chelsea U21');
      expect(match).toBeNull();
    });

    it('should reject matching senior team against women event', () => {
      const match = findSofaEventId(mockEvents, 'Lyon', 'PSG');
      expect(match).toBeNull();
    });

    it('should correctly match youth when searching for youth', () => {
      const match = findSofaEventId(mockEvents, 'Arsenal U21', 'Chelsea U21');
      expect(match).not.toBeNull();
      expect(match.eventId).toBe(1003);
      expect(match.isReversed).toBe(false);
    });

    it('should filter events outside 24h window when targetDate provided', () => {
      const dateFarAway = '2020-01-01';
      const match = findSofaEventId(mockEvents, dateFarAway, 'Arsenal', 'Chelsea');
      expect(match).toBeNull();
    });

    it('should reject ambiguous matches when two candidates have equal or close confidence', () => {
      const ambiguousEvents = [
        {
          id: 5001,
          startTimestamp: 1770000000,
          homeTeam: { name: 'Arsenal' },
          awayTeam: { name: 'Chelsea' },
          tournament: { name: 'Premier League' }
        },
        {
          id: 5002,
          startTimestamp: 1770000000,
          homeTeam: { name: 'Arsenal' },
          awayTeam: { name: 'Chelsea' },
          tournament: { name: 'Club Friendly' }
        }
      ];

      const match = findSofaEventId(ambiguousEvents, 'Arsenal', 'Chelsea');
      expect(match).toBeNull();
    });

    it('should maintain order independence when rejecting ambiguous matches', () => {
      const candidatesA = [
        {
          id: 6001,
          startTimestamp: 1770000000,
          homeTeam: { name: 'Arsenal' },
          awayTeam: { name: 'Chelsea' },
          tournament: { name: 'Cup' }
        },
        {
          id: 6002,
          startTimestamp: 1770000000,
          homeTeam: { name: 'Arsenal' },
          awayTeam: { name: 'Chelsea' },
          tournament: { name: 'League' }
        }
      ];
      const candidatesB = [...candidatesA].reverse();

      const resultA = findSofaEventId(candidatesA, 'Arsenal', 'Chelsea');
      const resultB = findSofaEventId(candidatesB, 'Arsenal', 'Chelsea');

      expect(resultA).toBeNull();
      expect(resultB).toBeNull();
      expect(resultA).toEqual(resultB);
    });

    it('should handle missing timestamps appropriately', () => {
      const targetDate = '2026-10-04';
      // Non-exact team name should NOT bypass date validation and must be rejected
      const nonExactWithMissingTime = [
        {
          id: 7001,
          startTimestamp: 0,
          homeTeam: { name: 'Arsenal FC London' },
          awayTeam: { name: 'Chelsea FC London' }
        }
      ];
      const resNonExact = findSofaEventId(nonExactWithMissingTime, targetDate, 'Arsenal', 'Chelsea');
      expect(resNonExact).toBeNull();

      // Exact team name match with missing timestamp is accepted if unique
      const exactWithMissingTime = [
        {
          id: 7002,
          startTimestamp: 0,
          homeTeam: { name: 'Arsenal' },
          awayTeam: { name: 'Chelsea' }
        }
      ];
      const resExact = findSofaEventId(exactWithMissingTime, targetDate, 'Arsenal', 'Chelsea');
      expect(resExact).not.toBeNull();
      expect(resExact.eventId).toBe(7002);

      // Verified timestamp candidate beats missing timestamp candidate
      const mixedDateEvents = [
        {
          id: 7003,
          startTimestamp: 0,
          homeTeam: { name: 'Arsenal' },
          awayTeam: { name: 'Chelsea' }
        },
        {
          id: 7004,
          startTimestamp: 1791115200,
          homeTeam: { name: 'Arsenal' },
          awayTeam: { name: 'Chelsea' }
        }
      ];
      const resVerified = findSofaEventId(mixedDateEvents, targetDate, 'Arsenal', 'Chelsea');
      expect(resVerified).not.toBeNull();
      expect(resVerified.eventId).toBe(7004);
    });

    it('should reject candidate when absolute confidence is below 0.70', () => {
      // Event with borderline team similarity and lower score
      const lowConfidenceEvents = [
        {
          id: 8001,
          startTimestamp: 1770000000,
          homeTeam: { name: 'Arsenal Athletic' },
          awayTeam: { name: 'Chelsea Rovers' },
          tournament: { name: 'Club Friendly' }
        }
      ];
      const res = findSofaEventId(lowConfidenceEvents, 'Arsenal', 'Chelsea');
      expect(res).toBeNull();
    });

    it('should strictly reject missing timestamp when team similarity is below 0.95 with targetDate', () => {
      const targetDate = '2026-10-04';
      const nearMatchMissingTime = [
        {
          id: 8002,
          startTimestamp: 0,
          homeTeam: { name: 'Arsenal F.C.' },
          awayTeam: { name: 'Chelsea F.C.' }
        }
      ];
      // Team similarity between 'Arsenal' and 'Arsenal F.C.' is ~0.83 (< 0.95)
      const res = findSofaEventId(nearMatchMissingTime, targetDate, 'Arsenal', 'Chelsea');
      expect(res).toBeNull();
    });
  });

  describe('mapSofaStatsToPredictix', () => {
    const rawSofaStats = [
      {
        period: 'ALL',
        groups: [
          {
            groupName: 'Match overview',
            statisticsItems: [
              { name: 'Ball possession', home: '58%', away: '42%' },
              { name: 'Total shots', home: 14, away: 8 },
              { name: 'Shots on target', home: 6, away: 3 },
              { name: 'Corner kicks', home: 7, away: 2 },
              { name: 'Fouls', home: 11, away: 15 },
              { name: 'Yellow cards', home: 1, away: 3 },
              { name: 'Red cards', home: 0, away: 1 },
              { name: 'Offsides', home: 2, away: 4 }
            ]
          }
        ]
      },
      {
        period: '1ST',
        groups: [
          {
            groupName: 'Match overview',
            statisticsItems: [
              { name: 'Corner kicks', home: 4, away: 1 }
            ]
          }
        ]
      }
    ];

    it('should map statistics correctly in direct orientation', () => {
      const mapped = mapSofaStatsToPredictix(rawSofaStats, false);
      expect(mapped).not.toBeNull();
      expect(mapped.possession).toEqual({ home: 58, away: 42 });
      expect(mapped.shots).toEqual({ home: 14, away: 8 });
      expect(mapped.shots_on_target).toEqual({ home: 6, away: 3 });
      expect(mapped.corners).toEqual({ home: 7, away: 2 });
      expect(mapped.fouls).toEqual({ home: 11, away: 15 });
      expect(mapped.yellow_cards).toEqual({ home: 1, away: 3 });
      expect(mapped.red_cards).toEqual({ home: 0, away: 1 });
      expect(mapped.offsides).toEqual({ home: 2, away: 4 });
      expect(mapped.first_half_corners).toEqual({ home: 4, away: 1 });
    });

    it('should INVERT all statistics when isReversed is true', () => {
      const mapped = mapSofaStatsToPredictix(rawSofaStats, true);
      expect(mapped).not.toBeNull();
      expect(mapped.possession).toEqual({ home: 42, away: 58 });
      expect(mapped.shots).toEqual({ home: 8, away: 14 });
      expect(mapped.shots_on_target).toEqual({ home: 3, away: 6 });
      expect(mapped.corners).toEqual({ home: 2, away: 7 });
      expect(mapped.fouls).toEqual({ home: 15, away: 11 });
      expect(mapped.yellow_cards).toEqual({ home: 3, away: 1 });
      expect(mapped.red_cards).toEqual({ home: 1, away: 0 });
      expect(mapped.offsides).toEqual({ home: 4, away: 2 });
      expect(mapped.first_half_corners).toEqual({ home: 1, away: 4 });
    });

    it('should NEVER manufacture 0 from null or unparseable values', () => {
      const statsWithNulls = [
        {
          period: 'ALL',
          groups: [
            {
              groupName: 'Match overview',
              statisticsItems: [
                { name: 'Ball possession', home: null, away: '50%' },
                { name: 'Total shots', home: 'N/A', away: 5 },
                { name: 'Corner kicks', home: 3, away: 4 }
              ]
            }
          ]
        }
      ];

      const mapped = mapSofaStatsToPredictix(statsWithNulls, false);
      expect(mapped.possession).toBeNull();
      expect(mapped.shots).toBeNull();
      expect(mapped.corners).toEqual({ home: 3, away: 4 });
      // Missing first_half_corners must be { home: null, away: null }, NEVER 0
      expect(mapped.first_half_corners).toEqual({ home: null, away: null });
    });
  });

  describe('Network Policy & Request Cancellation', () => {
    it('should reject invalid networkMode with explicit descriptive error', async () => {
      const { fetchSofaJSON } = await import('./sofaScoreResolver.js');
      await expect(fetchSofaJSON('https://api.sofascore.com', { networkMode: 'unknown-mode' }))
        .rejects.toThrow(/Invalid networkMode "unknown-mode"/);
    });

    it('should explicitly fail and forbid direct connection in tor-required mode when Tor is offline', async () => {
      const { fetchSofaJSON, NetworkMode } = await import('./sofaScoreResolver.js');
      // Port 59999 is inactive/unreachable
      await expect(fetchSofaJSON('https://api.sofascore.com/api/v1/test', {
        networkMode: NetworkMode.TOR_REQUIRED,
        socksPort: 59999
      })).rejects.toThrow(/Tor proxy is required on port 59999.*tor-required mode.*Direct connection is strictly prohibited/);
    });

    it('should abort request promptly and destroy socket when AbortController aborts', async () => {
      const { fetchSofaJSON } = await import('./sofaScoreResolver.js');
      const controller = new AbortController();
      const startTime = Date.now();
      
      // Abort after 50ms
      setTimeout(() => controller.abort(new Error('Manual abort test')), 50);

      // Request a non-routable / hanging URL
      const result = await fetchSofaJSON('https://10.255.255.1:81/hang', {
        networkMode: 'direct',
        signal: controller.signal,
        timeoutMs: 15000
      });

      const elapsed = Date.now() - startTime;
      expect(result).toBeNull();
      // Must terminate rapidly via AbortController, not wait for the 15s timeout
      expect(elapsed).toBeLessThan(1000);
    });

    it('should enforce strict timeoutMs via internal AbortController', async () => {
      const { fetchSofaJSON } = await import('./sofaScoreResolver.js');
      const startTime = Date.now();

      // Set ultra short timeout of 60ms on non-routable endpoint
      const result = await fetchSofaJSON('https://10.255.255.1:81/hang', {
        networkMode: 'direct',
        timeoutMs: 60
      });

      const elapsed = Date.now() - startTime;
      expect(result).toBeNull();
      expect(elapsed).toBeLessThan(1200);
    });
  });
});
