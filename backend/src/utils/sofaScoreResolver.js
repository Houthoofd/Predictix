import https from 'https';
import { parseFrenchDate } from './dateParser.js';
import { fuzzyMatch } from './textMatcher.js';

/**
 * Helper function to fetch JSON from SofaScore API via native HTTPS
 */
function fetchSofaJSON(url) {
  return new Promise((resolve) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    };
    
    https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(rawData));
        } catch (e) {
          console.error(`[SofaScore API] JSON parse error for URL ${url}:`, e.message);
          resolve(null);
        }
      });
    }).on('error', (e) => {
      console.error(`[SofaScore API] HTTP request failed for URL ${url}:`, e.message);
      resolve(null);
    });
  });
}

/**
 * Call SofaScore API using native HTTPS to retrieve daily events
 */
export async function fetchSofaEventsForDate(dateStr) {
  const url = `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${dateStr}`;
  const data = await fetchSofaJSON(url);
  return data ? data.events || null : null;
}

/**
 * Match a specific game inside SofaScore event list using home/away names
 */
export function findSofaEventId(events, homeTeam, awayTeam) {
  if (!events || !Array.isArray(events)) return null;
  
  for (const e of events) {
    const sHome = e.homeTeam?.name;
    const sAway = e.awayTeam?.name;
    if (!sHome || !sAway) continue;
    
    if (
      (fuzzyMatch(homeTeam, sHome) && fuzzyMatch(awayTeam, sAway)) ||
      (fuzzyMatch(homeTeam, sAway) && fuzzyMatch(awayTeam, sHome))
    ) {
      return e.id;
    }
  }
  return null;
}

/**
 * Call SofaScore API using native HTTPS to retrieve detailed statistics for a specific event
 */
export async function fetchSofaStats(eventId) {
  const url = `https://api.sofascore.com/api/v1/event/${eventId}/statistics`;
  const data = await fetchSofaJSON(url);
  return data ? data.statistics || null : null;
}

/**
 * Translate SofaScore raw statistics items into Predictix format
 */
export function mapSofaStatsToPredictix(sofaStats) {
  if (!sofaStats || !Array.isArray(sofaStats)) return null;

  const fullTime = sofaStats.find(s => s.period === 'ALL');
  const firstHalf = sofaStats.find(s => s.period === '1ST');

  const result = {
    possession: null,
    corners: null,
    shots: null,
    shots_on_target: null,
    fouls: null,
    yellow_cards: null,
    offsides: null,
    first_half_corners: null
  };

  const findItem = (periodData, itemName) => {
    if (!periodData || !periodData.groups) return null;
    for (const group of periodData.groups) {
      const item = group.statisticsItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
      if (item) return item;
    }
    return null;
  };

  const parseVal = (valStr) => {
    if (valStr === null || valStr === undefined) return 0;
    const parsed = parseFloat(String(valStr).replace('%', ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  if (fullTime) {
    const possessionItem = findItem(fullTime, 'Ball possession');
    if (possessionItem) {
      result.possession = {
        home: parseVal(possessionItem.home),
        away: parseVal(possessionItem.away)
      };
    }

    const cornersItem = findItem(fullTime, 'Corner kicks');
    if (cornersItem) {
      result.corners = {
        home: parseVal(cornersItem.home),
        away: parseVal(cornersItem.away)
      };
    }

    const shotsItem = findItem(fullTime, 'Total shots');
    if (shotsItem) {
      result.shots = {
        home: parseVal(shotsItem.home),
        away: parseVal(shotsItem.away)
      };
    }

    const shotsOnTargetItem = findItem(fullTime, 'Shots on target');
    if (shotsOnTargetItem) {
      result.shots_on_target = {
        home: parseVal(shotsOnTargetItem.home),
        away: parseVal(shotsOnTargetItem.away)
      };
    }

    const foulsItem = findItem(fullTime, 'Fouls');
    if (foulsItem) {
      result.fouls = {
        home: parseVal(foulsItem.home),
        away: parseVal(foulsItem.away)
      };
    }

    const yellowCardsItem = findItem(fullTime, 'Yellow cards');
    if (yellowCardsItem) {
      result.yellow_cards = {
        home: parseVal(yellowCardsItem.home),
        away: parseVal(yellowCardsItem.away)
      };
    }

    const offsidesItem = findItem(fullTime, 'Offsides');
    if (offsidesItem) {
      result.offsides = {
        home: parseVal(offsidesItem.home),
        away: parseVal(offsidesItem.away)
      };
    }
  }

  if (firstHalf) {
    const cornersItem1H = findItem(firstHalf, 'Corner kicks');
    if (cornersItem1H) {
      result.first_half_corners = {
        home: parseVal(cornersItem1H.home),
        away: parseVal(cornersItem1H.away)
      };
    }
  }

  return result;
}

/**
 * Global SofaScore orchestrator fallback search
 */
export async function tryResolveSofaStatsFallback(dateStr, homeTeam, awayTeam) {
  const parsedDate = parseFrenchDate(dateStr);
  if (!parsedDate) return null;

  console.log(`[SofaScore Fallback] Searching for event on ${parsedDate}: ${homeTeam} vs ${awayTeam}`);
  const events = await fetchSofaEventsForDate(parsedDate);
  if (!events) {
    console.log(`[SofaScore Fallback] No events found for date ${parsedDate}`);
    return null;
  }

  const eventId = findSofaEventId(events, homeTeam, awayTeam);
  if (!eventId) {
    console.log(`[SofaScore Fallback] Event not found for ${homeTeam} vs ${awayTeam}`);
    return null;
  }

  console.log(`[SofaScore Fallback] Event found! SofaScore Event ID: ${eventId}. Fetching statistics...`);
  const stats = await fetchSofaStats(eventId);
  if (!stats) {
    console.log(`[SofaScore Fallback] No statistics found for event ID ${eventId}`);
    return null;
  }

  const mapped = mapSofaStatsToPredictix(stats);
  if (mapped) {
    console.log(`[SofaScore Fallback] Successfully mapped statistics for event ID ${eventId}`);
    return {
      stats_source: 'sofascore',
      ...mapped
    };
  }

  return null;
}
