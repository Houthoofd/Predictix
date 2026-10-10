import express from 'express';

export function createCollectedMatchesRouter({ baseUrl, readKey, fetchImpl = fetch }) {
  const router = express.Router();
  router.get('/deployment', (req, res) => res.json({ success: true, data: { externalServices: process.env.PREDICTIX_EXTERNAL_SERVICES === '1', collectedMatches: Boolean(baseUrl) } }));
  router.get('/collected-matches', async (req, res) => {
    if (!baseUrl) return res.status(503).json({ success: false, error: { message: 'API sportive non configurée.' } });
    const offset = String(req.query.offset ?? '0');
    if (!/^\d{1,7}$/.test(offset)) return res.status(400).json({ success: false, error: { message: 'Pagination invalide.' } });
    const url = new URL('/v1/matches', baseUrl);
    url.searchParams.set('limit', '25');
    url.searchParams.set('offset', offset);
    for (const key of ['source', 'sport', 'from', 'to']) {
      if (typeof req.query[key] === 'string') url.searchParams.set(key, req.query[key]);
    }
    try {
      const response = await fetchImpl(url, { headers: readKey ? { Authorization: `Bearer ${readKey}` } : {}, signal: AbortSignal.timeout(8000), redirect: 'error' });
      if (!response.ok) throw new Error('upstream');
      const body = await response.json();
      if (!Array.isArray(body.items) || !Number.isInteger(body.total)) throw new Error('contract');
      res.json({ success: true, data: body });
    } catch {
      res.status(502).json({ success: false, error: { message: 'API sportive indisponible ou réponse invalide.' } });
    }
  });
  return router;
}
