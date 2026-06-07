/**
 * Utility functions for parsing text pasted from match-en-direct.fr
 */

export function parseMatchEnDirectText(pasteText) {
  if (!pasteText.trim()) {
    throw new Error('Veuillez coller du texte brut de Match en Direct.');
  }

  const lines = pasteText.split('\n').map(l => l.trim().toLowerCase()).filter(l => l !== '');
  
  const parsed = {
    possession: { home: 50, away: 50 },
    corners: { home: null, away: null },
    corners1MT: { home: null, away: null },
    fouls: { home: null, away: null },
    yellow_cards: { home: null, away: null },
    red_cards: { home: null, away: null },
    shots_on_target: { home: null, away: null },
    shots: { home: null, away: null },
    offsides: { home: null, away: null },
    score: '',
    date: ''
  };

  const extractNumbers = (str) => {
    const matches = str.match(/\d+/g);
    if (matches && matches.length >= 2) {
      return [parseInt(matches[0], 10), parseInt(matches[1], 10)];
    }
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^\d+\s*-\s*\d+$/)) {
      parsed.score = line.replace(/\s+/g, '');
      continue;
    }

    if (line.includes('date') || ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].some(d => line.includes(d))) {
      const dateMatch = line.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/);
      if (dateMatch) {
        parsed.date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }
    }

    const checkMetric = (key, terms) => {
      if (!terms.some(t => line.includes(t))) return false;
      let nums = extractNumbers(line);
      if (nums) {
        parsed[key] = { home: nums[0], away: nums[1] };
        return true;
      }
      if (i + 1 < lines.length) {
        nums = extractNumbers(lines[i + 1]);
        if (nums) {
          parsed[key] = { home: nums[0], away: nums[1] };
          return true;
        }
        if (i + 2 < lines.length) {
          const val1 = parseInt(lines[i + 1], 10);
          const val2 = parseInt(lines[i + 2], 10);
          if (!isNaN(val1) && !isNaN(val2)) {
            parsed[key] = { home: val1, away: val2 };
            return true;
          }
        }
      }
      return false;
    };

    checkMetric('possession', ['possession']);
    checkMetric('corners1MT', ['corners 1', 'corners (1', 'corners 1mt', 'corners first half', 'mi-temps corners', '1ère mi-temps corners', 'corners 1er mi-temps']);
    
    if (!line.includes('1ère') && !line.includes('1mt') && !line.includes('mi-temps') && !line.includes('1er')) {
      checkMetric('corners', ['corners', 'corner']);
    }
    checkMetric('fouls', ['fautes', 'fouls', 'fautes commises']);
    checkMetric('yellow_cards', ['cartons jaunes', 'yellow cards', 'jaunes']);
    checkMetric('red_cards', ['cartons rouges', 'red cards', 'rouges']);
    checkMetric('shots_on_target', ['tirs cadrés', 'shots on target', 'cadrés']);
    checkMetric('shots', ['tirs', 'shots', 'tirs totaux']);
    checkMetric('offsides', ['hors-jeu', 'offsides', 'hors jeu']);
  }

  return parsed;
}
