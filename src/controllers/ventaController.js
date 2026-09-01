import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, buildPaginatedResponse } from '../utils/pagination.js';
import { Venta } from '../models/Venta.js';
import { Pedido } from '../models/Pedido.js';
import { registrarVenta } from '../services/ventaService.js';

export const listVentas = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = {};
  if (req.query.filter_estado) filter.estado = req.query.filter_estado;
  if (req.query.desde || req.query.hasta) {
    filter.fecha = {};
    if (req.query.desde) filter.fecha.$gte = new Date(req.query.desde);
    if (req.query.hasta) filter.fecha.$lte = new Date(req.query.hasta);
  }
  const [items, total] = await Promise.all([
    Venta.find(filter).sort({ fecha: -1 }).skip(skip).limit(limit).populate('cliente', 'nombre').lean(),
    Venta.countDocuments(filter)
  ]);
  return ok(res, buildPaginatedResponse(items, total, { page, limit }));
});

export const getVenta = asyncHandler(async (req, res) => {
  const venta = await Venta.findById(req.params.id).populate('cliente', 'nombre telefono');
  if (!venta) throw new AppError('Venta no encontrada', 404, 'NOT_FOUND');
  return ok(res, venta);
});

export const createVenta = asyncHandler(async (req, res) => {
  const venta = await registrarVenta(req.validated, req.user?.id || null);
  return ok(res, venta, 201);
});

/** Genera una venta a partir de un pedido existente (usa sus items). */
export const desdePedido = asyncHandler(async (req, res) => {
  const { pedido: pedidoId, formaPago, descontarStock } = req.validated;
  const pedido = await Pedido.findById(pedidoId);
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'NOT_FOUND');
  if (pedido.venta) throw new AppError('El pedido ya tiene una venta asociada', 409, 'CONFLICT');

  const venta = await registrarVenta({
    cliente: pedido.cliente,
    clienteNombre: pedido.clienteNombre,
    items: pedido.items.map((i) => ({
      producto: i.producto,
      nombre: i.nombre,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario
    })),
    formaPago,
    descontarStock,
    pedido: pedido._id
  }, req.user?.id || null);

  return ok(res, venta, 201);
});

/** Anula una venta (marca estado anulada; no revierte stock automaticamente). */
export const anularVenta = asyncHandler(async (req, res) => {
  const venta = await Venta.findByIdAndUpdate(req.params.id, { estado: 'anulada' }, { new: true });
  if (!venta) throw new AppError('Venta no encontrada', 404, 'NOT_FOUND');
  return ok(res, venta);
});
