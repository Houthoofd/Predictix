/**
 * Shared status normalization and import eligibility helper
 * Unified between scraperJob.js, importer.js, and crawlers.
 */

/**
 * Normalizes match status and calculates isLive / isFinished flags.
 * NEVER deduces isFinished = 1 from a score with dash '-' alone.
 * Explicit statuses (Live, Finished, Postponed, Cancelled) take priority over clock time.
 * If status is Planned/Scheduled (or empty), clock indications (e.g. 32', HT, FT) determine current state.
 */
/**
 * Helper to detect active periods across multi-sport competitions
 * (Basketball quarters/overtime, Ice hockey periods, Tennis/Volleyball sets).
 */
export function isMultiSportLivePeriod(str) {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim().toLowerCase();
  if (/\b(1st|2nd|3rd|4th)\s+quarter\b/i.test(s)) return true;
  if (/\b(?:q[1-4])\b/i.test(s) || /^(?:q[1-4])$/i.test(s)) return true;
  if (/\b(ot|overtime|prolongation|prol\.)\b/i.test(s)) return true;
  if (/\b(period\s*[1-3]|period\s*1\/2\/3|1st\s+period|2nd\s+period|3rd\s+period|p[1-3]|période\s*[1-3])\b/i.test(s)) return true;
  if (/\b(set\s*[1-5]|[1-5](st|nd|rd|th)\s+set|sets)\b/i.test(s)) return true;
  return false;
}

/**
 * Normalizes match status and calculates isLive / isFinished flags.
 * NEVER deduces isFinished = 1 from a score with dash '-' alone.
 * Explicit terminal statuses (Cancelled, Postponed) take priority over clock time.
 * Explicit flags (isFinishedFlag, isLiveFlag) and recognized statuses take priority.
 * Multi-sport periods and clock indications resolve in-play vs terminal vs scheduled.
 * Preserves 'Unknown' status when state cannot be determined.
 */
export function normalizeMatchStatus(rawStatusOrMatch, rawTime, score, isFinishedFlag, isLiveFlag) {
  let rawStatus, timeStr, matchScore, finishedFlag, liveFlag;
  if (rawStatusOrMatch && typeof rawStatusOrMatch === 'object') {
    rawStatus = rawStatusOrMatch.status;
    timeStr = rawStatusOrMatch.time;
    matchScore = rawStatusOrMatch.score;
    finishedFlag = rawStatusOrMatch.is_finished ?? rawStatusOrMatch.isFinished;
    liveFlag = rawStatusOrMatch.is_live ?? rawStatusOrMatch.isLive;
  } else {
    rawStatus = rawStatusOrMatch;
    timeStr = rawTime;
    matchScore = score;
    finishedFlag = isFinishedFlag;
    liveFlag = isLiveFlag;
  }

  const sStatus = (rawStatus !== null && rawStatus !== undefined) ? String(rawStatus).trim() : '';
  const lowerStatus = sStatus.toLowerCase();
  const sTime = (timeStr !== null && timeStr !== undefined) ? String(timeStr).trim() : '';
  const lowerTime = sTime.toLowerCase();

  let status = 'Unknown';

  // 1. Priority to explicit terminal / cancellation statuses
  if (
    lowerStatus === 'cancelled' ||
    lowerStatus === 'canceled' ||
    lowerStatus === 'annulé' ||
    lowerStatus === 'annule' ||
    lowerTime.includes('annul') ||
    lowerTime.includes('canc')
  ) {
    status = 'Cancelled';
  } else if (
    lowerStatus === 'postponed' ||
    lowerStatus === 'reporté' ||
    lowerStatus === 'reporte' ||
    lowerTime.includes('report') ||
    lowerTime.includes('postp')
  ) {
    status = 'Postponed';
  } else if (finishedFlag === true || finishedFlag === 1) {
    // 2. Explicit is_finished flag without score / time
    status = 'Finished';
  } else if (liveFlag === true || liveFlag === 1) {
    // 2b. Explicit is_live flag
    status = 'Live';
  } else if (lowerStatus === 'live') {
    status = 'Live';
  } else if (lowerStatus === 'finished') {
    status = 'Finished';
  } else if (lowerStatus === 'unknown') {
    // 3. Preserve explicit Unknown status
    status = 'Unknown';
  } else if (isMultiSportLivePeriod(sTime) || isMultiSportLivePeriod(sStatus)) {
    // 4. Multi-sport periods (Q1-Q4, OT, Period 1-3, Sets) -> Live
    status = 'Live';
  } else if (
    lowerTime === 'live' ||
    lowerTime === 'ht' ||
    sTime.includes("'") ||
    lowerTime.includes('mi-temps') ||
    lowerTime.includes('mt') ||
    lowerTime.includes('prol.')
  ) {
    status = 'Live';
  } else if (
    lowerTime === 'ft' ||
    lowerTime.includes('fin') ||
    lowerTime.includes('terminé') ||
    lowerTime.includes('termine') ||
    lowerTime === 'ter' ||
    lowerTime === 'ter.'
  ) {
    status = 'Finished';
  } else if (
    lowerStatus === 'planned' ||
    lowerStatus === 'scheduled' ||
    lowerStatus === 'programmé' ||
    lowerStatus === 'programme'
  ) {
    status = 'Planned';
  } else if (
    /^\d{1,2}[:h]\d{2}$/.test(lowerTime) ||
    /^\d{1,2}:\d{2}\b/.test(lowerTime)
  ) {
    // Time formatted as scheduled kickoff (e.g. 20:45, 18h00)
    status = 'Planned';
  } else {
    // Preserve Unknown if status cannot be determined (do not blindly force Planned)
    status = 'Unknown';
  }

  // NOTE: Score with dash '-' MUST NEVER deduce isFinished = 1!
  const isLive = status === 'Live' ? 1 : 0;
  const isFinished = status === 'Finished' ? 1 : 0;

  return { status, isLive, isFinished };
}

/**
 * Validates match admissibility for database import.
 * Strictly rejects quality_status === 'failed' and fatal validation errors.
 */
export function isMatchEligibleForImport(match) {
  if (!match) {
    return { eligible: false, reason: 'match is null or undefined' };
  }

  if (match.quality_status === 'failed') {
    return { eligible: false, reason: 'quality_status is failed' };
  }

  const home = typeof match.home_team === 'string' ? match.home_team.trim() : '';
  const away = typeof match.away_team === 'string' ? match.away_team.trim() : '';

  if (!home) {
    return { eligible: false, reason: 'missing home_team' };
  }
  if (!away) {
    return { eligible: false, reason: 'missing away_team' };
  }

  const homeNorm = home.toLowerCase().replace(/[^a-z0-9]/g, '');
  const awayNorm = away.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (homeNorm && awayNorm && homeNorm === awayNorm) {
    return { eligible: false, reason: 'identical home and away teams' };
  }

  return { eligible: true };
}
