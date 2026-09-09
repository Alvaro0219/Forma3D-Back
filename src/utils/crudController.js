import { asyncHandler } from './asyncHandler.js';
import { ok } from './response.js';
import { AppError } from './AppError.js';
import { getPagination, buildPaginatedResponse } from './pagination.js';
import { queryString, containsRegex } from './queryParams.js';

/**
 * Genera controllers CRUD estandar para una entidad, respetando las convenciones
 * de la arquitectura (asyncHandler, ok(), paginacion, soft delete). Las entidades
 * con logica propia (productos, ventas, compras, pedidos, filamentos) definen sus
 * propios controllers y no usan esta fabrica.
 *
 * @param {mongoose.Model} Model
 * @param {object} options
 * @param {string[]} options.searchFields  campos para busqueda ?q= (regex)
 * @param {string[]} options.filterFields  campos habilitados para ?filter_campo=valor
 * @param {boolean}  options.softDelete    si true, delete marca isActive=false
 * @param {function} options.populate      array/string para .populate() en list/get
 */
export function crudController(Model, {
  searchFields = [],
  filterFields = [],
  softDelete = true,
  populate = null,
  sort = { createdAt: -1 }
} = {}) {
  const label = Model.modelName;
  const allowedFilters = new Set(filterFields);

  function buildFilter(req) {
    const filter = {};
    if (softDelete && req.query.includeInactive !== 'true') filter.isActive = { $ne: false };

    const q = queryString(req, 'q');
    if (q && searchFields.length) {
      filter.$or = searchFields.map((f) => ({ [f]: containsRegex(q) }));
    }
    // Filtros exactos via ?filter_campo=valor. Solo se aceptan los campos declarados
    // por la entidad y solo con valores escalares: un campo arbitrario dejaria filtrar
    // por datos internos (costos, margenes) desde cualquier sesion autenticada.
    for (const field of allowedFilters) {
      const value = queryString(req, `filter_${field}`);
      if (value) filter[field] = value;
    }
    return filter;
  }

  const list = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const filter = buildFilter(req);
    let query = Model.find(filter).sort(sort).skip(skip).limit(limit);
    if (populate) query = query.populate(populate);
    const [items, total] = await Promise.all([
      query.lean(),
      Model.countDocuments(filter)
    ]);
    return ok(res, buildPaginatedResponse(items, total, { page, limit }));
  });

  const get = asyncHandler(async (req, res) => {
    let query = Model.findById(req.params.id);
    if (populate) query = query.populate(populate);
    const item = await query;
    if (!item) throw new AppError(`${label} no encontrado`, 404, 'NOT_FOUND');
    return ok(res, item);
  });

  const create = asyncHandler(async (req, res) => {
    const item = await Model.create(req.validated);
    return ok(res, item, 201);
  });

  const update = asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndUpdate(req.params.id, req.validated, { new: true, runValidators: true });
    if (!item) throw new AppError(`${label} no encontrado`, 404, 'NOT_FOUND');
    return ok(res, item);
  });

  const remove = asyncHandler(async (req, res) => {
    if (softDelete) {
      const item = await Model.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
      if (!item) throw new AppError(`${label} no encontrado`, 404, 'NOT_FOUND');
      return ok(res, { id: item._id, archived: true });
    }
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) throw new AppError(`${label} no encontrado`, 404, 'NOT_FOUND');
    return ok(res, { id: item._id, deleted: true });
  });

  return { list, get, create, update, remove };
}
