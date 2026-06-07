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
    corners: 'Corners'
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

export const formatTipLabel = (tip, line, sport) => {
  const cleanTip = (tip || '').toLowerCase();
  const cleanSport = (sport || 'football').toLowerCase();
  
  if (cleanTip === 'over' || cleanTip === 'plus de') {
    return cleanSport === 'football' ? `Plus de ${line} Corners (1MT)` : `Over ${line}`;
  } else if (cleanTip === 'under' || cleanTip === 'moins de') {
    return cleanSport === 'football' ? `Moins de ${line} Corners (1MT)` : `Under ${line}`;
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

