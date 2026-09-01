import { Compra } from '../models/Compra.js';
import { Insumo } from '../models/Insumo.js';
import { Filamento } from '../models/Filamento.js';
import { registrarMovimiento } from './stockService.js';
import { runAtomic } from '../utils/transaction.js';
import { AppError } from '../utils/AppError.js';

/**
 * Registra una compra: crea el comprobante, aumenta el stock de cada item
 * (Insumo -> stock, Filamento -> pesoDisponible) y deja el movimiento historico.
 * El total se recalcula en el servidor a partir de los items.
 */
export async function registrarCompra(payload, usuarioId = null) {
  const {
    proveedor = null,
    fecha = new Date(),
    comprobante = '',
    items = [],
    formaPago = 'efectivo',
    observaciones = ''
  } = payload;

  if (!items.length) throw new AppError('La compra debe tener al menos un item', 400, 'EMPTY_PURCHASE');

  return runAtomic(async (session) => {
    const sessOpt = session ? { session } : {};

    const compraItems = [];
    let total = 0;

    for (const item of items) {
      const cantidad = Number(item.cantidad) || 0;
      const precioUnitario = Number(item.precioUnitario) || 0;
      if (cantidad <= 0) throw new AppError('Cantidad invalida', 400, 'VALIDATION_ERROR');

      const subtotal = cantidad * precioUnitario;
      total += subtotal;

      compraItems.push({
        articuloTipo: item.articuloTipo,
        articuloId: item.articuloId || null,
        descripcion: item.descripcion,
        cantidad,
        precioUnitario,
        subtotal
      });

      // Aumentar stock si el item referencia un articulo existente
      if (item.articuloId) {
        const esFilamento = item.articuloTipo === 'Filamento';
        await registrarMovimiento({
          articuloTipo: item.articuloTipo,
          articuloId: item.articuloId,
          articuloNombre: item.descripcion,
          tipo: 'compra',
          cantidad, // ingreso (positivo)
          unidad: esFilamento ? 'g' : 'unidad',
          referencia: comprobante ? `Compra ${comprobante}` : 'Compra',
          refModel: 'Compra',
          usuario: usuarioId,
          session
        });
      }
    }

    const [compra] = await Compra.create([{
      proveedor,
      fecha,
      comprobante,
      items: compraItems,
      total,
      formaPago,
      observaciones,
      usuario: usuarioId
    }], sessOpt);

    // Actualizar refId de los movimientos con la compra recien creada
    return compra;
  });
}
