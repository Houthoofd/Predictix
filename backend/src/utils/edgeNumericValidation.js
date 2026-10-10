/** Counts use their decoded mathematical value; booleans and coercions are forbidden. */
export function isBoundedInteger(value, minimum, maximum) {
  return typeof value === 'number' && Number.isSafeInteger(value) &&
    value >= minimum && value <= maximum;
}
