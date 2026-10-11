const API_BASE_URL = process.env.PREDICTIX_API_URL || 'http://100.116.45.107:3100';
const API_READ_KEY = process.env.PREDICTIX_API_READ_KEY || 'abe2a7f2a22f725ec2c6112e15df25bb66a75cd7cacdacbe60d5a9d623d92f18';

/**
 * Perform authenticated query to predictix-api upstream
 */
export async function queryPredictixApi(path, params = {}) {
  const url = new URL(path, API_BASE_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  const response = await fetch(url.toString(), {
    headers: API_READ_KEY ? { Authorization: `Bearer ${API_READ_KEY}` } : {},
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    throw new Error(`predictix-api upstream error HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Classify betting market into clean categories
 */
export function classifyMarketCategory(marketName) {
  const lower = (marketName || '').toLowerCase();
  if (lower.includes('résultat') || lower.includes('vainqueur') || lower.includes('1x2')) {
    return 'Résultat';
  }
  if (
    lower.includes('but') ||
    lower.includes('point') ||
    lower.includes('total') ||
    lower.includes('over') ||
    lower.includes('plus de')
  ) {
    return 'Totaux & Buts';
  }
  if (lower.includes('double') || lower.includes('chance')) {
    return 'Double Chance';
  }
  if (lower.includes('handicap') || lower.includes('écart')) {
    return 'Handicap';
  }
  if (lower.includes('deux équipes') || lower.includes('marquent') || lower.includes('btts')) {
    return 'Les 2 Marquent';
  }
  return 'Spéciaux';
}

/**
 * Normalize an event capture item into a unified confrontation representation
 */
export function normalizeConfrontation(item, disciplinesList = []) {
  const ev = item.event || {};
  const disc = disciplinesList.find((d) => d.id === item.sport_id);
  const sportName = disc?.name || ev.sport_raw || 'Multisport';

  let homeTeam = ev.home_team;
  let awayTeam = ev.away_team;
  if (!homeTeam && ev.participants_raw && ev.participants_raw.length > 0) {
    homeTeam = ev.participants_raw[0]?.name?.value || ev.participants_raw[0]?.name?.short;
  }
  if (!awayTeam && ev.participants_raw && ev.participants_raw.length > 1) {
    awayTeam = ev.participants_raw[1]?.name?.value || ev.participants_raw[1]?.name?.short;
  }
  if (!homeTeam) homeTeam = disc?.sampleMatch?.split(' vs ')?.[0] || 'Équipe Domicile';
  if (!awayTeam) awayTeam = disc?.sampleMatch?.split(' vs ')?.[1] || 'Équipe Extérieur';

  return {
    id: item.id,
    eventId: item.event_id,
    sportId: item.sport_id,
    sportName,
    category: disc?.category || 'Sports',
    homeTeam,
    awayTeam,
    match: `${homeTeam} vs ${awayTeam}`,
    competition: ev.competition || disc?.competition || 'Compétition officielle',
    kickoffAt: ev.kickoff_at || item.captured_at,
    phase: ev.phase || 'prematch',
    isEsport: !!(item.is_esport || disc?.isEsport),
    quoteCount: item.quote_count || 0,
    defaultOdds: disc?.defaultOdds || [1.85, 3.20, 4.00],
    capturedAt: item.captured_at,
  };
}

/**
 * Group raw Bwin quotes by market with categorization
 */
export function groupQuotesByMarket(quotes = [], confrontationFallback = {}, disc = null) {
  const grouped = {};

  for (const q of quotes) {
    const marketName = q.market_raw || 'Marché Principal';
    if (!grouped[marketName]) {
      grouped[marketName] = [];
    }

    const category = classifyMarketCategory(marketName);

    grouped[marketName].push({
      id: q.selection_id || `${q.market_id || 'm'}-${grouped[marketName].length}`,
      marketId: q.market_id,
      selection: q.selection_raw,
      odds: q.decimal_price,
      oddsRaw: q.odds_raw,
      phase: q.phase,
      category,
    });
  }

  let marketsList = Object.entries(grouped).map(([marketName, selections]) => ({
    name: marketName,
    category: selections[0]?.category || 'Général',
    selections: selections.filter((s) => s.odds !== null && s.odds > 0),
  }));

  // Fallback standard markets if empty
  if (marketsList.length === 0 || marketsList.every((m) => m.selections.length === 0)) {
    const home = confrontationFallback.homeTeam || 'Équipe 1';
    const away = confrontationFallback.awayTeam || 'Équipe 2';
    const defaultOdds = disc?.defaultOdds || [1.85, 3.40, 4.20];

    marketsList = [
      {
        name: 'Résultat du match (1X2)',
        category: 'Résultat',
        selections: [
          { id: '1', selection: `${home} (1)`, odds: defaultOdds[0] || 1.85 },
          { id: 'X', selection: 'Match Nul (X)', odds: defaultOdds[1] || 3.40 },
          { id: '2', selection: `${away} (2)`, odds: defaultOdds[2] || 4.20 },
        ],
      },
      {
        name: 'Nombre Total de Buts / Points (Plus ou Moins)',
        category: 'Totaux & Buts',
        selections: [
          { id: 'over25', selection: 'Plus de 2.5', odds: 1.78 },
          { id: 'under25', selection: 'Moins de 2.5', odds: 2.05 },
          { id: 'over35', selection: 'Plus de 3.5', odds: 2.95 },
          { id: 'under35', selection: 'Moins de 3.5', odds: 1.40 },
        ],
      },
      {
        name: 'Double Chance',
        category: 'Double Chance',
        selections: [
          { id: '1X', selection: `${home} ou Nul (1X)`, odds: 1.22 },
          { id: '12', selection: `${home} ou ${away} (12)`, odds: 1.30 },
          { id: 'X2', selection: `Nul ou ${away} (X2)`, odds: 1.95 },
        ],
      },
      {
        name: 'Les deux équipes marquent (BTTS)',
        category: 'Les 2 Marquent',
        selections: [
          { id: 'btts_yes', selection: 'Oui', odds: 1.80 },
          { id: 'btts_no', selection: 'Non', odds: 1.95 },
        ],
      },
      {
        name: 'Handicap Européen (-1.0)',
        category: 'Handicap',
        selections: [
          { id: 'h_home', selection: `${home} (-1)`, odds: 3.10 },
          { id: 'h_draw', selection: `Match nul (-1)`, odds: 3.60 },
          { id: 'h_away', selection: `${away} (+1)`, odds: 1.90 },
        ],
      },
    ];
  }

  return marketsList;
}
