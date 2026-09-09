import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { crudController } from '../utils/crudController.js';
import { queryString } from '../utils/queryParams.js';
import { Producto } from '../models/Producto.js';
import { generarSku, peekSku } from '../services/skuService.js';

const POPULATE = [{ path: 'insumos.insumo', select: 'nombre unidad stock' }];

const base = crudController(Producto, {
  searchFields: ['nombre', 'sku', 'descripcion'],
  filterFields: ['categoria', 'material'],
  populate: POPULATE
});

export const listProductos = base.list;
export const getProducto = base.get;
export const updateProducto = base.update;
export const deleteProducto = base.remove;

/** Crea el producto generando el SKU a partir de la categoria (ej. Varios -> VAR-001). */
export const createProducto = asyncHandler(async (req, res) => {
  const data = { ...req.validated };
  if (!data.sku) {
    data.sku = await generarSku(data.categoria);
  }
  const producto = await Producto.create(data);
  return ok(res, await Producto.findById(producto._id).populate(POPULATE), 201);
});

/** Previsualiza el proximo SKU de una categoria sin consumir la secuencia. */
export const nextSku = asyncHandler(async (req, res) => {
  const categoria = queryString(req, 'categoria');
  if (!categoria) throw new AppError('Falta la categoria', 400, 'VALIDATION_ERROR');
  return ok(res, { sku: await peekSku(categoria) });
});
