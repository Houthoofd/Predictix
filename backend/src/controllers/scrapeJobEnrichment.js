import { dbQuery, dbGet } from '../db/database.js';
import {
  scrapeHistoricalMatches,
  prioritizeDirectH2H,
  tryResolveSofaStatsFallback,
  parseFrenchDate,
  scrape1XBetOdds,
  scrapeArbworldMoneyway,
  scrapeSofaScoreAbsences,
  scrapeSofaScoreSquad,
  findBestMatch,
  fuzzyMatch
} from '../utils/scraperHelpers.js';
import { evaluateSmartScrapingFilter } from '../utils/predictionEngine.js';
import { importHistoricalMatch, importSkippedMatch, importTeamSquadStats } from '../db/importer.js';
import { normalizeMatchStatus } from '../utils/statusNormalizer.js';
import { scraperState } from './scraperState.js';
import { attachCrawlerEventListener } from '../utils/crawlerRunnerProcess.js';

/**
 * Enriches raw scraped details for a single match: validates dates, resolves SofaScore fallback
 * statistics, normalizes match status, and maps basketball odds if applicable.
 *
 * @param {object} details Raw scraped details
 * @param {object} m Base match overview item
 * @param {object} context Job context parameters
 * @param {number} socksPort Tor socks port
 * @param {function} sendEvent SSE event emitter
 * @returns {Promise<object|null>} Enriched match object or null if ignored
 */
export async function buildEnrichedMatchDetails(details, m, context, socksPort, sendEvent) {
  const {
    sport,
    jobNetworkMode,
    targetDate,
    basketballOddsMap = new Map()
  } = context;

  const matchSport = m.sport || sport;
  const matchDateRaw = details.date || m.date || '';
  const matchDateNormalized = parseFrenchDate(matchDateRaw) || matchDateRaw;
  const parsedTargetDate = targetDate ? (parseFrenchDate(targetDate) || targetDate) : null;
  const expectedIsoDate = parsedTargetDate || new Date().toISOString().substring(0, 10);

  if (matchDateNormalized && expectedIsoDate && matchDateNormalized.substring(0, 10) !== expectedIsoDate) {
    sendEvent('log', {
      message: `[Tor Port ${socksPort}] [Date Filter] [Ignoré] Match ${details.home_team || m.home_team} vs ${details.away_team || m.away_team} ignoré car sa date (${matchDateNormalized.substring(0, 10)}) ne correspond pas à la date cible (${expectedIsoDate}).`
    });
    return null;
  }

  let finalFirstHalfCornersHome = details.first_half_corners_home;
  let finalFirstHalfCornersAway = details.first_half_corners_away;
  let finalStatistics = details.statistics;

  if (finalFirstHalfCornersHome === null || finalFirstHalfCornersHome === undefined || !finalStatistics) {
    sendEvent('log', { message: `[Tor Port ${socksPort}] [Tor Link] Match principal sans stats. Recherche SofaScore de secours (mode: ${jobNetworkMode})...` });
    try {
      const sofaData = await tryResolveSofaStatsFallback(
        details.date || m.date,
        details.home_team || m.home_team,
        details.away_team || m.away_team,
        { networkMode: jobNetworkMode, socksPort }
      );
      if (sofaData) {
        finalStatistics = sofaData;
        finalFirstHalfCornersHome = sofaData.first_half_corners ? sofaData.first_half_corners.home : null;
        finalFirstHalfCornersAway = sofaData.first_half_corners ? sofaData.first_half_corners.away : null;
        sendEvent('log', { message: `[Tor Port ${socksPort}] [SofaScore] ✓ Stats résolues via SofaScore pour ce match !` });
      }
    } catch (sofaErr) {
      sendEvent('log', { message: `[Tor Port ${socksPort}] [SofaScore Fallback Error] ${sofaErr.message}` });
    }
  }

  const { status: normalizedStatus, isLive: isLiveNum, isFinished: isFinishedNum } = normalizeMatchStatus({
    status: details.status || m.status,
    time: details.time || m.time,
    score: details.score || m.score
  });
  const isLive = isLiveNum === 1 || isLiveNum === true;
  const isFinished = isFinishedNum === 1 || isFinishedNum === true;

  const hasStats = finalStatistics && Object.keys(finalStatistics).some(k => k !== 'stats_source' && finalStatistics[k] !== null && finalStatistics[k] !== undefined);
  if (isFinished && !hasStats) {
    sendEvent('log', {
      message: `[Tor Port ${socksPort}] [Ignoré] Match terminé ${details.home_team || m.home_team} vs ${details.away_team || m.away_team} ignoré car aucune statistique n'est disponible.`
    });
    return null;
  }

  const enriched = {
    match_id: m.match_id || m.href || '',
    status: normalizedStatus,
    quality_status: details.quality_status || 'complete',
    warnings: details.warnings || [],
    time: details.time || m.time || (isFinished ? 'Finished' : (isLive ? 'Live' : 'Planned')),
    date: details.date || m.date || '',
    tournament: (details.tournament && details.tournament !== 'Flashscore Match' && details.tournament !== 'Match en Direct') ? details.tournament : (m.tournament || ''),
    home_team: details.home_team || m.home_team,
    away_team: details.away_team || m.away_team,
    home_logo: details.home_logo || m.home_logo,
    away_logo: details.away_logo || m.away_logo,
    score: details.score || m.score || '',
    first_half_corners_home: finalFirstHalfCornersHome,
    first_half_corners_away: finalFirstHalfCornersAway,
    historical_links: details.historical_links,
    match_url: m.href || m.match_url || '',
    statistics: finalStatistics,
    odds_corners: details.odds_corners,
    sport: matchSport,
    is_finished: isFinished,
    is_live: isLive
  };

  if (sport === 'basketball') {
    const matchedOdds = basketballOddsMap.get(`${enriched.home_team} vs ${enriched.away_team}`);
    if (matchedOdds) {
      const oddsList = [];
      if (matchedOdds.home_odds !== null || matchedOdds.away_odds !== null) {
        oddsList.push({
          market_type: 'winner',
          home_odds: matchedOdds.home_odds,
          away_odds: matchedOdds.away_odds,
          draw_odds: matchedOdds.draw_odds || null
        });
      }
      if (Array.isArray(matchedOdds.totals)) {
        for (const t of matchedOdds.totals) {
          oddsList.push({
            market_type: 'totals',
            period: t.period,
            line: t.line,
            over_odds: t.over_odds,
            under_odds: t.under_odds
          });
        }
      }
      if (Array.isArray(matchedOdds.handicaps)) {
        for (const h of matchedOdds.handicaps) {
          oddsList.push({
            market_type: 'handicap',
            period: h.period,
            line: h.line,
            home_odds: h.home_odds,
            away_odds: h.away_odds
          });
        }
      }
      if (oddsList.length > 0) {
        enriched.odds_corners = oddsList;
      }
    }
  }

  return enriched;
}

/**
 * Enriches upcoming football matches with SofaScore absences and fetches squad data if outdated.
 *
 * @param {Array<object>} scrapedMatches
 * @param {object} context
 * @param {function} sendEvent
 */
export async function enrichMatchAbsencesAndSquads(scrapedMatches, context, sendEvent) {
  const { scraperPath, sport, formattedDate, targetDate } = context;

  const upcomingMatchesForAbsences = scrapedMatches.filter(m => {
    const { isFinished } = normalizeMatchStatus(m);
    const isFootball = (m.sport || '').toLowerCase() === 'football' || (m.sport || '').toLowerCase() === 'soccer';
    return !isFinished && isFootball;
  });

  for (let i = 0; i < upcomingMatchesForAbsences.length; i++) {
    if (scraperState.stopScraperRequested) break;
    const match = upcomingMatchesForAbsences[i];

    sendEvent('log', { message: `[SofaScore Absences] [${i + 1}/${upcomingMatchesForAbsences.length}] Vérification des absences pour ${match.home_team} vs ${match.away_team}...` });
    try {
      const absencesResult = await scrapeSofaScoreAbsences(
        scraperPath,
        match.sport || sport,
        formattedDate || targetDate,
        `${match.home_team} vs ${match.away_team}`
      );

      if (absencesResult && absencesResult.absences) {
        match.absences = absencesResult.absences;
        sendEvent('log', { message: `[SofaScore Absences] ✓ ${absencesResult.absences.length} absences trouvées pour ${match.home_team} vs ${match.away_team}` });
      }

      const checkAndScrapeSquad = async (teamName, teamURL) => {
        if (!teamURL) return;
        const lastUpdatedRow = await dbGet(
          'SELECT MAX(updated_at) as last_updated FROM player_stats WHERE team_name = ?',
          [teamName]
        );

        let needsUpdate = true;
        if (lastUpdatedRow && lastUpdatedRow.last_updated) {
          const now = new Date();
          const lastUpdated = new Date(lastUpdatedRow.last_updated);
          const diffDays = (now - lastUpdated) / (1000 * 60 * 60 * 24);
          if (diffDays <= 7) {
            needsUpdate = false;
          }
        }

        if (needsUpdate) {
          sendEvent('log', { message: `[SofaScore Squad] Effectif manquant ou obsolète pour ${teamName}. Récupération...` });
          const players = await scrapeSofaScoreSquad(scraperPath, teamURL);
          if (players && players.length > 0) {
            await importTeamSquadStats(teamName, players);
          } else {
            sendEvent('log', { message: `[SofaScore Squad] [Warning] Aucun joueur trouvé pour ${teamName} sur ${teamURL}` });
          }
        } else {
          sendEvent('log', { message: `[SofaScore Squad] Effectif à jour en BDD pour ${teamName} (dernière mise à jour: ${lastUpdatedRow.last_updated})` });
        }
      };

      if (absencesResult) {
        if (absencesResult.home_team_url) {
          await checkAndScrapeSquad(match.home_team, absencesResult.home_team_url);
        }
        if (absencesResult.away_team_url) {
          await checkAndScrapeSquad(match.away_team, absencesResult.away_team_url);
        }
      }
    } catch (absErr) {
      sendEvent('log', { message: `[SofaScore Absences] [Warning] Erreur lors de la récupération des absences pour ${match.home_team} vs ${match.away_team} : ${absErr.message}` });
    }
  }
}

/**
 * Scrapes 1XBet betting odds for basketball and football matches.
 *
 * @param {Array<object>} scrapedMatches
 * @param {object} context
 * @param {function} sendEvent
 */
export async function enrichMatchesWith1XBetOdds(scrapedMatches, context, sendEvent) {
  const { scraperPath, activePorts = [0] } = context;

  const basketballMatches = [];
  const footballMatches = scrapedMatches.filter(m => {
    const ms = (m.sport || '').toLowerCase();
    return ms === 'football' || ms === 'soccer';
  });

  const processSportOdds = async (matches, sportName) => {
    if (matches.length === 0) return;
    sendEvent('log', { message: `[1XBet Odds] Récupération des cotes pour ${matches.length} matchs de ${sportName}...` });
    try {
      const activePort = activePorts.length > 0 ? activePorts[0] : 0;
      if (activePort) {
        sendEvent('log', { message: `[1XBet Odds] Utilisation du port Tor actif : ${activePort}` });
      }
      const oneXBetOdds = await scrape1XBetOdds(scraperPath, matches, sportName, activePort);
      if (Array.isArray(oneXBetOdds) && oneXBetOdds.length > 0) {
        sendEvent('log', { message: `[1XBet Odds] ✓ ${oneXBetOdds.length} cotes récupérées depuis 1XBet pour le ${sportName}.` });

        for (const match of matches) {
          const { candidate: matchedOdds, score } = findBestMatch(match.home_team, match.away_team, oneXBetOdds);

          if (matchedOdds && score >= 0.48) {
            const oddsList = [];
            if (matchedOdds.home_odds !== null || matchedOdds.away_odds !== null) {
              oddsList.push({
                market_type: 'winner',
                home_odds: matchedOdds.home_odds,
                away_odds: matchedOdds.away_odds,
                draw_odds: matchedOdds.draw_odds || null
              });
            }
            if (Array.isArray(matchedOdds.totals)) {
              for (const t of matchedOdds.totals) {
                oddsList.push({
                  market_type: 'totals',
                  period: t.period,
                  line: t.line,
                  over_odds: t.over_odds,
                  under_odds: t.under_odds
                });
              }
            }
            if (Array.isArray(matchedOdds.handicaps)) {
              for (const h of matchedOdds.handicaps) {
                oddsList.push({
                  market_type: 'handicap',
                  period: h.period,
                  line: h.line,
                  home_odds: h.home_odds,
                  away_odds: h.away_odds
                });
              }
            }
            if (oddsList.length > 0) {
              match.odds_corners = oddsList;
              sendEvent('log', { message: `[1XBet Odds] ✓ Cotes associées pour ${match.home_team} vs ${match.away_team}` });
            }
          } else {
            sendEvent('log', { message: `[1XBet Odds] Pas de correspondance trouvée sur 1XBet (meilleur score ${score ? score.toFixed(2) : '0.00'}) pour ${match.home_team} vs ${match.away_team}` });
          }
        }
      } else {
        sendEvent('log', { message: `[1XBet Odds] [Warning] Aucune cote récupérée sur 1XBet pour le ${sportName} (possible blocage ou aucun match disponible).` });
      }
    } catch (err) {
      sendEvent('log', { message: `[1XBet Odds] [Warning] Échec du scraping 1XBet pour le ${sportName} : ${err.message}` });
    }
  };

  await processSportOdds(basketballMatches, 'basketball');
  if (!scraperState.stopScraperRequested) {
    await processSportOdds(footballMatches, 'football');
  }
}

/**
 * Scrapes Arbworld Moneyway Betfair volume distribution.
 *
 * @param {Array<object>} scrapedMatches
 * @param {object} context
 * @param {function} sendEvent
 */
export async function enrichMatchesWithBetfairVolumes(scrapedMatches, context, sendEvent) {
  const { scraperPath } = context;

  const activeSports = [];
  const hasSoccer = scrapedMatches.some(m => {
    const ms = (m.sport || '').toLowerCase().trim();
    return ms === 'football' || ms === 'soccer';
  });
  const hasBasket = scrapedMatches.some(m => (m.sport || '').toLowerCase().trim() === 'basketball');

  if (hasSoccer) activeSports.push('soccer');
  if (hasBasket) activeSports.push('basketball');

  for (let idx = 0; idx < activeSports.length; idx++) {
    const sp = activeSports[idx];
    const matchesOfSport = scrapedMatches.filter(m => {
      const matchSport = (m.sport || '').toLowerCase().trim();
      if (sp === 'soccer') return matchSport === 'football' || matchSport === 'soccer';
      return matchSport === sp;
    });

    if (matchesOfSport.length === 0) continue;

    sendEvent('log', { message: `[Arbworld] [${idx + 1}/${activeSports.length}] Téléchargement des volumes Betfair pour le sport : ${sp}...` });
    const arbEvents = await scrapeArbworldMoneyway(scraperPath, sp);
    if (Array.isArray(arbEvents) && arbEvents.length > 0) {
      sendEvent('log', { message: `[Arbworld] ✓ ${arbEvents.length} événements récupérés pour ${sp}.` });

      for (const match of matchesOfSport) {
        const best = findBestMatch(match.home_team, match.away_team, arbEvents, c => c.home, c => c.away);
        const isFuzzyMatched = best && best.candidate && (
          best.score >= 0.6 ||
          (fuzzyMatch(match.home_team, best.candidate.home) && fuzzyMatch(match.away_team, best.candidate.away))
        );

        if (isFuzzyMatched) {
          match.betfair_json = best.candidate;
          sendEvent('log', { message: `[Arbworld] ✓ Volumes Betfair associés pour ${match.home_team} vs ${match.away_team} (similarité : ${best.score.toFixed(2)})` });
        }
      }
    } else {
      sendEvent('log', { message: `[Arbworld] Aucun volume récupéré pour ${sp} (possible blocage ou aucun match disponible).` });
    }
  }
}

/**
 * Analyzes H2H links, checks SQLite cache, and launches batch scraping for uncached confrontations.
 *
 * @param {Array<object>} scrapedMatches
 * @param {object} context
 * @param {function} sendEvent
 */
export async function crawlHistoricalH2HMatches(scrapedMatches, context, sendEvent) {
  const { scraperPath, activePorts, scraper, sport, jobNetworkMode, targetStrategy } = context;

  const uncachedLinksSet = new Set();
  const linkSports = new Map();
  for (const match of scrapedMatches) {
    if (!match.home_team || !match.away_team) continue;

    let isMatchPromising = true;
    if (targetStrategy) {
      const h2hExisting = await dbQuery(`
        SELECT * FROM scraped_predictions 
        WHERE is_finished = 1 
          AND ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))
      `, [match.home_team, match.away_team, match.away_team, match.home_team]);

      isMatchPromising = evaluateSmartScrapingFilter(match, h2hExisting, targetStrategy);
    }

    if (!isMatchPromising) {
      sendEvent('log', { message: `[Smart-Scraping] Match ${match.home_team} vs ${match.away_team} écarté (stats H2H hors-cible).` });
      continue;
    }

    if (match.historical_links) {
      let linksList = [];
      try {
        linksList = typeof match.historical_links === 'string'
          ? JSON.parse(match.historical_links)
          : match.historical_links;
      } catch (e) {
        linksList = match.historical_links;
      }

      if (Array.isArray(linksList) && linksList.length > 1) {
        const prioritizedLinks = prioritizeDirectH2H(linksList, match.home_team, match.away_team);
        let matchAddedCount = 0;
        for (const link of prioritizedLinks) {
          if (matchAddedCount >= 10) break;

          const cached = await dbQuery('SELECT match_id, date, score, sport, first_half_corners_home, first_half_corners_away, statistics_json FROM scraped_predictions WHERE match_id = ?', [link]);
          const isPlaceholder = cached.length > 0 &&
            (cached[0].date === '2026-05-30' || cached[0].date === '2026-05-31' || cached[0].date.includes(':'));

          const cachedSport = cached.length > 0 ? (cached[0].sport || match.sport || sport) : (match.sport || sport);
          const isCachedFootball = cachedSport === 'football';
          const isCachedBasketball = cachedSport === 'basketball';
          const hasNoStats = cached.length > 0 && (isCachedFootball
            ? (cached[0].first_half_corners_home === null)
            : (isCachedBasketball
                ? (!cached[0].statistics_json || cached[0].statistics_json === 'null' || cached[0].statistics_json === '' || !cached[0].statistics_json.includes('first_half_points'))
                : (!cached[0].statistics_json || cached[0].statistics_json === 'null' || cached[0].statistics_json === '')));

          if (cached.length === 0 || isPlaceholder || hasNoStats) {
            uncachedLinksSet.add(link);
            linkSports.set(link, match.sport || sport);
            matchAddedCount++;
          } else {
            const score = cached[0].score || '-';
            const corners = (cached[0].first_half_corners_home !== null && cached[0].first_half_corners_home !== undefined)
              ? `${cached[0].first_half_corners_home}-${cached[0].first_half_corners_away}`
              : 'N/A';
            sendEvent('log', { message: `[H2H Cache] Confrontation déjà en cache : ${match.home_team} vs ${match.away_team} (Score: ${score}) (Corners 1ère MT: ${corners})` });
            sendEvent('h2h_scraped', { h2h: {
              match_url: link,
              home_team: match.home_team,
              away_team: match.away_team,
              score: score,
              date: cached[0].date,
              first_half_corners_home: cached[0].first_half_corners_home,
              first_half_corners_away: cached[0].first_half_corners_away,
              sport: match.sport || sport
            }});
          }
        }
      }
    }
  }

  const linksToScrape = Array.from(uncachedLinksSet).slice(0, 400);

  if (linksToScrape.length > 0) {
    sendEvent('log', { message: `[Predictix] ${linksToScrape.length} nouvelles confrontations H2H à scrapper en parallèle...` });

    await scrapeHistoricalMatches(linksToScrape, scraperPath, {
      activePorts: activePorts,
      networkMode: jobNetworkMode,
      shouldStop: () => scraperState.stopScraperRequested,
      log: (msg) => sendEvent('log', { message: msg }),
      importHistoricalMatch,
      importSkippedMatch,
      onH2HScraped: (h2hData) => sendEvent('h2h_scraped', { h2h: h2hData }),
      scraper: scraper,
      sport: sport,
      linkSports: linkSports,
      onSpawn: (child) => attachCrawlerEventListener(child, sendEvent)
    });
  }
}
