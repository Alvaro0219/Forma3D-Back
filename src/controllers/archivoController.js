import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { crudController } from '../utils/crudController.js';
import { queryString } from '../utils/queryParams.js';
import { Archivo3D } from '../models/Archivo3D.js';
import { getDownloadUrl, keyFromPublicUrl } from '../services/storageService.js';

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

/**
 * URL de descarga de corta duracion que fuerza un nombre de archivo prolijo
 * (nombre del archivo 3D + version), en vez del nombre interno (UUID) con el
 * que se guarda en R2. Sin esto, es lo que hace posible abrirlo con doble clic
 * en Bambu Studio (u otro slicer) sin que el nombre del archivo confunda.
 */
export const descargarVersion = asyncHandler(async (req, res) => {
  const archivo = await Archivo3D.findById(req.params.id);
  if (!archivo) throw new AppError('Archivo no encontrado', 404, 'NOT_FOUND');

  const tipo = queryString(req, 'tipo') === '3mf' ? '3mf' : 'stl';
  const numeroParam = queryString(req, 'version');
  const version = numeroParam
    ? archivo.versiones.find((v) => v.numero === Number(numeroParam))
    : (archivo.versiones.find((v) => v.esActual) || archivo.versiones[archivo.versiones.length - 1]);
  if (!version) throw new AppError('Version no encontrada', 404, 'NOT_FOUND');

  const url = tipo === '3mf' ? version.archivo3mf : version.archivoStl;
  if (!url) throw new AppError(`Esta version no tiene archivo ${tipo.toUpperCase()} cargado`, 404, 'NOT_FOUND');

  const key = keyFromPublicUrl(url);
  if (!key) throw new AppError('No se pudo resolver el archivo en el almacenamiento', 500, 'STORAGE_ERROR');

  const nombreSeguro = (archivo.nombre || 'archivo').trim().replace(/[\\/:*?"<>|]/g, '-');
  const filename = `${nombreSeguro}-v${version.numero}.${tipo}`;

  const downloadUrl = await getDownloadUrl(key, filename);
  return ok(res, { url: downloadUrl, filename });
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
