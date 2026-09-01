import { Venta } from '../models/Venta.js';
import { Pedido } from '../models/Pedido.js';
import { Producto } from '../models/Producto.js';
import { getNextSequence } from '../models/Counter.js';
import { registrarMovimiento } from './stockService.js';
import { calcularRentabilidad } from './costoService.js';
import { runAtomic } from '../utils/transaction.js';
import { AppError } from '../utils/AppError.js';

/**
 * Registra una venta:
 *  - recalcula precios/costos desde la base (fuente de verdad, nunca confia en el cliente)
 *  - descuenta stock de cada producto (si descontarStock)
 *  - toma el costo de fabricacion de cada producto y calcula ganancia/margen
 *  - vincula al pedido si viene de uno (y lo marca Entregado)
 *  - idempotencia opcional por uuid
 */
export async function registrarVenta(payload, usuarioId = null) {
  const {
    uuid = null,
    cliente = null,
    clienteNombre = '',
    items = [],
    formaPago = 'efectivo',
    descontarStock = true,
    pedido = null
  } = payload;

  if (uuid) {
    const existing = await Venta.findOne({ uuid });
    if (existing) return existing;
  }

  if (!items.length) throw new AppError('La venta debe tener al menos un item', 400, 'EMPTY_SALE');

  return runAtomic(async (session) => {
    const sessOpt = session ? { session } : {};

    // 1. Cargar productos y recalcular en el servidor
    const productoIds = items.map((i) => i.producto).filter(Boolean);
    const productos = await Producto.find({ _id: { $in: productoIds } })
      .populate('insumos.insumo', 'nombre unidad')
      .session(session || null);
    const byId = new Map(productos.map((p) => [p._id.toString(), p]));

    const ventaItems = [];
    let total = 0;
    let costoReal = 0;

    for (const item of items) {
      const prod = item.producto ? byId.get(String(item.producto)) : null;
      if (item.producto && !prod) {
        throw new AppError(`Producto no encontrado: ${item.producto}`, 404, 'NOT_FOUND');
      }

      const cantidad = Number(item.cantidad) || 0;
      if (cantidad <= 0) throw new AppError('Cantidad invalida', 400, 'VALIDATION_ERROR');

      // Precio: se toma del producto (fuente de verdad); permite override manual si no hay producto.
      const precioUnitario = prod ? prod.precioVenta : Number(item.precioUnitario) || 0;
      const costoUnitario = prod ? (prod.costoFabricacion || 0) : Number(item.costoUnitario) || 0;
      const nombre = prod ? prod.nombre : (item.nombre || 'Item manual');
      const subtotal = precioUnitario * cantidad;

      total += subtotal;
      costoReal += costoUnitario * cantidad;

      ventaItems.push({
        producto: prod?._id || null,
        nombre,
        cantidad,
        precioUnitario,
        costoUnitario,
        subtotal
      });

      // 2. Descontar stock
      if (descontarStock && prod) {
        await registrarMovimiento({
          articuloTipo: 'Producto',
          articuloId: prod._id,
          articuloNombre: prod.nombre,
          tipo: 'venta',
          cantidad: -cantidad,
          unidad: 'unidad',
          referencia: 'Venta',
          refModel: 'Venta',
          usuario: usuarioId,
          session
        });

        // 3. Descontar los insumos/accesorios que lleva el producto
        for (const comp of prod.insumos || []) {
          const insumoDoc = comp.insumo;
          if (!insumoDoc) continue;
          const consumo = (Number(comp.cantidad) || 0) * cantidad;
          if (consumo <= 0) continue;
          await registrarMovimiento({
            articuloTipo: 'Insumo',
            articuloId: insumoDoc._id || insumoDoc,
            articuloNombre: insumoDoc.nombre || '',
            tipo: 'venta',
            cantidad: -consumo,
            unidad: insumoDoc.unidad || 'unidad',
            referencia: `Venta (insumo de ${prod.nombre})`,
            refModel: 'Venta',
            usuario: usuarioId,
            session
          });
        }
      }
    }

    const { ganancia, margen } = calcularRentabilidad(total, costoReal);
    const numero = await getNextSequence('venta', session);

    const [venta] = await Venta.create([{
      numero,
      ...(uuid ? { uuid } : {}), // no persistir null: el indice parcial solo cubre strings
      cliente,
      clienteNombre,
      items: ventaItems,
      total,
      costoReal,
      ganancia,
      margen,
      formaPago,
      descontarStock,
      pedido,
      usuario: usuarioId
    }], sessOpt);

    // 3. Vincular con pedido
    if (pedido) {
      await Pedido.updateOne(
        { _id: pedido },
        { $set: { venta: venta._id, estado: 'Entregado' } },
        sessOpt
      );
    }

    return venta;
  });
}
