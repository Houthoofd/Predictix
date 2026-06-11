// Smart deterministic NLP Pattern Matcher for Magic Strategies
export function parsePromptToStrategy(prompt) {
  const text = (prompt || '').toLowerCase();
  
  // 1. Identify Metric
  let metric = 'corners'; // Default fallback
  let metricLabel = 'Corners';
  if (text.includes('faute')) {
    metric = 'fouls';
    metricLabel = 'Fautes commises';
  } else if (text.includes('carton') || text.includes('jaune') || text.includes('rouge')) {
    metric = 'yellow_cards';
    metricLabel = 'Cartons';
  } else if (text.includes('possession') || text.includes('balle')) {
    metric = 'possession';
    metricLabel = 'Possession';
  } else if (text.includes('tir') && text.includes('cadr')) {
    metric = 'shots_on_target';
    metricLabel = 'Tirs cadrés';
  } else if (text.includes('tir')) {
    metric = 'shots';
    metricLabel = 'Tirs';
  } else if (text.includes('hors-jeu') || text.includes('hors jeu')) {
    metric = 'offsides';
    metricLabel = 'Hors-jeu';
  } else if (text.includes('rebond')) {
    metric = 'total_rebounds';
    metricLabel = 'Rebonds';
  } else if (text.includes('passe') || text.includes('assist')) {
    metric = 'assists';
    metricLabel = 'Passes décisives';
  } else if (text.includes('contre') || text.includes('block')) {
    metric = 'blocks';
    metricLabel = 'Contres';
  } else if (text.includes('interception') || text.includes('steal')) {
    metric = 'steals';
    metricLabel = 'Interceptions';
  } else if (text.includes('panier') || text.includes('field goal')) {
    metric = 'field_goals';
    metricLabel = 'Paniers';
  } else if (text.includes('lancer franc') || text.includes('free throw')) {
    metric = 'free_throws';
    metricLabel = 'Lancers francs';
  } else if (text.includes('ace')) {
    metric = 'aces';
    metricLabel = 'Aces';
  } else if (text.includes('double faute') || text.includes('double fault')) {
    metric = 'double_faults';
    metricLabel = 'Doubles fautes';
  } else if (text.includes('premier service') || text.includes('1er service') || text.includes('first serve')) {
    metric = 'first_serve';
    metricLabel = 'Premiers services';
  } else if (text.includes('break')) {
    metric = 'break_points';
    metricLabel = 'Balles de break';
  } else if (text.includes('essai') || text.includes('trie')) {
    metric = 'tries';
    metricLabel = 'Essais';
  } else if (text.includes('pénalité') || text.includes('penal')) {
    metric = 'penalties';
    metricLabel = 'Pénalités';
  } else if (text.includes('transformation') || text.includes('conversion')) {
    metric = 'conversions';
    metricLabel = 'Transformations';
  } else if ((text.includes('mi-temps') || text.includes('half') || text.includes('period') || text.includes('mt')) && (text.includes('but') || text.includes('goal') || text.includes('point') || text.includes('score'))) {
    metric = 'first_half_points';
    metricLabel = 'Points 1ère Mi-Temps';
  } else if (text.includes('but') || text.includes('goal') || text.includes('point') || text.includes('score')) {
    metric = 'goals';
    metricLabel = 'Buts / Points';
  } else if (text.includes('arrêt') || text.includes('save')) {
    metric = 'saves';
    metricLabel = 'Arrêts';
  }

  // 2. Identify Operator
  let operator = '>='; // Default fallback
  let opLabel = 'au moins';
  if (text.includes('moins') || text.includes('inférieur') || text.includes('<') || text.includes('maximum')) {
    operator = '<=';
    opLabel = 'maximum';
  }

  // 3. Identify Scope & Limit (e.g., "5 H2H" or "10 confrontations")
  let scope = 'h2h';
  let limit = 5;
  const h2hMatch = text.match(/(\d+)\s*(?:confrontation|h2h|oppo|rencontre|match)/);
  if (h2hMatch) {
    limit = parseInt(h2hMatch[1], 10);
  }

  // 4. Identify Threshold (excluding the number used for limit if possible)
  let threshold = null;
  const numMatch = text.match(/\d+\.\d+|\d+/g);
  if (numMatch) {
    for (const numStr of numMatch) {
      const val = parseFloat(numStr);
      if (val === limit && text.includes(numStr + ' h2h') || text.includes(numStr + ' match') || text.includes(numStr + ' confrontation')) {
        continue;
      }
      threshold = val;
      break;
    }
    if (threshold === null && numMatch.length > 0) {
      threshold = parseFloat(numMatch[numMatch.length - 1]);
    }
  }

  // Set default thresholds if no number was extracted
  if (threshold === null) {
    if (metric === 'fouls') threshold = 24.5;
    else if (metric === 'yellow_cards') threshold = 3.5;
    else if (metric === 'possession') threshold = 50.0;
    else if (metric === 'shots_on_target') threshold = 8.5;
    else if (metric === 'shots') threshold = 18.5;
    else if (metric === 'offsides') threshold = 3.5;
    else if (metric === 'total_rebounds') threshold = 70.5;
    else if (metric === 'assists') threshold = 38.5;
    else if (metric === 'blocks') threshold = 7.5;
    else if (metric === 'steals') threshold = 12.5;
    else if (metric === 'field_goals') threshold = 60.5;
    else if (metric === 'free_throws') threshold = 30.5;
    else if (metric === 'aces') threshold = 12.5;
    else if (metric === 'double_faults') threshold = 5.5;
    else if (metric === 'first_serve') threshold = 60.0;
    else if (metric === 'break_points') threshold = 4.5;
    else if (metric === 'tries') threshold = 4.5;
    else if (metric === 'penalties') threshold = 3.5;
    else if (metric === 'conversions') threshold = 3.5;
    else if (metric === 'goals') threshold = 5.5;
    else if (metric === 'first_half_points') threshold = 75.5;
    else if (metric === 'saves') threshold = 14.5;
    else threshold = 4.5;
  }

  const name = `${metricLabel} : ${opLabel} ${threshold} (Moyenne H2H)`;

  const conditions = {
    scope: scope,
    limit: limit,
    operator: operator,
    threshold: threshold,
    aggregation: 'avg'
  };

  return {
    name,
    metric,
    conditions
  };
}
