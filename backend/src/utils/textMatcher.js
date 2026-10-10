import https from 'https';

/**
 * Normalizes spelling and translations of team names (e.g. Venise -> Venezia, Milan -> Milano)
 */
export function normalizeTeamNameSpelling(name) {
  let n = (name || '').toLowerCase();
  n = n.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove diacritics
  
  // French <-> Italian translations
  n = n.replace(/\bvenise\b/g, 'venezia');
  n = n.replace(/\bmilan\b/g, 'milano');
  n = n.replace(/\bturin\b/g, 'torino');
  n = n.replace(/\bflorence\b/g, 'firenze');
  n = n.replace(/\brome\b/g, 'roma');
  n = n.replace(/\bbarcelone\b/g, 'barcelona');
  n = n.replace(/\blisbonne\b/g, 'lisbon');
  n = n.replace(/\bmunich\b/g, 'bayern');
  n = n.replace(/\bmunchen\b/g, 'bayern');
  n = n.replace(/\bvalence\b/g, 'valencia');
  n = n.replace(/\bseville\b/g, 'sevilla');
  n = n.replace(/\bsaragosse\b/g, 'zaragoza');
  
  return n;
}

/**
 * Clean and split a team name for fuzzy keyword matching
 */
export function cleanTeamName(name) {
  const normalized = normalizeTeamNameSpelling(name);
  return normalized
    .replace(/[^a-z0-9]/g, ' ') // alphanumeric only
    .replace(/\b(fc|club|real|atletico|kaa|cd|gv|ladies|reserve|u23|sd|sc|ud|fk|ca)\b/g, '') // strip common prefixes
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1);
}

/**
 * Fuzzy match helper comparing two team names
 */
export function fuzzyMatch(n1, n2) {
  const norm1 = normalizeTeamNameSpelling(n1).replace(/[^a-z0-9]/g, '');
  const norm2 = normalizeTeamNameSpelling(n2).replace(/[^a-z0-9]/g, '');
  
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  const w1 = cleanTeamName(n1);
  const w2 = cleanTeamName(n2);
  if (w1.length === 0 || w2.length === 0) return false;
  
  const common = w1.filter(w => w.length >= 3 && w2.includes(w));
  return common.length > 0;
}

/**
 * Sorts and prioritizes direct H2H matches between the two teams to the front of the queue
 */
export function prioritizeDirectH2H(links, homeTeam, awayTeam) {
  if (!links || !Array.isArray(links)) return [];
  if (!homeTeam || !awayTeam) return links;

  const normalize = (name) => {
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  };

  const homeKeywords = normalize(homeTeam);
  const awayKeywords = normalize(awayTeam);

  const direct = [];
  const others = [];

  for (const link of links) {
    const lLower = link.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    
    // Check if the link contains at least one significant keyword from BOTH teams
    const matchesHome = homeKeywords.some(kw => lLower.includes(kw));
    const matchesAway = awayKeywords.some(kw => lLower.includes(kw));

    if (matchesHome && matchesAway) {
      direct.push(link);
    } else {
      others.push(link);
    }
  }

  return [...direct, ...others];
}

/**
 * Fallback to query Wikipedia Pageimages API to resolve missing team logos
 */
export function fetchWikipediaLogoFallback(teamName) {
  return new Promise((resolve) => {
    if (!teamName) return resolve(null);
    
    // Strip accent flags and clean key team keywords
    const cleanedName = teamName.replace(/[▲▼]/g, '').trim();
    const query = encodeURIComponent(`${cleanedName} football`);
    const url = `https://fr.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&gsrsearch=${query}&gsrlimit=1&pithumbsize=150`;

    const req = https.get(url, {
      headers: {
        'User-Agent': 'PredictixLogoFetcher/1.0 (benoit@predictix.local)'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.query && json.query.pages) {
            const pages = Object.values(json.query.pages);
            if (pages.length > 0 && pages[0].thumbnail) {
              return resolve(pages[0].thumbnail.source);
            }
          }
          resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(2500, () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Compute similarity score between two team names
 */
export function teamSimilarity(t1, t2) {
  const norm1 = normalizeTeamNameSpelling(t1).replace(/[^a-z0-9]/g, '');
  const norm2 = normalizeTeamNameSpelling(t2).replace(/[^a-z0-9]/g, '');
  
  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
  }
  
  const w1 = cleanTeamName(t1);
  const w2 = cleanTeamName(t2);
  if (w1.length === 0 || w2.length === 0) return 0.0;
  
  const intersection = w1.filter(w => w2.includes(w)).length;
  const union = new Set([...w1, ...w2]).size;
  return intersection / union;
}

/**
 * Find the best candidate match in a list using similarity scoring
 */
export function findBestMatch(targetHome, targetAway, candidates, getHome = c => c.home_team, getAway = c => c.away_team) {
  let bestCandidate = null;
  let bestScore = 0;
  let bestIsSwapped = false;
  
  for (const c of candidates) {
    const cHome = getHome(c);
    const cAway = getAway(c);
    if (!cHome || !cAway) continue;
    
    // Straight score
    const straightHomeScore = teamSimilarity(targetHome, cHome);
    const straightAwayScore = teamSimilarity(targetAway, cAway);
    const straightScore = (straightHomeScore + straightAwayScore) / 2;
    
    // Swapped score
    const swappedHomeScore = teamSimilarity(targetHome, cAway);
    const swappedAwayScore = teamSimilarity(targetAway, cHome);
    const swappedScore = (swappedHomeScore + swappedAwayScore) / 2;
    
    const isSwapped = swappedScore > straightScore;
    const score = Math.max(straightScore, swappedScore);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = c;
      bestIsSwapped = isSwapped;
    }
  }
  
  return { candidate: bestCandidate, score: bestScore, isSwapped: bestIsSwapped };
}

