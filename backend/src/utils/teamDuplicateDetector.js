import { dbQuery } from '../db/database.js';

const genericTerms = new Set([
  'fc', 'rc', 'sc', 'as', 'cd', 'ud', 'real', 'united', 'city', 'town', 
  'club', 'atletico', 'sporting', 'de', 'la', 'athletic', 'bk', 'fk', 
  'ac', 'bc', 'giants', 'w', 'cf', 'c.f.', 'f.c.', 'sd', 'deportivo',
  'union', 'academica', 'association', 'sports', 'sport', 'sv', 'clube'
]);

function cleanTeamName(name) {
  if (!name) return '';
  let cleaned = name.toLowerCase();
  // Remove punctuation
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
  // Split into tokens
  const tokens = cleaned.split(/\s+/).filter(t => t.length > 0);
  // Filter out generic terms
  const filtered = tokens.filter(t => !genericTerms.has(t));
  // Re-join
  return filtered.join(' ').trim();
}

function jaroWinkler(s1, s2) {
  if (s1.length === 0 || s2.length === 0) return 0;
  if (s1 === s2) return 1;

  const range = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let m = 0;
  for (let i = 0; i < s1.length; i++) {
    const low = Math.max(0, i - range);
    const high = Math.min(i + range + 1, s2.length);

    for (let j = low; j < high; j++) {
      if (!s2Matches[j] && s1[i] === s2[j]) {
        s1Matches[i] = true;
        s2Matches[j] = true;
        m++;
        break;
      }
    }
  }

  if (m === 0) return 0;

  let t = 0;
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (s1Matches[i]) {
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) t++;
      k++;
    }
  }

  const jaro = (m / s1.length + m / s2.length + (m - t / 2) / m) / 3;

  // Winkler modification
  const p = 0.1;
  let l = 0;
  while (s1[l] === s2[l] && l < 4) {
    l++;
  }

  return jaro + l * p * (1 - jaro);
}

export async function detectTeamDuplicates() {
  // Query all unique teams from scraped_predictions (home_team and away_team)
  const rows = await dbQuery(`
    SELECT team, COUNT(*) as match_count FROM (
      SELECT home_team as team FROM scraped_predictions WHERE is_historical = 0 AND home_team IS NOT NULL AND home_team != ''
      UNION ALL
      SELECT away_team as team FROM scraped_predictions WHERE is_historical = 0 AND away_team IS NOT NULL AND away_team != ''
    )
    GROUP BY team
    ORDER BY match_count DESC
  `);

  if (!rows || rows.length < 2) return [];

  const teams = rows.map(r => ({
    name: r.team,
    clean: cleanTeamName(r.team),
    count: r.match_count
  })).filter(t => t.clean.length >= 2); // only teams with substantial cleaned names

  const candidates = [];
  const processedPairs = new Set();

  for (let i = 0; i < teams.length; i++) {
    const t1 = teams[i];
    for (let j = i + 1; j < teams.length; j++) {
      const t2 = teams[j];
      
      // Skip if exactly the same name
      if (t1.name.toLowerCase().trim() === t2.name.toLowerCase().trim()) continue;

      const pairKey = [t1.name, t2.name].sort().join('||');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      let similarity = 0;
      if (t1.clean === t2.clean) {
        similarity = 1.0;
      } else {
        // Compute similarity on cleaned names
        similarity = jaroWinkler(t1.clean, t2.clean);
      }

      // We set a threshold for matching (e.g., 0.85)
      if (similarity >= 0.85) {
        candidates.push({
          teamA: t1.name,
          teamACount: t1.count,
          teamB: t2.name,
          teamBCount: t2.count,
          similarity
        });
      }
    }
  }

  // Sort by similarity descending, then by total match count
  return candidates.sort((a, b) => b.similarity - a.similarity || (b.teamACount + b.teamBCount) - (a.teamACount + a.teamBCount)).slice(0, 100);
}
