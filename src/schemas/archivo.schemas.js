import Joi from 'joi';

export const createArchivoSchema = Joi.object({
  nombre: Joi.string().required(),
  codigo: Joi.string().allow(''),
  categoria: Joi.string().allow(''),
  cliente: Joi.string().allow(null, ''),
  producto: Joi.string().allow(null, ''),
  fotos: Joi.array().items(Joi.string()).default([]),
  descripcion: Joi.string().allow(''),
  notas: Joi.string().allow('')
});

export const updateArchivoSchema = createArchivoSchema.fork(['nombre'], (s) => s.optional()).min(1);

export const addVersionSchema = Joi.object({
  cambios: Joi.string().allow(''),
  archivoStl: Joi.string().allow(''),
  archivo3mf: Joi.string().allow(''),
  esActual: Joi.boolean().default(true)
});
