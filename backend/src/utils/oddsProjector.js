import { poissonUnder, findPoissonMean } from './poisson.js';

/**
 * Projects first half corner odds if missing but full time corner odds are present
 */
export function projectFirstHalfOdds(oddsCorners, lambda1MT) {
  const has1stHalf = oddsCorners.some(o => o.market_type === '1st_half');
  const hasFullTime = oddsCorners.some(o => o.market_type === 'full_time');

  if (!has1stHalf && hasFullTime) {
    const ftLine = oddsCorners.find(o => o.market_type === 'full_time' && o.over_decimal && o.under_decimal);
    if (ftLine) {
      const pOver = 1 / ftLine.over_decimal;
      const pUnder = 1 / ftLine.under_decimal;
      const totalP = pOver + pUnder;
      
      if (totalP > 0) {
        const pUnderNorm = pUnder / totalP;
        const k = Math.floor(ftLine.line);
        const derivedLambdaFT = findPoissonMean(k, pUnderNorm);
        
        // Expected 1st half corners is 46% of Full Time corners
        const derivedLambda1MT = 0.46 * derivedLambdaFT;
        const originalPayout = 1 / totalP;
        
        // Generate projected 1st half odds for lines 3.5, 4.5, 5.5
        const projectedLines = [3.5, 4.5, 5.5];
        for (const line of projectedLines) {
          const uProb = poissonUnder(derivedLambda1MT, line);
          const oProb = 1 - uProb;
          
          if (uProb > 0.02 && oProb > 0.02) {
            const overDec = parseFloat((originalPayout / oProb).toFixed(2));
            const underDec = parseFloat((originalPayout / uProb).toFixed(2));
            
            oddsCorners.push({
              line: line,
              over_decimal: overDec,
              under_decimal: underDec,
              market_type: '1st_half',
              is_estimated: true
            });
          }
        }
      }
    }
  } else if (!has1stHalf && !hasFullTime) {
    const projectedLines = [3.5, 4.5, 5.5];
    const payout = 0.93;
    for (const line of projectedLines) {
      const uProb = poissonUnder(lambda1MT, line);
      const oProb = 1 - uProb;
      
      if (uProb > 0.02 && oProb > 0.02) {
        const overDec = parseFloat((payout / oProb).toFixed(2));
        const underDec = parseFloat((payout / uProb).toFixed(2));
        
        oddsCorners.push({
          line: line,
          over_decimal: overDec,
          under_decimal: underDec,
          market_type: '1st_half',
          is_estimated: true
        });
      }
    }
  }
  return oddsCorners;
}
