/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enterprise Authentication & RBAC Middleware for NxtWave AI Audit Platform
 * Provides bcrypt password verification, HTTP-only session cookies,
 * CSRF validation, rate limiting, and server-enforced role checking.
 */

import express from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'auditor' | 'lead' | 'counsellor';
  team: string;
}

export interface RequestWithAuth extends express.Request {
  user?: AuthenticatedUser | null;
  sessionInfo?: { id: string; csrfToken: string } | null;
}

/**
 * Session verification middleware.
 * Attaches authenticated user and sessionInfo to RequestWithAuth.
 */
export function sessionMiddleware(req: RequestWithAuth, _res: express.Response, next: express.NextFunction) {
  const sessionToken = req.cookies?.session_token;
  if (!sessionToken || typeof sessionToken !== 'string') {
    req.user = null;
    req.sessionInfo = null;
    return next();
  }

  try {
    const now = new Date().toISOString();
    const sessionRow: any = db.prepare(`
      SELECT s.id, s.csrf_token, s.expires_at,
             u.id as user_id, u.email, u.display_name, u.role, u.team
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > ?
    `).get(sessionToken, now);

    if (sessionRow) {
      req.user = {
        id: sessionRow.user_id,
        email: sessionRow.email,
        displayName: sessionRow.display_name,
        role: sessionRow.role,
        team: sessionRow.team,
      };
      req.sessionInfo = {
        id: sessionRow.id,
        csrfToken: sessionRow.csrf_token,
      };
    } else {
      req.user = null;
      req.sessionInfo = null;
    }
  } catch {
    req.user = null;
    req.sessionInfo = null;
  }
  next();
}

/**
 * Enforce that the request has an active, authenticated user session.
 */
export function requireAuth(req: RequestWithAuth, res: express.Response, next: express.NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  next();
}

/**
 * Enforce role-based access control.
 * Admins always satisfy any authorized role requirement.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: RequestWithAuth, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role === 'admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ error: 'Access forbidden: Insufficient permissions for this action.' });
  };
}

/**
 * Protect cookie-based state-changing requests against CSRF.
 */
export function requireCsrf(req: RequestWithAuth, res: express.Response, next: express.NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const headerToken = req.headers['x-csrf-token'];
  if (!headerToken || !req.sessionInfo?.csrfToken || headerToken !== req.sessionInfo.csrfToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
  }
  next();
}

/**
 * Rate limiting check for login attempts (max 5 failed attempts per 15 minutes per IP/email)
 */
export function checkLoginRateLimit(ip: string, email: string): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const failedCountObj: any = db.prepare(`
    SELECT COUNT(*) as count 
    FROM login_attempts 
    WHERE (ip = ? OR LOWER(email) = LOWER(?))
      AND success = 0 
      AND attempted_at > ?
  `).get(ip, email.trim(), fifteenMinutesAgo);

  const count = failedCountObj?.count || 0;
  const maxAttempts = 5;

  if (count >= maxAttempts) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: 900 // 15 minutes
    };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - count
  };
}

/**
 * Records a login attempt into the audit log
 */
export function recordLoginAttempt(ip: string, email: string, success: boolean): void {
  try {
    const id = `att-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO login_attempts (id, ip, email, attempted_at, success)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, ip, email.trim().toLowerCase(), now, success ? 1 : 0);
  } catch (err) {
    console.warn('[Auth] Failed to record login attempt:', err);
  }
}
