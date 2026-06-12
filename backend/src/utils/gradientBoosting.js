/**
 * Pure JavaScript Decision Tree Regressor for Gradient Boosting.
 * Designed to fit on numerical and categorical object features.
 */
export class DecisionTreeRegressor {
  constructor(options = {}) {
    this.maxDepth = options.maxDepth || 3;
    this.minSamplesSplit = options.minSamplesSplit || 2;
    this.root = null;
  }

  fit(X, y) {
    this.root = this._buildTree(X, y, 0);
  }

  _buildTree(X, y, depth) {
    const numSamples = X.length;
    if (numSamples === 0) return null;

    const mean = y.reduce((a, b) => a + b, 0) / numSamples;

    // Base cases: max depth, too few samples, or zero variance
    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || new Set(y).size === 1) {
      return { value: mean };
    }

    let bestFeature = null;
    let bestThreshold = null;
    let bestVarianceReduction = -1;
    let bestLeftIdx = null;
    let bestRightIdx = null;

    const parentVariance = this._calculateVariance(y);
    const features = Object.keys(X[0]);

    for (const feature of features) {
      const values = X.map(x => x[feature]);
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b);

      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        const leftIdx = [];
        const rightIdx = [];

        for (let j = 0; j < numSamples; j++) {
          if (X[j][feature] <= threshold) {
            leftIdx.push(j);
          } else {
            rightIdx.push(j);
          }
        }

        if (leftIdx.length === 0 || rightIdx.length === 0) continue;

        const leftY = leftIdx.map(idx => y[idx]);
        const rightY = rightIdx.map(idx => y[idx]);

        const leftVariance = this._calculateVariance(leftY);
        const rightVariance = this._calculateVariance(rightY);

        const varianceReduction = parentVariance - 
          ((leftIdx.length / numSamples) * leftVariance + (rightIdx.length / numSamples) * rightVariance);

        if (varianceReduction > bestVarianceReduction) {
          bestVarianceReduction = varianceReduction;
          bestFeature = feature;
          bestThreshold = threshold;
          bestLeftIdx = leftIdx;
          bestRightIdx = rightIdx;
        }
      }
    }

    if (bestVarianceReduction <= 0) {
      return { value: mean };
    }

    const leftX = bestLeftIdx.map(idx => X[idx]);
    const leftY = bestLeftIdx.map(idx => y[idx]);
    const rightX = bestRightIdx.map(idx => X[idx]);
    const rightY = bestRightIdx.map(idx => y[idx]);

    return {
      feature: bestFeature,
      threshold: bestThreshold,
      left: this._buildTree(leftX, leftY, depth + 1),
      right: this._buildTree(rightX, rightY, depth + 1)
    };
  }

  _calculateVariance(y) {
    const n = y.length;
    if (n === 0) return 0;
    const mean = y.reduce((a, b) => a + b, 0) / n;
    return y.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  }

  predictRow(node, x) {
    if (!node) return 0;
    if (node.value !== undefined) return node.value;
    if (x[node.feature] <= node.threshold) {
      return this.predictRow(node.left, x);
    } else {
      return this.predictRow(node.right, x);
    }
  }

  predict(X) {
    return X.map(x => this.predictRow(this.root, x));
  }
}

function predictNodeRecursive(node, x) {
  if (!node) return 0;
  if (node.value !== undefined && node.value !== null) return node.value;
  const val = x[node.feature];
  if (val === undefined || val === null) {
    return 0; // Default fallback for missing features
  }
  if (val <= node.threshold) {
    return predictNodeRecursive(node.left, x);
  }
  return predictNodeRecursive(node.right, x);
}

/**
 * Pure JavaScript Gradient Boosting Regressor (GBDT)
 */
export class GradientBoostingRegressor {
  constructor(options = {}) {
    this.nEstimators = options.nEstimators || 20;
    this.learningRate = options.learningRate || 0.1;
    this.maxDepth = options.maxDepth || 3;
    this.minSamplesSplit = options.minSamplesSplit || 2;
    this.trees = [];
    this.initValue = 0;
  }

  fit(X, y) {
    if (X.length === 0) return;
    this.initValue = y.reduce((a, b) => a + b, 0) / y.length;
    const predictions = new Array(y.length).fill(this.initValue);

    this.trees = [];
    for (let i = 0; i < this.nEstimators; i++) {
      const residuals = y.map((val, idx) => val - predictions[idx]);
      const tree = new DecisionTreeRegressor({ maxDepth: this.maxDepth, minSamplesSplit: this.minSamplesSplit });
      tree.fit(X, residuals);
      this.trees.push(tree);

      const treePredictions = tree.predict(X);
      for (let j = 0; j < y.length; j++) {
        predictions[j] += this.learningRate * treePredictions[j];
      }
    }
  }

  load(serialized) {
    if (!serialized) return;
    this.nEstimators = serialized.n_estimators || this.nEstimators;
    this.learningRate = serialized.learning_rate || this.learningRate;
    this.maxDepth = serialized.max_depth || this.maxDepth;
    this.minSamplesSplit = serialized.min_samples_split || this.minSamplesSplit;
    this.initValue = serialized.init_value !== undefined ? serialized.init_value : this.initValue;
    this.trees = serialized.trees || [];
  }

  predict(X) {
    return X.map(x => this.predictRow(x));
  }

  predictRow(x) {
    let pred = this.initValue;
    for (const tree of this.trees) {
      const root = tree.root !== undefined ? tree.root : tree;
      pred += this.learningRate * predictNodeRecursive(root, x);
    }
    return pred;
  }
}

/* ========================================================================
   BIVARIATE POISSON DISTRIBUTION MATHEMATICS
   ======================================================================== */

// Memoized factorial function to optimize probability calculations
const factCache = [1, 1];
function factorial(n) {
  if (n < 0) return 0;
  if (factCache[n] !== undefined) return factCache[n];
  let res = factCache[factCache.length - 1];
  for (let i = factCache.length; i <= n; i++) {
    res *= i;
    factCache[i] = res;
  }
  return res;
}

// Combinations (n choose k)
function choose(n, k) {
  if (k < 0 || k > n) return 0;
  return factorial(n) / (factorial(k) * factorial(n - k));
}

/**
 * Calculates Bivariate Poisson Probability Mass Function P(X=x, Y=y)
 * @param {number} x - Home team observed count (e.g. corners)
 * @param {number} y - Away team observed count
 * @param {number} meanHome - E(X) parameter
 * @param {number} meanAway - E(Y) parameter
 * @param {number} cov - Covariance parameter (lambda3)
 */
export function bivariatePoissonPMF(x, y, meanHome, meanAway, cov) {
  // Avoid division by zero and limit l3 covariance within bounds
  const l3 = Math.max(0, Math.min(cov, Math.min(meanHome, meanAway) - 0.05));
  const l1 = Math.max(0.05, meanHome - l3);
  const l2 = Math.max(0.05, meanAway - l3);

  const expPart = Math.exp(-(l1 + l2 + l3));
  const term1 = Math.pow(l1, x) / factorial(x);
  const term2 = Math.pow(l2, y) / factorial(y);

  let sum = 0;
  const minXY = Math.min(x, y);
  for (let k = 0; k <= minXY; k++) {
    const c1 = choose(x, k);
    const c2 = choose(y, k);
    const factK = factorial(k);
    const mult = Math.pow(l3 / (l1 * l2), k);
    sum += c1 * c2 * factK * mult;
  }

  return expPart * term1 * term2 * sum;
}

/**
 * Cumulative Bivariate Poisson probability for Under a line: P(X + Y <= line)
 */
export function bivariatePoissonUnder(meanHome, meanAway, cov, line) {
  const maxVal = Math.floor(line);
  let totalProb = 0;
  for (let x = 0; x <= maxVal; x++) {
    for (let y = 0; y <= maxVal - x; y++) {
      totalProb += bivariatePoissonPMF(x, y, meanHome, meanAway, cov);
    }
  }
  return totalProb;
}

/**
 * Bivariate Poisson probability for Over a line: P(X + Y > line)
 */
export function bivariatePoissonOver(meanHome, meanAway, cov, line) {
  return 1 - bivariatePoissonUnder(meanHome, meanAway, cov, line);
}
