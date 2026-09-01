import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, buildPaginatedResponse } from '../utils/pagination.js';
import { Compra } from '../models/Compra.js';
import { registrarCompra } from '../services/compraService.js';

export const listCompras = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = {};
  if (req.query.desde || req.query.hasta) {
    filter.fecha = {};
    if (req.query.desde) filter.fecha.$gte = new Date(req.query.desde);
    if (req.query.hasta) filter.fecha.$lte = new Date(req.query.hasta);
  }
  const [items, total] = await Promise.all([
    Compra.find(filter).sort({ fecha: -1 }).skip(skip).limit(limit).populate('proveedor', 'nombre').lean(),
    Compra.countDocuments(filter)
  ]);
  return ok(res, buildPaginatedResponse(items, total, { page, limit }));
});

export const getCompra = asyncHandler(async (req, res) => {
  const compra = await Compra.findById(req.params.id).populate('proveedor', 'nombre');
  if (!compra) throw new AppError('Compra no encontrada', 404, 'NOT_FOUND');
  return ok(res, compra);
});

export const createCompra = asyncHandler(async (req, res) => {
  const compra = await registrarCompra(req.validated, req.user?.id || null);
  return ok(res, compra, 201);
});
