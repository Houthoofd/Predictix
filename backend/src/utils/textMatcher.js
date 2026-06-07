import https from 'https';

/**
 * Clean and split a team name for fuzzy keyword matching
 */
export function cleanTeamName(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
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
  const clean1 = (n1 || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const clean2 = (n2 || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  
  if (clean1.includes(clean2) || clean2.includes(clean1)) return true;
  
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
