/**
 * Lectura segura de query params. Express puede entregar un objeto o un array
 * donde el controller espera un string (`?q[a]=1`, `?q=1&q=2`); usarlo directo
 * en un filtro rompe la consulta o deja elegir el operador al cliente.
 */

/** Devuelve el query param como string ya trimmeado, o '' si no es un escalar. */
export function queryString(req, key) {
  const value = req.query?.[key];
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/**
 * Escapa los metacaracteres de regex para que el texto buscado se compare
 * literalmente. Sin esto, `?q=(a+)+$` se evalua como regex contra cada documento.
 */
export function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Construye un $regex "contiene X", case-insensitive, a prueba de input hostil. */
export function containsRegex(text) {
  return { $regex: escapeRegex(text), $options: 'i' };
}

/** Devuelve el query param como Date valida, o null (evita que una Invalid Date llegue a Mongo). */
export function queryDate(req, key) {
  const raw = queryString(req, key);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}
