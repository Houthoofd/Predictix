// Multi-Bankroll Default Data
export const defaultBankrolls = [
  { id: 'main', name: 'Bankroll Principale', initial: 1000, current: 1450, roi: '+45.0%', sport: 'Multisport', color: '#1D7CEA' },
  { id: 'football', name: 'Bankroll Football & Corners', initial: 500, current: 720, roi: '+44.0%', sport: 'Football', color: '#10B981' },
  { id: 'basket', name: 'Bankroll NBA & Basketball', initial: 300, current: 395, roi: '+31.6%', sport: 'Basketball', color: '#F59E0B' },
  { id: 'tennis', name: 'Bankroll Tennis ATP/WTA', initial: 200, current: 240, roi: '+20.0%', sport: 'Tennis', color: '#8B5CF6' },
];

// Strategies Created & Tested
export const defaultStrategies = [
  {
    id: 'strat-1',
    name: 'Corners Over 9.5 (Équipes Offensives)',
    type: 'corners_over',
    threshold: 9.5,
    odds: 1.85,
    sport: 'Football',
    winRate: 76.0,
    roi: '+18.4%',
    betsCount: 54,
    rules: 'Cote min 1.70 • Pression offensive > 65% • Corners concédés adversaire > 4.5',
  },
  {
    id: 'strat-2',
    name: 'Cartons Jaunes > 4.5 (Derbies & Arbitres sévères)',
    type: 'cards_over',
    threshold: 4.5,
    odds: 2.10,
    sport: 'Football',
    winRate: 69.2,
    roi: '+24.1%',
    betsCount: 38,
    rules: 'Arbitre moy > 4.2 cartons/match • Confrontation rivalité directe • Cote min 1.85',
  },
  {
    id: 'strat-3',
    name: 'Plus de 2.5 Buts (Matchs Ouverts)',
    type: 'over_2_5',
    threshold: 2.5,
    odds: 1.75,
    sport: 'Football',
    winRate: 65.4,
    roi: '+14.2%',
    betsCount: 46,
    rules: 'Moyenne buts supérieure à 2.8 • Attaques en forme • Cote min 1.75',
  },
  {
    id: 'strat-4',
    name: 'Les 2 Équipes Marquent (BTTS)',
    type: 'btts',
    threshold: 0,
    odds: 1.80,
    sport: 'Football',
    winRate: 62.5,
    roi: '+12.5%',
    betsCount: 32,
    rules: 'Défenses perméables sur les 5 derniers matchs • Cote min 1.80',
  },
];

// Capital Evolution Chart Data
export const bankrollHistoryData = [
  { date: '01 Oct', bankroll: 1000 },
  { date: '02 Oct', bankroll: 1045 },
  { date: '03 Oct', bankroll: 1020 },
  { date: '04 Oct', bankroll: 1110 },
  { date: '05 Oct', bankroll: 1180 },
  { date: '06 Oct', bankroll: 1160 },
  { date: '07 Oct', bankroll: 1250 },
  { date: '08 Oct', bankroll: 1310 },
  { date: '09 Oct', bankroll: 1390 },
  { date: '10 Oct', bankroll: 1450 },
];

// Betting Tracker Initial Data
export const betsTrackerData = [
  { id: 1, date: '10 Oct', match: 'Arsenal vs Chelsea', sport: 'Football', bet: 'Corners > 9.5', odds: 1.85, stake: 50, status: 'won', profit: '+42.50 €', bankroll: 'Football & Corners' },
  { id: 2, date: '09 Oct', match: 'Boston Celtics vs NY Knicks', sport: 'Basketball', bet: 'Total Points > 224.5', odds: 1.90, stake: 35, status: 'won', profit: '+31.50 €', bankroll: 'NBA & Basketball' },
  { id: 3, date: '09 Oct', match: 'Alcaraz vs Sinner', sport: 'Tennis', bet: 'Plus de 22.5 jeux', odds: 1.82, stake: 30, status: 'won', profit: '+24.60 €', bankroll: 'Tennis ATP/WTA' },
  { id: 4, date: '08 Oct', match: 'Real Madrid vs Barcelone', sport: 'Football', bet: 'Cartons Jaunes > 4.5', odds: 2.10, stake: 40, status: 'won', profit: '+44.00 €', bankroll: 'Football & Corners' },
  { id: 5, date: '08 Oct', match: 'LAL Lakers vs Golden State', sport: 'Basketball', bet: 'LAL -3.5 Handicap', odds: 1.95, stake: 30, status: 'lost', profit: '-30.00 €', bankroll: 'NBA & Basketball' },
  { id: 6, date: '07 Oct', match: 'PSG vs Marseille', sport: 'Football', bet: 'Victoire PSG & +2.5 buts', odds: 1.70, stake: 50, status: 'won', profit: '+35.00 €', bankroll: 'Football & Corners' },
];
