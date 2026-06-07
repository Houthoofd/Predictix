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
