import Joi from 'joi';

const cartItemSchema = Joi.object({
  producto: Joi.string().required(),
  cantidad: Joi.number().integer().min(1).required()
});

export const checkoutSchema = Joi.object({
  items: Joi.array().items(cartItemSchema).min(1).required(),
  nombre: Joi.string().required(),
  telefono: Joi.string().required(),
  notas: Joi.string().allow(''),
  email: Joi.string().email({ tlds: { allow: false } }).allow(''),
  direccion: Joi.string().allow('')
});
