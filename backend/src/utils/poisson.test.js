import { describe, it, expect } from 'vitest';
import { poissonProbability, poissonOver, poissonUnder, findPoissonMean } from './poisson.js';

describe('Poisson Distribution Mathematical Helpers', () => {
  describe('poissonProbability', () => {
    it('should calculate correct probability for exact events', () => {
      // P(X = 0) with lambda = 2: e^-2 = ~0.1353
      expect(poissonProbability(2.0, 0)).toBeCloseTo(0.135335, 4);
      
      // P(X = 1) with lambda = 2: 2 * e^-2 = ~0.2707
      expect(poissonProbability(2.0, 1)).toBeCloseTo(0.27067, 4);
      
      // P(X = 2) with lambda = 2: (4 * e^-2) / 2 = ~0.2707
      expect(poissonProbability(2.0, 2)).toBeCloseTo(0.27067, 4);
    });
  });

  describe('poissonOver', () => {
    it('should calculate correct cumulative probability of being strictly greater than a line', () => {
      // P(X > 0.5) with lambda = 1.5. Floor is 0. Under <= 0 is P(X = 0) = e^-1.5 = 0.2231.
      // So Over = 1 - 0.2231 = 0.7769
      expect(poissonOver(1.5, 0.5)).toBeCloseTo(0.77687, 4);

      // P(X > 1.5) with lambda = 2. Floor is 1. Under <= 1 is P(X=0) + P(X=1) = e^-2 + 2*e^-2 = 3*e^-2 = 0.406.
      // Over = 1 - 0.406 = 0.594
      expect(poissonOver(2.0, 1.5)).toBeCloseTo(0.59399, 4);
    });
  });

  describe('poissonUnder', () => {
    it('should calculate correct cumulative probability of being strictly less than a line', () => {
      // P(X < 1.5) with lambda = 2.0. Floor of ceil(1.5)-1 = 1. Under <= 1 is P(X=0) + P(X=1) = ~0.406
      expect(poissonUnder(2.0, 1.5)).toBeCloseTo(0.40600, 4);

      // Sum of Over(line) + Under(line) should equal 1 (for same non-integer line)
      const lambda = 2.5;
      const line = 2.5;
      expect(poissonOver(lambda, line) + poissonUnder(lambda, line)).toBeCloseTo(1.0, 6);
    });
  });

  describe('findPoissonMean', () => {
    it('should converge to correct mean parameter lambda', () => {
      // Find mean lambda where P(X <= 2) = 0.5
      const targetProb = 0.5;
      const k = 2;
      const mean = findPoissonMean(k, targetProb);
      
      // Verification: cumulative prob of X <= 2 with computed mean should be close to 0.5
      let sumUnder = 0;
      let current = 1;
      for (let i = 0; i <= k; i++) {
        if (i > 0) {
          current = current * mean / i;
        }
        sumUnder += current;
      }
      const actualProb = sumUnder * Math.exp(-mean);
      expect(actualProb).toBeCloseTo(targetProb, 4);
    });
  });
});
