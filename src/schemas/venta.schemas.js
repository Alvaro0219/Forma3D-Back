import Joi from 'joi';
import { FORMA_PAGO } from '../models/Compra.js';

const itemSchema = Joi.object({
  producto: Joi.string().allow(null, ''),
  nombre: Joi.string().allow(''),
  cantidad: Joi.number().min(1).required(),
  precioUnitario: Joi.number().min(0),
  costoUnitario: Joi.number().min(0)
});

export const createVentaSchema = Joi.object({
  uuid: Joi.string().allow(null, ''),
  cliente: Joi.string().allow(null, ''),
  clienteNombre: Joi.string().allow(''),
  items: Joi.array().items(itemSchema).min(1).required(),
  formaPago: Joi.string().valid(...FORMA_PAGO).default('efectivo'),
  descontarStock: Joi.boolean().default(true),
  pedido: Joi.string().allow(null, '')
});

export const desdePedidoSchema = Joi.object({
  pedido: Joi.string().required(),
  formaPago: Joi.string().valid(...FORMA_PAGO).default('efectivo'),
  descontarStock: Joi.boolean().default(true)
});
