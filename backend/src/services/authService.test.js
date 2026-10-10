import { describe, it, expect, beforeAll } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  ensureUsersTable,
  authenticateUser,
  changeUserPassword,
} from './authService.js';
import { dbGet, dbRun } from '../db/database.js';

describe('Auth Service Security Tests', () => {
  beforeAll(async () => {
    await ensureUsersTable();
  });

  it('should hash and verify passwords using scrypt and constant-time comparison', () => {
    const password = 'SuperSecretPassword2026!';
    const hash = hashPassword(password);
    expect(hash).toContain(':');
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword('WrongPassword', hash)).toBe(false);
  });

  it('should generate and verify JWT HMAC tokens with valid expiration', () => {
    const token = generateToken({ id: 1, email: 'test@predictix.io', role: 'admin' });
    expect(token).toBeTruthy();
    const payload = verifyToken(token);
    expect(payload).toBeTruthy();
    expect(payload.email).toBe('test@predictix.io');
    expect(payload.role).toBe('admin');

    // Tampered token should fail verification
    const tampered = token.slice(0, -5) + 'xxxxx';
    expect(verifyToken(tampered)).toBeNull();
  });

  it('should prevent user enumeration with uniform error message and timing protection', async () => {
    const testIp = '192.168.1.100';
    // Non-existent user
    const resUnknown = await authenticateUser('nonexistent-random-user@test.io', 'somepassword', testIp);
    expect(resUnknown.success).toBe(false);
    expect(resUnknown.error).toBe('Identifiants invalides (email ou mot de passe incorrect)');

    // Existing user with wrong password
    const resExisting = await authenticateUser('admin@predictix.io', 'bad-password-1234', testIp);
    expect(resExisting.success).toBe(false);
    expect(resExisting.error).toBe('Identifiants invalides (email ou mot de passe incorrect)');
  });

  it('should enforce brute force lockout after 5 consecutive failed attempts', async () => {
    const bruteForceIp = '10.0.0.99';
    const bruteForceEmail = 'brute-target@predictix.io';

    // 4 failed attempts should not trigger lockout yet
    for (let i = 0; i < 4; i++) {
      const res = await authenticateUser(bruteForceEmail, `wrong-${i}`, bruteForceIp);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Identifiants invalides (email ou mot de passe incorrect)');
    }

    // 5th failed attempt triggers lockout
    const res5 = await authenticateUser(bruteForceEmail, 'wrong-5', bruteForceIp);
    expect(res5.success).toBe(false);

    // 6th attempt should be blocked by rate limit
    const res6 = await authenticateUser(bruteForceEmail, 'any-password', bruteForceIp);
    expect(res6.success).toBe(false);
    expect(res6.error).toContain('Trop de tentatives de connexion échouées');
    expect(res6.error).toContain('verrouillé');
  });
});
