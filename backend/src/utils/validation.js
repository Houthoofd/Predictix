/**
 * Validation schema module for Predictix API endpoints
 */

/**
 * Validates a single Bet object
 * @param {Object} data - The request body containing bet data
 * @returns {Object} - { isValid: boolean, errors: string[], normalizedData: Object }
 */
export function validateBet(data) {
  const errors = [];
  const normalizedData = {};

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Données invalides ou absentes.'], normalizedData };
  }

  // 1. Required string fields
  const requiredStrings = ['date', 'time', 'league', 'home_team', 'away_team', 'best_tip'];
  for (const field of requiredStrings) {
    if (data[field] === undefined || data[field] === null || String(data[field]).trim() === '') {
      errors.push(`Le champ '${field}' est obligatoire.`);
    } else {
      normalizedData[field] = String(data[field]).trim();
    }
  }

  // 2. Validate date format (YYYY-MM-DD)
  if (normalizedData.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(normalizedData.date)) {
      errors.push("Le format de la date doit être YYYY-MM-DD.");
    } else {
      const parsedDate = new Date(normalizedData.date);
      if (isNaN(parsedDate.getTime())) {
        errors.push("La date fournie n'est pas valide.");
      }
    }
  }

  // 3. Validate time format (HH:MM)
  if (normalizedData.time) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(normalizedData.time)) {
      errors.push("Le format de l'heure doit être HH:MM.");
    }
  }

  // 4. Validate numerical fields
  // Odds must be a positive number >= 1.0
  if (data.odds === undefined || data.odds === null) {
    errors.push("Le champ 'odds' (cote) est obligatoire.");
  } else {
    const oddsVal = parseFloat(data.odds);
    if (isNaN(oddsVal) || oddsVal < 1.0) {
      errors.push("La cote ('odds') doit être un nombre supérieur ou égal à 1.0.");
    } else {
      normalizedData.odds = parseFloat(oddsVal.toFixed(2));
    }
  }

  // Stake must be a positive number > 0
  if (data.stake === undefined || data.stake === null) {
    errors.push("Le champ 'stake' (mise) est obligatoire.");
  } else {
    const stakeVal = parseFloat(data.stake);
    if (isNaN(stakeVal) || stakeVal <= 0) {
      errors.push("La mise ('stake') doit être un nombre strictement supérieur à 0.");
    } else {
      normalizedData.stake = parseFloat(stakeVal.toFixed(2));
    }
  }

  // Card line must be a number (positive or zero, e.g. 4.5, 0, 165.5)
  if (data.card_line === undefined || data.card_line === null) {
    errors.push("Le champ 'card_line' (ligne) est obligatoire.");
  } else {
    const lineVal = parseFloat(data.card_line);
    if (isNaN(lineVal) || lineVal < 0) {
      errors.push("La ligne de pari ('card_line') doit être un nombre valide.");
    } else {
      normalizedData.card_line = lineVal;
    }
  }

  // 5. Optional / default fields validation
  // Probability (optional, percentage number between 0 and 100)
  if (data.probability !== undefined && data.probability !== null) {
    const probVal = parseInt(data.probability, 10);
    if (isNaN(probVal) || probVal < 0 || probVal > 100) {
      errors.push("La probabilité doit être un entier compris entre 0 et 100.");
    } else {
      normalizedData.probability = probVal;
    }
  } else {
    normalizedData.probability = null;
  }

  // Bookmaker (optional string, defaults to 'Unibet')
  normalizedData.bookmaker = data.bookmaker && String(data.bookmaker).trim() !== '' 
    ? String(data.bookmaker).trim() 
    : 'Unibet';

  // Status (optional, must be one of: PENDING, WON, LOST, REFUNDED)
  const validStatuses = ['PENDING', 'WON', 'LOST', 'REFUNDED'];
  const statusInput = data.status ? String(data.status).toUpperCase().trim() : 'PENDING';
  if (!validStatuses.includes(statusInput)) {
    errors.push(`Le statut doit être l'un des suivants : ${validStatuses.join(', ')}.`);
  } else {
    normalizedData.status = statusInput;
  }

  // Notes, match_id, match_url, sport
  normalizedData.match_id = data.match_id ? String(data.match_id).trim() : null;
  normalizedData.match_url = data.match_url ? String(data.match_url).trim() : null;
  normalizedData.notes = data.notes ? String(data.notes).trim() : null;
  normalizedData.sport = data.sport && String(data.sport).trim() !== '' 
    ? String(data.sport).toLowerCase().trim() 
    : 'football';

  return {
    isValid: errors.length === 0,
    errors,
    normalizedData
  };
}

/**
 * Helper to validate a batch of Bets
 * @param {Array} betsArray - Array of bet objects
 * @returns {Object} - { isValid: boolean, errors: string[], normalizedBets: Array }
 */
export function validateBetsBatch(betsArray) {
  if (!Array.isArray(betsArray) || betsArray.length === 0) {
    return { isValid: false, errors: ["Le panier de paris ('bets') doit être un tableau non vide."], normalizedBets: [] };
  }

  const errors = [];
  const normalizedBets = [];

  betsArray.forEach((bet, idx) => {
    const result = validateBet(bet);
    if (!result.isValid) {
      errors.push(`Pari #${idx + 1} (${bet.home_team || 'Inconnu'} vs ${bet.away_team || 'Inconnu'}) : ` + result.errors.join(' | '));
    } else {
      normalizedBets.push(result.normalizedData);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    normalizedBets
  };
}
