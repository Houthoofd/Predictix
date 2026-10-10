import crypto from 'crypto';
import { dbGet, dbRun, dbQuery } from '../db/database.js';

// Hash password with scrypt + random salt
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password, storedHash) {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (err) {
    return false;
  }
}

// Generate simple HMAC signed token
const SECRET_KEY = process.env.JWT_SECRET || 'predictix-secret-jwt-key-2026';

export function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token) {
  if (!token) return null;
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

// Ensure users table exists and seed default admin user
export async function ensureUsersTable() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existing = await dbGet('SELECT * FROM users WHERE email = ?', ['admin@predictix.io']);
  if (!existing) {
    const defaultPasswordHash = hashPassword('admin123');
    await dbRun(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      ['admin@predictix.io', defaultPasswordHash, 'Administrateur Predictix', 'admin']
    );
    console.log('[Auth] Utilisateur par défaut créé : admin@predictix.io / admin123');
  }
}

export async function authenticateUser(email, password) {
  await ensureUsersTable();
  const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!user) {
    return { success: false, error: 'Identifiants invalides (utilisateur non trouvé)' };
  }

  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    return { success: false, error: 'Mot de passe incorrect' };
  }

  const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  };
}

export async function authenticateOrRegisterGoogleUser({ email, name, googleId }) {
  await ensureUsersTable();
  const cleanEmail = email.toLowerCase().trim();
  let user = await dbGet('SELECT * FROM users WHERE email = ?', [cleanEmail]);

  if (!user) {
    // Automatically register Google user
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const pwdHash = hashPassword(randomPassword);
    const displayName = name || cleanEmail.split('@')[0];
    const insertRes = await dbRun(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [cleanEmail, pwdHash, displayName, 'user']
    );
    user = {
      id: insertRes.id,
      email: cleanEmail,
      name: displayName,
      role: 'user',
    };
    console.log(`[Auth] Nouvel utilisateur Google créé : ${cleanEmail}`);
  }

  const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  };
}

