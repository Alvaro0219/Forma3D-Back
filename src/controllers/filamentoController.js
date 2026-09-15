import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, buildPaginatedResponse } from '../utils/pagination.js';
import { queryString, containsRegex } from '../utils/queryParams.js';
import { Filamento, MARCA_FILAMENTO } from '../models/Filamento.js';
import { MovimientoStock } from '../models/MovimientoStock.js';
import { registrarMovimiento } from '../services/stockService.js';
import { generarIdentificadorBobina, peekIdentificadorBobina } from '../services/bobinaService.js';

export const listFilamentos = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = {};
  const q = queryString(req, 'q');
  if (q) filter.$or = [
    { identificadorBobina: containsRegex(q) },
    { marca: containsRegex(q) },
    { color: containsRegex(q) }
  ];
  const tipo = queryString(req, 'filter_tipo');
  const estado = queryString(req, 'filter_estado');
  if (tipo) filter.tipo = tipo;
  if (estado) filter.estado = estado;

  const [items, total] = await Promise.all([
    Filamento.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('proveedor', 'nombre'),
    Filamento.countDocuments(filter)
  ]);
  return ok(res, buildPaginatedResponse(items, total, { page, limit }));
});

export const getFilamento = asyncHandler(async (req, res) => {
  const filamento = await Filamento.findById(req.params.id).populate('proveedor', 'nombre');
  if (!filamento) throw new AppError('Filamento no encontrado', 404, 'NOT_FOUND');
  return ok(res, filamento);
});

export const createFilamento = asyncHandler(async (req, res) => {
  const data = { ...req.validated };
  // Si no se indica peso disponible, arranca lleno.
  if (data.pesoDisponible == null) data.pesoDisponible = data.pesoOriginal;
  if (!data.identificadorBobina) {
    data.identificadorBobina = await generarIdentificadorBobina(data.marca);
  }
  const filamento = await Filamento.create(data);
  return ok(res, filamento, 201);
});

/** Previsualiza el proximo ID de bobina de una marca sin consumir la secuencia. */
export const nextBobinaId = asyncHandler(async (req, res) => {
  const marca = queryString(req, 'marca');
  if (!marca) throw new AppError('Falta la marca', 400, 'VALIDATION_ERROR');
  if (!MARCA_FILAMENTO.includes(marca)) throw new AppError('Marca invalida', 400, 'VALIDATION_ERROR');
  return ok(res, { identificadorBobina: await peekIdentificadorBobina(marca) });
});

export const updateFilamento = asyncHandler(async (req, res) => {
  const filamento = await Filamento.findByIdAndUpdate(req.params.id, req.validated, { new: true, runValidators: true });
  if (!filamento) throw new AppError('Filamento no encontrado', 404, 'NOT_FOUND');
  return ok(res, filamento);
});

export const deleteFilamento = asyncHandler(async (req, res) => {
  const filamento = await Filamento.findByIdAndDelete(req.params.id);
  if (!filamento) throw new AppError('Filamento no encontrado', 404, 'NOT_FOUND');
  return ok(res, { id: filamento._id, deleted: true });
});

/**
 * Consume gramos de una bobina: descuenta pesoDisponible, registra el movimiento
 * y devuelve el costo de material consumido (gramos x costo por gramo).
 */
export const consumir = asyncHandler(async (req, res) => {
  const filamento = await Filamento.findById(req.params.id);
  if (!filamento) throw new AppError('Filamento no encontrado', 404, 'NOT_FOUND');

  const { gramos, referencia } = req.validated;
  if (gramos > filamento.pesoDisponible) {
    throw new AppError('Gramos solicitados superan el disponible en la bobina', 400, 'INSUFFICIENT_STOCK');
  }

  await registrarMovimiento({
    articuloTipo: 'Filamento',
    articuloId: filamento._id,
    articuloNombre: `${filamento.marca || ''} ${filamento.tipo} ${filamento.color || ''}`.trim(),
    tipo: 'consumo',
    cantidad: -gramos,
    unidad: 'g',
    referencia: referencia || 'Consumo de impresion',
    usuario: req.user?.id || null
  });

  const actualizado = await Filamento.findById(filamento._id);
  // Marcar estado segun disponible
  const nuevoEstado = actualizado.pesoDisponible <= 0 ? 'agotada' : 'en_uso';
  if (actualizado.estado !== nuevoEstado) {
    actualizado.estado = nuevoEstado;
    await actualizado.save();
  }

  const costoConsumido = gramos * actualizado.costoPorGramo;
  return ok(res, { filamento: actualizado, costoConsumido: Math.round(costoConsumido * 100) / 100 });
});

/** Historial de movimientos de una bobina. */
export const getMovimientos = asyncHandler(async (req, res) => {
  const movimientos = await MovimientoStock.find({ articuloTipo: 'Filamento', articuloId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return ok(res, movimientos);
});
