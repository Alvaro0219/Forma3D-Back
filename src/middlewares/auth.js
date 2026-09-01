import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { fail } from '../utils/response.js';

/**
 * Verifica el header Authorization: Bearer <token> y setea req.user.
 * Sistema single-tenant (un solo negocio): no hay organizationId.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return fail(res, 'Missing or malformed Authorization header', 401, 'UNAUTHENTICATED');
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, role: payload.role, name: payload.name };
    return next();
  } catch {
    return fail(res, 'Invalid or expired token', 401, 'UNAUTHENTICATED');
  }
}

/**
 * Factory: corta con 403 si el rol del usuario no esta permitido.
 * Roles del dominio: 'admin', 'empleado'.
 */
export function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) return fail(res, 'Authentication required', 401, 'UNAUTHENTICATED');
    if (!allowed.includes(req.user.role)) {
      return fail(res, 'Insufficient permissions', 403, 'FORBIDDEN');
    }
    return next();
  };
}

/** Atajo para endpoints con datos sensibles (costos, configuracion). */
export const requireAdmin = requireRole(['admin']);
