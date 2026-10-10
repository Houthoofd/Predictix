import { verifyToken } from '../services/authService.js';

export async function createContext({ req, res }) {
  let user = null;
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    user = verifyToken(token);
  } else if (req.cookies && req.cookies.predictix_session) {
    user = verifyToken(req.cookies.predictix_session);
  }

  // Detect client IP safely behind Cloudflare / reverse proxy
  const clientIp =
    req.headers?.['cf-connecting-ip'] ||
    (req.headers?.['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
    req.ip ||
    req.socket?.remoteAddress ||
    '127.0.0.1';

  return {
    req,
    res,
    user,
    clientIp,
  };
}

