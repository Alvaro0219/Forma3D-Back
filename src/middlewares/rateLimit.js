import rateLimit from 'express-rate-limit';

function buildLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message, code: 'RATE_LIMITED' } }
  });
}

export const globalApiLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Demasiadas solicitudes, intenta mas tarde.'
});

export const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Demasiados intentos de autenticacion, intenta mas tarde.'
});

// La tienda publica no tiene auth; limitamos por si acaso.
export const storeLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Demasiadas solicitudes a la tienda, intenta mas tarde.'
});

// Cada presign genera un permiso de escritura temporal en el bucket: mas estricto.
export const uploadLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Demasiadas subidas de imagenes, intenta mas tarde.'
});
