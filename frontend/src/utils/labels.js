export const sportLabels = {
  football: 'Football',
  basketball: 'Basketball',
  tennis: 'Tennis',
  rugby: 'Rugby',
  handball: 'Handball',
  volleyball: 'Volleyball',
  hockey: 'Hockey sur glace',
  baseball: 'Baseball',
  'american-football': 'Football Américain',
  'table-tennis': 'Tennis de table',
  badminton: 'Badminton',
  cricket: 'Cricket',
  snooker: 'Snooker',
  futsal: 'Futsal'
};

export const ALL_SPORTS = [
  'football',
  'basketball',
  'tennis',
  'rugby',
  'handball',
  'volleyball',
  'hockey',
  'baseball',
  'american-football',
  'table-tennis',
  'badminton',
  'cricket',
  'snooker',
  'futsal'
];

export const getMetricLabel = (metric) => {
  const labels = {
    fouls: 'Fautes',
    yellow_cards: 'Cartons Jaunes',
    possession: 'Possession',
    shots_on_target: 'Tirs Cadrés',
    shots: 'Tirs',
    offsides: 'Hors-jeu',
    corners: 'Corners',
    first_half_points: 'Points 1ère MT',
    goals: 'Buts / Points',
    total_rebounds: 'Rebonds',
    assists: 'Passes Décisives',
    blocks: 'Contres',
    steals: 'Interceptions',
    field_goals: 'Paniers Réussis',
    free_throws: 'Lancers Francs',
    aces: 'Aces',
    double_faults: 'Doubles Fautes',
    first_serve: '1er Service (%)',
    break_points: 'Balles de Break',
    tries: 'Essais',
    penalties: 'Pénalités',
    conversions: 'Transformations',
    saves: 'Arrêts'
  };
  return labels[metric] || metric;
};

export function parseTournament(t) {
  if (!t) return { country: 'International', league: 'Divers' };
  let clean = t.replace(/^Match en Direct\s*/i, '').replace(/\(live score en direct\)/gi, '').trim();
  clean = clean.replace(/\s+/g, ' ');

  const uppercaseCountries = [
    'USA', 'FRANCE', 'SPAIN', 'TURKEY', 'ARGENTINA', 'AUSTRALIA', 'BRAZIL', 'CANADA', 'CHILE', 'COLOMBIA',
    'CROATIA', 'CZECH REPUBLIC', 'DOMINICAN REPUBLIC', 'GERMANY', 'INDONESIA', 'ISRAEL', 'ITALY', 'LEBANON',
    'LITHUANIA', 'MEXICO', 'NETHERLANDS', 'NEW ZEALAND', 'PHILIPPINES', 'PORTUGAL', 'PUERTO RICO', 'VENEZUELA',
    'VIETNAM', 'WORLD'
  ];
  
  const cleanWithNoColon = clean.endsWith(':') ? clean.slice(0, -1) : clean;
  for (const c of uppercaseCountries) {
    if (cleanWithNoColon.endsWith(c)) {
      const league = cleanWithNoColon.slice(0, -c.length).trim();
      const countryFormatted = c === 'USA' ? 'USA' : c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return {
        country: countryFormatted,
        league: league || 'Divers'
      };
    }
  }

  if (clean.includes(':')) {
    const parts = clean.split(':');
    if (parts[1] && parts[1].trim() !== '') {
      return { country: parts[0].trim(), league: parts[1].trim() };
    }
  }

  const countries = ['Afrique du Sud', 'Algérie', 'Allemagne', 'Angleterre', 'Arabie Saoudite', 'Argentine', 'Australie', 'Autriche', 'Belgique', 'Brésil', 'Canada', 'Chili', 'Chine', 'Colombie', 'Corée du Sud', 'Croatie', 'Danemark', 'Espagne', 'États-Unis', 'Finlande', 'France', 'Grèce', 'Italie', 'Japon', 'Maroc', 'Mexique', 'Pays-Bas', 'Pologne', 'Portugal', 'Suisse', 'Turquie', 'Uruguay', 'Europe', 'Asie', 'Afrique', 'Amérique'];
  for (const c of countries) {
    if (clean.toLowerCase().startsWith(c.toLowerCase())) {
      let rest = clean.substring(c.length).trim();
      const hyphenIdx = rest.indexOf(' - ');
      if (hyphenIdx > 0) rest = rest.substring(0, hyphenIdx).trim();
      return { country: c, league: rest || 'Divers' };
    }
  }
  return { country: 'International', league: clean };
}

export const formatTipLabel = (tip, line, sport, notes = '') => {
  const cleanTip = (tip || '').toLowerCase().trim();
  const cleanSport = (sport || 'football').toLowerCase().trim();
  const cleanNotes = (notes || '').toLowerCase();

  // Determine the metric based on notes, fallback to guessing by sport
  let isCorners = false;
  let isGoals = false;
  let isPoints = false;
  let isSets = false;

  if (cleanNotes.includes('corner')) {
    isCorners = true;
  } else if (cleanNotes.includes('but') || cleanNotes.includes('goal')) {
    isGoals = true;
  } else if (cleanNotes.includes('point')) {
    isPoints = true;
  } else if (cleanNotes.includes('set')) {
    isSets = true;
  } else {
    // Guessing by sport
    if (cleanSport === 'football' || cleanSport === 'hockey' || cleanSport === 'futsal') {
      const lineNum = parseFloat(line);
      // Usually corners are >= 4.5, goals are <= 3.5
      if (!isNaN(lineNum) && lineNum >= 4.5) {
        isCorners = true;
      } else {
        isGoals = true;
      }
    } else if (cleanSport === 'basketball' || cleanSport === 'rugby' || cleanSport === 'american-football' || cleanSport === 'handball') {
      isPoints = true;
    } else if (cleanSport === 'tennis' || cleanSport === 'volleyball' || cleanSport === 'table-tennis' || cleanSport === 'badminton') {
      isSets = true;
    }
  }

  // Format label
  const isOver = cleanTip === 'over' || cleanTip === 'plus de';
  const isUnder = cleanTip === 'under' || cleanTip === 'moins de';

  if (isOver || isUnder) {
    const prefix = isOver ? 'Plus de' : 'Moins de';
    if (isCorners) {
      // Check if notes indicate first half
      const is1MT = cleanNotes.includes('1ère mi-temps') || cleanNotes.includes('1mt') || cleanNotes.includes('1st half');
      return `${prefix} ${line} Corners${is1MT ? ' (1MT)' : ''}`;
    }
    if (isGoals) {
      return `${prefix} ${line} Buts`;
    }
    if (isPoints) {
      // Check if notes indicate first half
      const is1MT = cleanNotes.includes('1ère mi-temps') || cleanNotes.includes('1mt') || cleanNotes.includes('first half') || cleanNotes.includes('1er qt') || cleanNotes.includes('quarter');
      return `${prefix} ${line} Points${is1MT ? ' (MT/QT)' : ''}`;
    }
    if (isSets) {
      return `${prefix} ${line} Sets`;
    }
    // Fallback for other metrics/sports
    return `${isOver ? 'Over' : 'Under'} ${line}`;
  }

  const lineNum = parseFloat(line);
  if (cleanTip === '1' || cleanTip === 'home' || cleanTip === 'domicile') {
    if (!isNaN(lineNum) && lineNum !== 0) {
      return `1 (Handicap ${lineNum > 0 ? '+' : ''}${lineNum})`;
    }
    return '1 (Victoire Domicile)';
  }
  if (cleanTip === '2' || cleanTip === 'away' || cleanTip === 'extérieur' || cleanTip === 'exterieur') {
    if (!isNaN(lineNum) && lineNum !== 0) {
      return `2 (Handicap ${lineNum > 0 ? '+' : ''}${lineNum})`;
    }
    return '2 (Victoire Extérieur)';
  }
  if (cleanTip === 'x' || cleanTip === 'n' || cleanTip === 'nul' || cleanTip === 'match nul') {
    return 'N (Match Nul)';
  }

  return `${tip} ${line}`;
};

export function getConfidenceBadge(prob) {
  if (prob === undefined || prob === null) {
    return {
      label: 'N/A',
      color: '#9ca3af',
      bg: 'rgba(156, 163, 175, 0.08)',
      border: '1px solid rgba(156, 163, 175, 0.15)'
    };
  }
  const probVal = typeof prob === 'string' ? (parseInt(prob) || 50) : prob;
  if (probVal >= 63) {
    return {
      label: 'Confiance Forte',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.08)',
      border: '1px solid rgba(16, 185, 129, 0.15)'
    };
  } else if (probVal >= 56) {
    return {
      label: 'Confiance Moyenne',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.08)',
      border: '1px solid rgba(245, 158, 11, 0.15)'
    };
  } else {
    return {
      label: 'Confiance Faible',
      color: '#a8a29e',
      bg: 'rgba(156, 163, 175, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.06)'
    };
  }
}



