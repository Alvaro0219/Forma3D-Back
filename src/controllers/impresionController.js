import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, buildPaginatedResponse } from '../utils/pagination.js';
import { queryString } from '../utils/queryParams.js';
import { Impresion } from '../models/Impresion.js';
import { getNextSequence } from '../models/Counter.js';
import { finalizarImpresion } from '../services/impresionService.js';

const POPULATE = [
  { path: 'producto', select: 'nombre sku' },
  { path: 'impresora', select: 'modelo' },
  { path: 'filamentos.filamento', select: 'identificadorBobina marca tipo color pesoDisponible pesoOriginal precioCompra' }
];

export const listImpresiones = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = {};
  const estado = queryString(req, 'filter_estado');
  if (estado) filter.estado = estado;
  const [items, total] = await Promise.all([
    Impresion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(POPULATE).lean(),
    Impresion.countDocuments(filter)
  ]);
  return ok(res, buildPaginatedResponse(items, total, { page, limit }));
});

export const getImpresion = asyncHandler(async (req, res) => {
  const imp = await Impresion.findById(req.params.id).populate(POPULATE);
  if (!imp) throw new AppError('Impresion no encontrada', 404, 'NOT_FOUND');
  return ok(res, imp);
});

const withPopulate = (id) => Impresion.findById(id).populate(POPULATE);

export const createImpresion = asyncHandler(async (req, res) => {
  const { estado, ...resto } = req.validated;
  const numero = await getNextSequence('impresion');

  // Si se crea directamente como terminada, se persiste en otro estado y finaliza
  // el service (que valida bobinas y descuenta stock de forma atomica).
  const imp = await Impresion.create({
    ...resto,
    estado: estado === 'terminada' ? 'imprimiendo' : (estado || 'pendiente'),
    numero,
    usuario: req.user?.id || null
  });

  if (estado === 'terminada') {
    await finalizarImpresion(imp._id, req.user?.id || null);
  }
  return ok(res, await withPopulate(imp._id), 201);
});

export const updateImpresion = asyncHandler(async (req, res) => {
  const imp = await Impresion.findById(req.params.id);
  if (!imp) throw new AppError('Impresion no encontrada', 404, 'NOT_FOUND');

  const { estado, ...resto } = req.validated;
  Object.assign(imp, resto);
  // El paso a "terminada" lo hace finalizarImpresion: si algo falla (sin bobinas,
  // stock insuficiente) el estado NO queda cambiado y no se descuenta nada.
  if (estado && estado !== 'terminada') imp.estado = estado;
  await imp.save();

  if (estado === 'terminada') {
    await finalizarImpresion(imp._id, req.user?.id || null);
  }
  return ok(res, await withPopulate(imp._id));
});

export const deleteImpresion = asyncHandler(async (req, res) => {
  const imp = await Impresion.findByIdAndDelete(req.params.id);
  if (!imp) throw new AppError('Impresion no encontrada', 404, 'NOT_FOUND');
  return ok(res, { id: imp._id, deleted: true });
});

/** Endpoint explicito para finalizar/registrar consumo (mismo service que el cambio de estado). */
export const registrarConsumo = asyncHandler(async (req, res) => {
  await finalizarImpresion(req.params.id, req.user?.id || null);
  return ok(res, await withPopulate(req.params.id));
});
