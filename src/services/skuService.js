import { getNextSequence, Counter } from '../models/Counter.js';

/**
 * Generacion automatica de SKU a partir de la categoria del producto.
 * Formato: <PREFIJO>-<NNN>  (ej. "Varios" -> VAR-001, "Llaveros" -> LLA-001)
 *
 * El prefijo son las 3 primeras letras de la categoria, sin acentos y en mayusculas.
 * La numeracion es independiente por prefijo y usa la coleccion Counter ($inc atomico),
 * igual que la numeracion de pedidos/ventas/impresiones.
 */
const FALLBACK_PREFIJO = 'GEN';
const ACENTOS = /[̀-ͯ]/g;

export function buildPrefijo(categoria = '') {
  const norm = String(categoria || '')
    .normalize('NFD').replace(ACENTOS, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  const base = norm.slice(0, 3) || FALLBACK_PREFIJO;
  return base.padEnd(3, 'X');
}

const formatSku = (prefijo, seq) => `${prefijo}-${String(seq).padStart(3, '0')}`;

/** Reserva y devuelve el proximo SKU para la categoria (incrementa el contador). */
export async function generarSku(categoria, session = null) {
  const prefijo = buildPrefijo(categoria);
  const seq = await getNextSequence(`sku:${prefijo}`, session);
  return formatSku(prefijo, seq);
}

/** Previsualiza el proximo SKU sin consumir la secuencia (para mostrarlo en el formulario). */
export async function peekSku(categoria) {
  const prefijo = buildPrefijo(categoria);
  const counter = await Counter.findById(`sku:${prefijo}`).lean();
  return formatSku(prefijo, (counter?.seq || 0) + 1);
}
