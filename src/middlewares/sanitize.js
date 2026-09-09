/**
 * Bloquea inyeccion de operadores de MongoDB antes de que el input llegue a Mongoose.
 *
 * Express parsea `?campo[$gt]=0` como el objeto `{ campo: { $gt: '0' } }`. Si ese valor
 * termina dentro de un filtro, el cliente elige el operador de la consulta. Con `$where`
 * llega a ejecutar JavaScript del lado del servidor.
 *
 * Se eliminan las claves que empiezan con `$` (operadores), las que contienen `.`
 * (notacion de path) y las de prototype pollution. Se muta en el lugar porque
 * `req.query` es un getter cacheado y reasignarlo no es confiable entre versiones
 * de Express.
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object';
}

function scrub(node, depth = 0) {
  // Los payloads legitimos de esta API no anidan tan profundo; cortar evita
  // que un objeto artificialmente profundo consuma CPU.
  if (depth > 10 || !isPlainObject(node)) return;

  for (const key of Object.keys(node)) {
    if (key.startsWith('$') || key.includes('.') || FORBIDDEN_KEYS.has(key)) {
      delete node[key];
      continue;
    }
    scrub(node[key], depth + 1);
  }
}

export function sanitizeRequest(req, res, next) {
  scrub(req.body);
  scrub(req.query);
  scrub(req.params);
  next();
}
