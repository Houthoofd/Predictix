import { describe, it, expect } from 'vitest';
import { 
  DecisionTreeRegressor, 
  GradientBoostingRegressor, 
  bivariatePoissonPMF, 
  bivariatePoissonUnder, 
  bivariatePoissonOver 
} from './gradientBoosting.js';

describe('Decision Tree Regressor', () => {
  it('should train and predict basic numeric features', () => {
    // Simple dataset: if feature_1 <= 5, target = 10; else target = 20
    const X = [
      { f1: 2.0 },
      { f1: 3.0 },
      { f1: 7.0 },
      { f1: 8.0 }
    ];
    const y = [10.0, 10.0, 20.0, 20.0];

    const tree = new DecisionTreeRegressor({ maxDepth: 2, minSamplesSplit: 2 });
    tree.fit(X, y);

    expect(tree.root).toBeDefined();
    expect(tree.root.feature).toBe('f1');
    expect(tree.root.threshold).toBeCloseTo(5.0, 1);

    const predictions = tree.predict(X);
    expect(predictions[0]).toBe(10.0);
    expect(predictions[2]).toBe(20.0);
  });
});

describe('Gradient Boosting Regressor (GBDT)', () => {
  it('should fit and decrease residuals on mock training data', () => {
    // Let's create a dataset representing simple relationship: target = f1 * 2 + 5
    const X = [];
    const y = [];
    for (let i = 0; i < 10; i++) {
      X.push({ f1: i });
      y.push(i * 2 + 5);
    }

    const gbdt = new GradientBoostingRegressor({ nEstimators: 80, learningRate: 0.1, maxDepth: 3 });
    gbdt.fit(X, y);

    const preds = gbdt.predict(X);
    // Predictions should be close to actual targets
    for (let i = 0; i < y.length; i++) {
      expect(preds[i]).toBeCloseTo(y[i], 1);
    }

    // Individual prediction
    const singlePred = gbdt.predictRow({ f1: 4.5 });
    expect(singlePred).toBeGreaterThan(12);
    expect(singlePred).toBeLessThan(16);
  });
});

describe('Bivariate Poisson Distribution Mathematics', () => {
  describe('bivariatePoissonPMF', () => {
    it('should calculate correct joint probability mass function values', () => {
      // With covariance = 0, bivariate Poisson is just product of independent Poissons.
      // P(X=1, Y=1) = P(X=1) * P(Y=1)
      // For lambda1 = 1.5, P(X=1) = 1.5 * e^-1.5 = 0.3347
      // For lambda2 = 2.0, P(Y=1) = 2.0 * e^-2.0 = 0.2707
      // Product = 0.3347 * 0.2707 = 0.09058
      const pInd = bivariatePoissonPMF(1, 1, 1.5, 2.0, 0.0);
      expect(pInd).toBeCloseTo(0.09058, 4);

      // With positive covariance (e.g. 0.25)
      const pCov = bivariatePoissonPMF(1, 1, 1.5, 2.0, 0.25);
      expect(pCov).toBeDefined();
      expect(pCov).not.toBe(pInd);
    });
  });

  describe('bivariatePoissonUnder & Over', () => {
    it('should correctly calculate cumulative probability lines', () => {
      const meanHome = 1.2;
      const meanAway = 1.5;
      const cov = 0.1;
      const line = 2.5;

      const under = bivariatePoissonUnder(meanHome, meanAway, cov, line);
      const over = bivariatePoissonOver(meanHome, meanAway, cov, line);

      // Cumulative under + cumulative over must sum up to exactly 1.0
      expect(under + over).toBeCloseTo(1.0, 6);
      expect(under).toBeGreaterThan(0.1);
      expect(under).toBeLessThan(0.9);
    });
  });
});
