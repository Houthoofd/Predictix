import { verifyToken } from '../services/authService.js';

export async function createContext({ req, res }) {
  let user = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    user = verifyToken(token);
  }

  return {
    req,
    res,
    user,
  };
}
