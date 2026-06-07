/**
 * Orders a list of matches in a round-robin fashion by sport
 * to ensure balanced representation when slicing to a limit.
 *
 * @param {Array} matches - The list of matches to reorder.
 * @returns {Array} The reordered list of matches.
 */
export function orderMatchesRoundRobin(matches) {
  if (!Array.isArray(matches) || matches.length <= 1) {
    return matches;
  }

  const groups = {};
  for (const m of matches) {
    const sp = m.sport || 'unknown';
    if (!groups[sp]) {
      groups[sp] = [];
    }
    groups[sp].push(m);
  }

  const sports = Object.keys(groups);
  const ordered = [];
  let index = 0;
  let hasMore = true;

  while (hasMore) {
    hasMore = false;
    for (const sport of sports) {
      if (index < groups[sport].length) {
        ordered.push(groups[sport][index]);
        hasMore = true;
      }
    }
    index++;
  }

  return ordered;
}
