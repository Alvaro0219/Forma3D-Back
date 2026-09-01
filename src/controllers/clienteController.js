import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { crudController } from '../utils/crudController.js';
import { Cliente } from '../models/Cliente.js';
import { Pedido } from '../models/Pedido.js';
import { Venta } from '../models/Venta.js';

const base = crudController(Cliente, { searchFields: ['nombre', 'telefono', 'email'] });

export const listClientes = base.list;
export const createCliente = base.create;
export const updateCliente = base.update;
export const deleteCliente = base.remove;

/** Ficha del cliente con historial de pedidos, ventas y estadisticas. */
export const getCliente = asyncHandler(async (req, res) => {
  const cliente = await Cliente.findById(req.params.id);
  if (!cliente) throw new AppError('Cliente no encontrado', 404, 'NOT_FOUND');

  const [pedidos, ventas, statsAgg] = await Promise.all([
    Pedido.find({ cliente: cliente._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Venta.find({ cliente: cliente._id, estado: 'completada' }).sort({ fecha: -1 }).limit(50).lean(),
    Venta.aggregate([
      { $match: { cliente: cliente._id, estado: 'completada' } },
      { $group: { _id: null, totalComprado: { $sum: '$total' }, cantidad: { $sum: 1 }, ultima: { $max: '$fecha' } } }
    ])
  ]);

  const stats = statsAgg[0] || { totalComprado: 0, cantidad: 0, ultima: null };

  return ok(res, {
    cliente,
    historial: { pedidos, ventas },
    estadisticas: {
      totalComprado: stats.totalComprado,
      cantidadVentas: stats.cantidad,
      cantidadPedidos: pedidos.length,
      ultimaCompra: stats.ultima
    }
  });
});
