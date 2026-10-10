import https from 'https';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { isTorActive } from './torSessionManager.js';

export const NetworkMode = {
  DIRECT: 'direct',
  TOR_REQUIRED: 'tor-required',
  TOR_FALLBACK: 'tor-fallback'
};

/**
 * Fetch JSON from SofaScore API.
 * Supports:
 * - Strict network policies: 'direct', 'tor-required', 'tor-fallback'
 * - Tor SOCKS5 proxying via SocksProxyAgent
 * - Explicit failure when Tor is required but unavailable (no direct bypass!)
 * - AbortController with strict timeout to guarantee prompt socket destruction
 * @param {string} url
 * @param {object|string} [options]
 * @returns {Promise<object|null>}
 */
export async function fetchSofaJSON(url, options = {}) {
  let opts = {};
  if (typeof options === 'string') {
    opts = { networkMode: options };
  } else if (typeof options === 'object' && options !== null) {
    opts = { ...options };
  }

  const normalizedMode = (opts.networkMode || process.env.NETWORK_MODE || NetworkMode.DIRECT).toLowerCase().trim();
  const validModes = [NetworkMode.DIRECT, NetworkMode.TOR_REQUIRED, NetworkMode.TOR_FALLBACK];
  if (!validModes.includes(normalizedMode)) {
    throw new Error(`[SofaScore API] Invalid networkMode "${normalizedMode}": must be "direct", "tor-required", or "tor-fallback"`);
  }

  const socksPort = opts.socksPort ? parseInt(opts.socksPort, 10) : 9050;
  const timeoutMs = opts.timeoutMs && opts.timeoutMs > 0 ? opts.timeoutMs : 10000;

  let agent = undefined;
  if (normalizedMode === NetworkMode.TOR_REQUIRED) {
    const torActive = await isTorActive(socksPort);
    if (!torActive) {
      throw new Error(`[SofaScore API] Tor proxy is required on port ${socksPort} (tor-required mode), but is unreachable or inactive. Direct connection is strictly prohibited.`);
    }
    agent = new SocksProxyAgent(`socks5h://127.0.0.1:${socksPort}`);
  } else if (normalizedMode === NetworkMode.TOR_FALLBACK) {
    const torActive = await isTorActive(socksPort);
    if (torActive) {
      agent = new SocksProxyAgent(`socks5h://127.0.0.1:${socksPort}`);
    }
  }

  return new Promise((resolve, reject) => {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`SofaScore API request timed out after ${timeoutMs}ms for URL: ${url}`));
    }, timeoutMs);

    if (opts.signal) {
      if (opts.signal.aborted) {
        controller.abort(opts.signal.reason);
      } else {
        opts.signal.addEventListener('abort', () => controller.abort(opts.signal.reason), { once: true });
      }
    }

    const reqOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      signal: controller.signal,
      ...(agent ? { agent } : {})
    };

    const req = https.get(url, reqOptions, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        clearTimeout(timeoutId);
        return resolve(null);
      }
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        clearTimeout(timeoutId);
        try {
          resolve(JSON.parse(rawData));
        } catch (e) {
          console.error(`[SofaScore API] JSON parse error for URL ${url}:`, e.message);
          resolve(null);
        }
      });
      res.on('error', (e) => {
        clearTimeout(timeoutId);
        console.error(`[SofaScore API] Response stream error for URL ${url}:`, e.message);
        if (normalizedMode === NetworkMode.TOR_REQUIRED) {
          return reject(e);
        }
        resolve(null);
      });
    });

    req.on('error', (e) => {
      clearTimeout(timeoutId);
      if (controller.signal.aborted) {
        console.warn(`[SofaScore API] Request aborted/timed out for URL ${url}:`, e.message);
      } else {
        console.error(`[SofaScore API] HTTP request failed for URL ${url}:`, e.message);
      }
      if (normalizedMode === NetworkMode.TOR_REQUIRED) {
        return reject(e);
      }
      resolve(null);
    });
  });
}

/**
 * Call SofaScore API to retrieve daily events with network policy options.
 * @param {string} dateStr
 * @param {object} [options]
 * @returns {Promise<Array<object>|null>}
 */
export async function fetchSofaEventsForDate(dateStr, options = {}) {
  const url = `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${dateStr}`;
  const data = await fetchSofaJSON(url, options);
  return data ? data.events || null : null;
}

/**
 * Call SofaScore API to retrieve detailed statistics for a specific event.
 * @param {number|string} eventId
 * @param {object} [options]
 * @returns {Promise<Array<object>|null>}
 */
export async function fetchSofaStats(eventId, options = {}) {
  const url = `https://api.sofascore.com/api/v1/event/${eventId}/statistics`;
  const data = await fetchSofaJSON(url, options);
  return data ? data.statistics || null : null;
}

/**
 * Call SofaScore API to retrieve event overview metadata.
 * @param {number|string} eventId
 * @param {object} [options]
 * @returns {Promise<object|null>}
 */
export async function fetchSofaEvent(eventId, options = {}) {
  const url = `https://api.sofascore.com/api/v1/event/${eventId}`;
  const data = await fetchSofaJSON(url, options);
  return data ? data.event || null : null;
}

/**
 * Call SofaScore API to retrieve lineups and missing players.
 * @param {number|string} eventId
 * @param {object} [options]
 * @returns {Promise<object|null>}
 */
export async function fetchSofaLineups(eventId, options = {}) {
  const url = `https://api.sofascore.com/api/v1/event/${eventId}/lineups`;
  return fetchSofaJSON(url, options);
}
