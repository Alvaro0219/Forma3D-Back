import { MovimientoStock } from '../models/MovimientoStock.js';
import { Insumo } from '../models/Insumo.js';
import { Filamento } from '../models/Filamento.js';
import { Producto } from '../models/Producto.js';

const MODEL_BY_TIPO = {
  Insumo,
  Filamento,
  Producto
};

/**
 * Registra un movimiento de stock y ajusta el stock del articulo.
 * cantidad con signo: positiva ingresa, negativa egresa.
 * Para Filamento el "stock" es pesoDisponible (gramos).
 */
export async function registrarMovimiento({
  articuloTipo,
  articuloId,
  articuloNombre = '',
  tipo,
  cantidad,
  unidad = 'unidad',
  referencia = '',
  refModel = null,
  refId = null,
  usuario = null,
  session = null
}) {
  const Model = MODEL_BY_TIPO[articuloTipo];
  if (!Model) throw new Error(`Tipo de articulo desconocido: ${articuloTipo}`);

  const campoStock = articuloTipo === 'Filamento' ? 'pesoDisponible' : 'stock';
  const opts = session ? { session } : {};

  await Model.updateOne(
    { _id: articuloId },
    { $inc: { [campoStock]: cantidad } },
    opts
  );

  const [mov] = await MovimientoStock.create([{
    articuloTipo,
    articuloId,
    articuloNombre,
    tipo,
    cantidad,
    unidad,
    referencia,
    refModel,
    refId,
    usuario
  }], opts);

  return mov;
}
