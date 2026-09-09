import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, buildPaginatedResponse } from '../utils/pagination.js';
import { queryString } from '../utils/queryParams.js';
import { Pedido } from '../models/Pedido.js';
import { getNextSequence } from '../models/Counter.js';

function calcItems(items) {
  return items.map((i) => ({
    producto: i.producto || null,
    nombre: i.nombre,
    cantidad: i.cantidad,
    precioUnitario: i.precioUnitario,
    subtotal: i.cantidad * i.precioUnitario
  }));
}
const sumTotal = (items) => items.reduce((acc, i) => acc + i.subtotal, 0);

export const listPedidos = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = {};
  const estado = queryString(req, 'filter_estado');
  if (estado) filter.estado = estado;
  const [items, total] = await Promise.all([
    Pedido.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('cliente', 'nombre telefono').lean(),
    Pedido.countDocuments(filter)
  ]);
  return ok(res, buildPaginatedResponse(items, total, { page, limit }));
});

export const getPedido = asyncHandler(async (req, res) => {
  const pedido = await Pedido.findById(req.params.id)
    .populate('cliente', 'nombre telefono email')
    .populate('venta');
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'NOT_FOUND');
  return ok(res, pedido);
});

export const createPedido = asyncHandler(async (req, res) => {
  const items = calcItems(req.validated.items);
  const numero = await getNextSequence('pedido');
  const pedido = await Pedido.create({
    ...req.validated,
    items,
    total: sumTotal(items),
    numero,
    usuario: req.user?.id || null
  });
  return ok(res, pedido, 201);
});

export const updatePedido = asyncHandler(async (req, res) => {
  const update = { ...req.validated };
  if (update.items) {
    update.items = calcItems(update.items);
    update.total = sumTotal(update.items);
  }
  const pedido = await Pedido.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'NOT_FOUND');
  return ok(res, pedido);
});

export const cambiarEstado = asyncHandler(async (req, res) => {
  const pedido = await Pedido.findByIdAndUpdate(req.params.id, { estado: req.validated.estado }, { new: true });
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'NOT_FOUND');
  return ok(res, pedido);
});

export const deletePedido = asyncHandler(async (req, res) => {
  const pedido = await Pedido.findByIdAndDelete(req.params.id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'NOT_FOUND');
  return ok(res, { id: pedido._id, deleted: true });
});
