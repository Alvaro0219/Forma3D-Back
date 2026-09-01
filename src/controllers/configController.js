import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { crudController } from '../utils/crudController.js';
import { Configuracion } from '../models/Configuracion.js';
import { Impresora } from '../models/Impresora.js';

export const getConfig = asyncHandler(async (req, res) => {
  const cfg = await Configuracion.getSingleton();
  return ok(res, cfg);
});

export const updateConfig = asyncHandler(async (req, res) => {
  const cfg = await Configuracion.getSingleton();
  Object.assign(cfg, req.validated);
  await cfg.save();
  return ok(res, cfg);
});

// ─── Impresoras (parte de configuracion) ────────────────────
const impresoras = crudController(Impresora, { searchFields: ['modelo'] });
export const listImpresoras = impresoras.list;
export const getImpresora = impresoras.get;
export const createImpresora = impresoras.create;
export const updateImpresora = impresoras.update;
export const deleteImpresora = impresoras.remove;
