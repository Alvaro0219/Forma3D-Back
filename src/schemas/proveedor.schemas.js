import Joi from 'joi';

export const createProveedorSchema = Joi.object({
  nombre: Joi.string().required(),
  telefono: Joi.string().allow(''),
  email: Joi.string().email({ tlds: { allow: false } }).allow(''),
  notas: Joi.string().allow('')
});

export const updateProveedorSchema = createProveedorSchema.fork(['nombre'], (s) => s.optional()).min(1);
