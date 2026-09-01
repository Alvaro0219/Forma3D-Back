import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { crudController } from '../utils/crudController.js';
import { Archivo3D } from '../models/Archivo3D.js';

// MODULO SECUNDARIO (esqueleto). Biblioteca de archivos 3D con versionado embebido.

const base = crudController(Archivo3D, {
  searchFields: ['nombre', 'codigo', 'categoria'],
  softDelete: false,
  populate: [{ path: 'cliente', select: 'nombre' }, { path: 'producto', select: 'nombre sku' }]
});

export const listArchivos = base.list;
export const getArchivo = base.get;
export const createArchivo = base.create;
export const updateArchivo = base.update;
export const deleteArchivo = base.remove;

/** Agrega una version nueva y opcionalmente la marca como actual. */
export const addVersion = asyncHandler(async (req, res) => {
  const archivo = await Archivo3D.findById(req.params.id);
  if (!archivo) throw new AppError('Archivo no encontrado', 404, 'NOT_FOUND');

  const numero = (archivo.versiones.reduce((max, v) => Math.max(max, v.numero), 0)) + 1;
  const { esActual, ...rest } = req.validated;

  if (esActual) archivo.versiones.forEach((v) => { v.esActual = false; });
  archivo.versiones.push({ numero, fecha: new Date(), esActual: !!esActual, ...rest });
  await archivo.save();

  return ok(res, archivo, 201);
});

/** Marca una version existente como la actual. */
export const setVersionActual = asyncHandler(async (req, res) => {
  const archivo = await Archivo3D.findById(req.params.id);
  if (!archivo) throw new AppError('Archivo no encontrado', 404, 'NOT_FOUND');

  const numero = parseInt(req.params.numero, 10);
  const version = archivo.versiones.find((v) => v.numero === numero);
  if (!version) throw new AppError('Version no encontrada', 404, 'NOT_FOUND');

  archivo.versiones.forEach((v) => { v.esActual = v.numero === numero; });
  await archivo.save();
  return ok(res, archivo);
});
