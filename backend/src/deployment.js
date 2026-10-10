export function externalOperationGuard(req, res, next) {
  if (process.env.PREDICTIX_EXTERNAL_SERVICES !== '1') return next();
  const path = req.path;
  const disabled = path.startsWith('/predictions/scrape') || path.includes('/crawl-history') ||
    path.startsWith('/predictions/integrity-batch') || path.startsWith('/scraper/crons') ||
    path === '/models/train' || /^\/bets\/(?:[^/]+\/refresh|refresh-all)$/.test(path);
  if (req.method !== 'GET' && disabled) {
    return res.status(409).json({ success: false, error: { message: 'La collecte est gérée par le service permanent ; l’entraînement est effectué sur la machine Edge.' } });
  }
  next();
}
