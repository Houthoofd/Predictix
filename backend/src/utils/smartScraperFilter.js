/**
 * Smart-Scraping filter evaluation to avoid crawling matchups that don't match conditions
 */
export function evaluateSmartScrapingFilter(match, h2hExisting, targetStrategy) {
  if (!targetStrategy) return true;
  if (!h2hExisting || h2hExisting.length < 2) return true;
  
  try {
    const conds = JSON.parse(targetStrategy.conditions_json);
    const threshold = parseFloat(conds.threshold);
    const metric = targetStrategy.metric;
    const operator = conds.operator || '>=';
    
    const values = [];
    for (const h of h2hExisting) {
      if (h.statistics_json) {
        const stats = JSON.parse(h.statistics_json);
        if (metric === 'possession') {
          if (stats.possession && stats.possession.home !== undefined) {
            const val = (h.home_team === match.home_team) 
              ? parseFloat(stats.possession.home) 
              : parseFloat(stats.possession.away);
            values.push(val);
          }
        } else if (stats[metric]) {
          values.push(parseFloat(stats[metric].home) + parseFloat(stats[metric].away));
        }
      }
    }

    if (values.length >= 2) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const margin = metric === 'possession' ? 5.0 : 2.5; // Tolerance buffer
      
      if (operator === '>=' && avg < (threshold - margin)) {
        return false;
      } else if (operator === '<=' && avg > (threshold + margin)) {
        return false;
      }
    }
  } catch (e) {
    console.error("Smart-Scraping filter evaluation failed:", e);
  }
  return true;
}
