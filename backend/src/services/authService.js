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

// Dummy hash for constant-time comparison when user does not exist (prevents timing attacks)
const DUMMY_HASH = hashPassword('predictix-dummy-timing-safe-token-2026');

// In-memory brute force / rate limiter
// Tracks failed attempts by IP and email
const failedAttemptsMap = new Map();

function getRateLimitState(key) {
  const record = failedAttemptsMap.get(key);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.blockedUntil && now < record.blockedUntil) {
    const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
    return {
      allowed: false,
      error: `Trop de tentatives de connexion échouées. Compte temporairement verrouillé pour encore ${remainingMinutes} minute(s).`,
    };
  }

  // Window expired (15 minutes of inactivity)
  if (now - record.lastAttempt > 15 * 60 * 1000) {
    failedAttemptsMap.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

function registerFailedAttempt(key) {
  const now = Date.now();
  const record = failedAttemptsMap.get(key) || { count: 0, lastAttempt: now };
  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= 5) {
    record.blockedUntil = now + 15 * 60 * 1000; // 15-minute lockout
  }
  failedAttemptsMap.set(key, record);
}

function clearFailedAttempts(key) {
  failedAttemptsMap.delete(key);
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

// Ensure users table exists and seed/sync default admin user
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

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@predictix.io').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await dbGet('SELECT * FROM users WHERE email = ?', [adminEmail]);
  if (!existing) {
    const defaultPasswordHash = hashPassword(adminPassword);
    await dbRun(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [adminEmail, defaultPasswordHash, 'Administrateur Predictix', 'admin']
    );
    console.log(`[Auth] Utilisateur administrateur configuré : ${adminEmail}`);
  } else if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD !== 'admin123') {
    // If ADMIN_PASSWORD is explicitly set in env, ensure password hash is synced
    const isValid = verifyPassword(adminPassword, existing.password_hash);
    if (!isValid) {
      const newHash = hashPassword(adminPassword);
      await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, existing.id]);
      console.log(`[Auth] Mot de passe administrateur synchronisé depuis l'environnement pour : ${adminEmail}`);
    }
  }
}

export async function authenticateUser(email, password, clientIp = '127.0.0.1') {
  await ensureUsersTable();

  const cleanEmail = (email || '').toLowerCase().trim();
  const ipKey = `ip:${clientIp}`;
  const emailKey = `email:${cleanEmail}`;

  // Check rate limit / lockout
  const ipLimit = getRateLimitState(ipKey);
  if (!ipLimit.allowed) return { success: false, error: ipLimit.error };

  const emailLimit = getRateLimitState(emailKey);
  if (!emailLimit.allowed) return { success: false, error: emailLimit.error };

  const user = await dbGet('SELECT * FROM users WHERE email = ?', [cleanEmail]);

  // Anti-enumeration + timing safe: always verify password against real hash or dummy hash
  const hashToCompare = user ? user.password_hash : DUMMY_HASH;
  const isValid = verifyPassword(password, hashToCompare);

  if (!user || !isValid) {
    registerFailedAttempt(ipKey);
    registerFailedAttempt(emailKey);
    return {
      success: false,
      error: 'Identifiants invalides (email ou mot de passe incorrect)',
    };
  }

  // Clear failed attempts upon success
  clearFailedAttempts(ipKey);
  clearFailedAttempts(emailKey);

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

export async function changeUserPassword(userId, currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Le nouveau mot de passe doit comporter au moins 8 caractères.' };
  }

  const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) {
    return { success: false, error: 'Utilisateur introuvable.' };
  }

  const isValid = verifyPassword(currentPassword, user.password_hash);
  if (!isValid) {
    return { success: false, error: 'Le mot de passe actuel est incorrect.' };
  }

  const newHash = hashPassword(newPassword);
  await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
  return { success: true };
}

export async function authenticateOrRegisterGoogleUser({ email, name, googleId, idToken }) {
  // Reject insecure mock Google auth in production unless real token verification is implemented
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_MOCK_AUTH) {
    return {
      success: false,
      error: 'La connexion Google nécessite une configuration OAuth2 avec jeton valide.',
    };
  }

  await ensureUsersTable();
  const cleanEmail = (email || '').toLowerCase().trim();
  let user = await dbGet('SELECT * FROM users WHERE email = ?', [cleanEmail]);

  if (!user) {
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

