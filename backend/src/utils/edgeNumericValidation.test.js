import { describe, it, expect } from 'vitest';
import { isBoundedInteger } from './edgeNumericValidation.js';

describe('Edge mathematical integer counts', () => {
  it.each(['117', '117.0', '117e0', '1.17e2'])('accepts equivalent JSON notation %s', literal => {
    expect(isBoundedInteger(JSON.parse(literal), 0, 1000)).toBe(true);
  });
  it.each([0, 1000])('accepts inclusive boundary %s', value => {
    expect(isBoundedInteger(value, 0, 1000)).toBe(true);
  });
  it.each([true, false, null, undefined, '117', -1, 117.5, 1001, NaN, Infinity, -Infinity,
    Number.MAX_SAFE_INTEGER + 1])('rejects invalid count %s', value => {
    expect(isBoundedInteger(value, 0, 1000)).toBe(false);
  });
  it('preserves the safe-integer boundary', () => {
    expect(isBoundedInteger(Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(isBoundedInteger(Number.MAX_SAFE_INTEGER + 1, 0, Infinity)).toBe(false);
  });
});
