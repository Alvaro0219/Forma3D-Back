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
// Las bobinas de filamento son siempre de 1kg: en un item de compra tipo Filamento,
// "cantidad" es la cantidad de BOBINAS (y "precioUnitario" el precio de la bobina
// completa), no gramos sueltos. Se convierte a gramos solo al impactar el stock
// (pesoDisponible), que se mide en gramos.
const GRAMOS_POR_BOBINA = 1000;

export async function registrarCompra(payload, usuarioId = null) {
  const {
    proveedor = null,
    fecha = new Date(),
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
        const gramos = cantidad * GRAMOS_POR_BOBINA;
        await registrarMovimiento({
          articuloTipo: item.articuloTipo,
          articuloId: item.articuloId,
          articuloNombre: item.descripcion,
          tipo: 'compra',
          // Filamento: cantidad de bobinas -> gramos. Insumo: cantidad tal cual.
          cantidad: esFilamento ? gramos : cantidad,
          unidad: esFilamento ? 'g' : 'unidad',
          referencia: 'Compra',
          refModel: 'Compra',
          usuario: usuarioId,
          session
        });

        if (esFilamento) {
          // Un mismo registro de Filamento puede acumular varias bobinas fisicas
          // compradas en distintos momentos (y a distinto precio). "pesoOriginal"
          // deja de ser "el peso de la bobina inicial" y pasa a ser "el total de
          // gramos cargados hasta ahora" -- asi el % disponible nunca pasa de 100%.
          // "precioCompra" se acumula igual, para que costoPorGramo (precioCompra /
          // pesoOriginal) siga siendo un costo promedio correcto y no se diluya.
          await Filamento.updateOne(
            { _id: item.articuloId },
            { $inc: { pesoOriginal: gramos, precioCompra: subtotal } },
            sessOpt
          );
        }
      }
    }

    const [compra] = await Compra.create([{
      proveedor,
      fecha,
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
