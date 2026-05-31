/**
 * Poisson Distribution Mathematical Helpers
 */

/**
 * Poisson distribution probability of exactly k events with expected lambda
 * P(X = k) = (lambda^k * e^-lambda) / k!
 */
export function poissonProbability(lambda, k) {
  let factorial = 1;
  for (let i = 1; i <= k; i++) factorial *= i;
  return Math.pow(lambda, k) * Math.exp(-lambda) / factorial;
}

/**
 * Cumulative Poisson probability of OVER line (e.g. X > line)
 */
export function poissonOver(lambda, line) {
  const floor = Math.floor(line);
  let sumUnder = 0;
  for (let i = 0; i <= floor; i++) {
    sumUnder += poissonProbability(lambda, i);
  }
  return 1 - sumUnder;
}

/**
 * Cumulative Poisson probability of UNDER line (e.g. X < line)
 */
export function poissonUnder(lambda, line) {
  const floor = Math.ceil(line) - 1;
  let sumUnder = 0;
  for (let i = 0; i <= floor; i++) {
    sumUnder += poissonProbability(lambda, i);
  }
  return sumUnder;
}

/**
 * Binary search to find expected lambda given target cumulative probability P(X <= k) = targetProb
 */
export function findPoissonMean(k, targetProb) {
  let low = 0.1;
  let high = 30.0;
  let mid = 0.0;
  for (let iter = 0; iter < 40; iter++) {
    mid = (low + high) / 2;
    let sumUnder = 0;
    let current = 1;
    for (let i = 0; i <= k; i++) {
      if (i > 0) {
        current = current * mid / i;
      }
      sumUnder += current;
    }
    const prob = sumUnder * Math.exp(-mid);
    if (prob > targetProb) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return mid;
}
