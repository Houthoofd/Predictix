// Checks metadata consistency, not the authenticity of training evidence.
import { isBoundedInteger } from './edgeNumericValidation.js';
export function validateAdmissionMetadata(a, requirePolicy = false) {
  try {
    const require = (condition, message) => { if (!condition) throw new Error(message); };
    const number = n => {
      require(typeof n === 'number' && Number.isFinite(n) && n >= 0, 'Invalid admission number');
      return n;
    };
    const count = (n, minimum) => require(isBoundedInteger(n, minimum, 1000000),
      'Admission count must be an integer within bounds');
    require(!Object.hasOwn(a, 'admission_failure'), 'Candidate declares admission failure');
    if (Object.hasOwn(a, 'temporal_stability') || requirePolicy) {
      const s = a.temporal_stability, folds = a.walk_forward_pretest;
      const gain = number(a.training_policy.minimum_relative_improvement);
      require(gain < 1 && Array.isArray(folds), 'Invalid temporal stability inputs');
      let passing = 0, noRegression = true;
      for (const fold of folds) {
        const error = number(fold.metrics.mae);
        const reference = Math.min(...['mean', 'median', 'team_rolling'].map(n => number(fold.metrics.references[n].mae)));
        noRegression &&= error <= reference;
        passing += reference > 0 && (reference - error) / reference >= gain ? 1 : 0;
      }
      const expected = { passed: folds.length === 3 && noRegression && passing >= 2,
        folds: folds.length, required_folds: 3, passing_folds: passing, required_passing_folds: 2,
        no_fold_worse_than_strongest_reference: noRegression, minimum_relative_improvement: gain };
      require(s && s.passed === true && Object.keys(s).length === Object.keys(expected).length &&
        Object.entries(expected).every(([key, value]) => s[key] === value), 'Contradictory temporal stability');
    }
    if (!requirePolicy) return { valid: true };
    require(a.admission_policy === 'predictix-edge-admission/2', 'Re-evaluate legacy candidate before promotion');
    const p = a.training_policy, split = a.split, test = a.test;
    const gain = number(p.minimum_relative_improvement);
    count(p.minimum_samples, 50); count(a.samples, p.minimum_samples);
    count(p.minimum_test_days, 10); count(p.minimum_test_samples, 20);
    require(split.strategy === 'chronological_whole_day_60_20_20', 'Unsupported admission split');
    count(split.train_samples, 20); count(split.validation_samples, 5); count(split.test_samples, p.minimum_test_samples);
    require(split.train_samples + split.validation_samples + split.test_samples === a.samples &&
      test.samples === split.test_samples, 'Admission sample counts disagree');
    const day = value => {
      require(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Invalid temporal evidence date');
      const [year, month, date] = value.split('-').map(Number);
      require(year >= 1900 && year <= 2200 && month >= 1 && month <= 12 && date >= 1 && date <= 31,
        'Invalid temporal evidence date');
      const utc = new Date(Date.UTC(year, month - 1, date));
      require(utc.toISOString().slice(0, 10) === value, 'Invalid calendar date');
      return utc.getTime() / 86400000;
    };
    const period = (v, samples, days) => {
      count(v.samples, samples); count(v.days, days);
      const first = day(v.first_date), last = day(v.last_date);
      require(first <= last && v.days <= v.samples && v.days <= last - first + 1 &&
        (first === last ? v.days === 1 : v.days >= 2), 'Impossible temporal evidence period');
    };
    const training = split.partitions.train, validation = split.partitions.validation, testing = split.partitions.test;
    period(training, 20, 1); period(validation, 5, 1); period(testing, p.minimum_test_samples, p.minimum_test_days);
    count(split.days, 50);
    const totalDays = split.days;
    require(training.samples === split.train_samples && validation.samples === split.validation_samples &&
      testing.samples === split.test_samples && training.last_date < validation.first_date &&
      validation.last_date < testing.first_date, 'Overlapping or inconsistent chronological partitions');
    require(training.days === Math.floor(totalDays * 6 / 10) &&
      validation.days === Math.floor(totalDays * 8 / 10) - training.days &&
      testing.days === totalDays - Math.floor(totalDays * 8 / 10), 'Invalid 60/20/20 day split');
    require(Array.isArray(a.walk_forward_pretest) && a.walk_forward_pretest.length === 3, 'Three evidence folds required');
    for (const [i, fold] of a.walk_forward_pretest.entries()) {
      const prefix = fold.training_period, inner = fold.selection_training_period;
      const selection = fold.selection_validation_period, evaluation = fold.evaluation_period;
      period(prefix, 13, 2); period(inner, 10, 1); period(selection, 3, 1); period(evaluation, 1, 1);
      const percent = 40 + 10 * i, prefixDays = Math.floor(totalDays * percent / 100);
      const innerDays = Math.floor(totalDays * percent * 8 / 1000);
      require(prefix.first_date === training.first_date && inner.first_date === prefix.first_date &&
        inner.last_date < selection.first_date && selection.last_date === prefix.last_date &&
        prefix.last_date < evaluation.first_date && evaluation.last_date < testing.first_date,
      'Fold evidence violates pretest chronology');
      require(prefix.samples === inner.samples + selection.samples && prefix.days === prefixDays &&
        inner.days === innerDays && selection.days === prefixDays - innerDays &&
        evaluation.days === Math.floor(totalDays * (percent + 10) / 100) - prefixDays &&
        prefix.samples + evaluation.samples <= split.train_samples + split.validation_samples,
      'Invalid fold evidence counts');
      require(['samples', 'first_date', 'last_date'].every(k => fold.metrics[k] === evaluation[k]),
        'Fold metrics disagree with evaluation period');
      if (i > 0) {
        const prior = a.walk_forward_pretest[i - 1];
        require(prior.evaluation_period.last_date === prefix.last_date &&
          prefix.samples === prior.training_period.samples + prior.evaluation_period.samples,
        'Inconsistent pretest progression');
      }
      if (i === 2) require(['samples', 'days', 'first_date', 'last_date'].every(k => prefix[k] === training[k]),
        'Final pretest prefix disagrees with training partition');
    }
    require(['samples', 'first_date', 'last_date'].every(k => test[k] === testing[k]) &&
      testing.last_date <= a.history.last_match_date, 'Test metrics disagree with temporal evidence');
    let strongest = 'mean', reference = number(test.references.mean.mae);
    for (const name of ['median', 'team_rolling']) {
      const value = number(test.references[name].mae);
      if (value < reference) { reference = value; strongest = name; }
    }
    const relative = reference > 0 ? (reference - number(test.mae)) / reference : -1;
    require(reference > 0 && relative >= gain, 'Required test gain not established');
    const c = a.release_comparison, u = a.test_uncertainty;
    require(c.reference === strongest && number(c.reference_mae) === reference &&
      Math.abs(number(c.relative_improvement) - relative) <= 1e-12, 'Contradictory release comparison');
    require(u.method === 'paired_whole_day_bootstrap' && u.reference === strongest, 'Invalid test uncertainty');
    count(u.days, p.minimum_test_days); count(u.resamples, 1000);
    require(u.days === testing.days, 'Bootstrap days disagree with test evidence');
    const bounds = u.mae_improvement_95pct;
    require(Array.isArray(bounds) && bounds.length === 2 && number(bounds[0]) > 0 &&
      number(bounds[1]) >= bounds[0], 'Positive ordered confidence bounds required');
    return { valid: true };
  } catch (error) { return { valid: false, reason: error.message }; }
}
