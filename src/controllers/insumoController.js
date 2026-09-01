import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { crudController } from '../utils/crudController.js';
import { Insumo } from '../models/Insumo.js';
import { MovimientoStock } from '../models/MovimientoStock.js';
import { registrarMovimiento } from '../services/stockService.js';

const base = crudController(Insumo, { searchFields: ['nombre', 'categoria'], populate: { path: 'proveedor', select: 'nombre' } });

export const listInsumos = base.list;
export const getInsumo = base.get;
export const createInsumo = base.create;
export const updateInsumo = base.update;
export const deleteInsumo = base.remove;

/** Ajuste manual de stock (correccion), deja movimiento historico. */
export const ajustarStock = asyncHandler(async (req, res) => {
  const insumo = await Insumo.findById(req.params.id);
  if (!insumo) throw new AppError('Insumo no encontrado', 404, 'NOT_FOUND');

  const { cantidad, motivo } = req.validated;
  await registrarMovimiento({
    articuloTipo: 'Insumo',
    articuloId: insumo._id,
    articuloNombre: insumo.nombre,
    tipo: 'ajuste',
    cantidad,
    unidad: insumo.unidad,
    referencia: motivo || 'Ajuste manual',
    usuario: req.user?.id || null
  });

  const actualizado = await Insumo.findById(insumo._id);
  return ok(res, actualizado);
});

/** Historial de movimientos de un insumo. */
export const getMovimientos = asyncHandler(async (req, res) => {
  const movimientos = await MovimientoStock.find({ articuloTipo: 'Insumo', articuloId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return ok(res, movimientos);
});
