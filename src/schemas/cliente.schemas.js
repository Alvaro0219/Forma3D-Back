import Joi from 'joi';

export const createClienteSchema = Joi.object({
  nombre: Joi.string().required(),
  telefono: Joi.string().allow(''),
  email: Joi.string().email({ tlds: { allow: false } }).allow(''),
  direccion: Joi.string().allow(''),
  notas: Joi.string().allow('')
});

export const updateClienteSchema = createClienteSchema.fork(['nombre'], (s) => s.optional()).min(1);
