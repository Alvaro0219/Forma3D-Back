import Joi from 'joi';

export const createInsumoSchema = Joi.object({
  nombre: Joi.string().required(),
  categoria: Joi.string().allow('').default('general'),
  unidad: Joi.string().allow('').default('unidad'),
  stock: Joi.number().default(0),
  stockMinimo: Joi.number().default(0),
  costo: Joi.number().min(0).default(0),
  proveedor: Joi.string().allow(null, ''),
  notas: Joi.string().allow('')
});

export const updateInsumoSchema = createInsumoSchema.fork(['nombre'], (s) => s.optional()).min(1);

export const ajusteStockSchema = Joi.object({
  cantidad: Joi.number().required(), // con signo
  motivo: Joi.string().allow('')
});
