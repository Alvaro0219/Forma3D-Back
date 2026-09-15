import { getNextSequence, Counter } from '../models/Counter.js';

/**
 * Generacion automatica del ID de bobina a partir de la marca del filamento.
 * Formato: <PREFIJO><NNN> (ej. "PRINTALOT" -> PAL001, "GRILON" -> GRI001).
 *
 * El prefijo NO se deriva de las primeras letras de la marca (a diferencia del SKU
 * de producto): son abreviaturas propias del negocio, ej. PRINTALOT -> PAL (no PRI).
 * La numeracion es independiente por prefijo y usa la coleccion Counter ($inc atomico),
 * igual que el SKU de producto y la numeracion de pedidos/ventas/impresiones.
 */
const PREFIJO_POR_MARCA = {
  PRINTALOT: 'PAL',
  GRILON: 'GRI',
  GST3D: 'GST',
  HELBOT: 'HEL',
  '3N3': '3N3',
  ELEGI00: 'ELE',
  BAMBULAB: 'BAM',
  FILAR: 'FIL'
};

const FALLBACK_PREFIJO = 'GEN';

const formatId = (prefijo, seq) => `${prefijo}${String(seq).padStart(3, '0')}`;

export function prefijoDeMarca(marca) {
  return PREFIJO_POR_MARCA[marca] || FALLBACK_PREFIJO;
}

/** Reserva y devuelve el proximo ID de bobina para la marca (incrementa el contador). */
export async function generarIdentificadorBobina(marca, session = null) {
  const prefijo = prefijoDeMarca(marca);
  const seq = await getNextSequence(`bobina:${prefijo}`, session);
  return formatId(prefijo, seq);
}

/** Previsualiza el proximo ID sin consumir la secuencia (para mostrarlo en el formulario). */
export async function peekIdentificadorBobina(marca) {
  const prefijo = prefijoDeMarca(marca);
  const counter = await Counter.findById(`bobina:${prefijo}`).lean();
  return formatId(prefijo, (counter?.seq || 0) + 1);
}
