import Joi from 'joi';
import { ESTADO_PEDIDO } from '../models/Pedido.js';

const itemSchema = Joi.object({
  producto: Joi.string().allow(null, ''),
  nombre: Joi.string().required(),
  cantidad: Joi.number().min(1).required(),
  precioUnitario: Joi.number().min(0).required()
});

export const createPedidoSchema = Joi.object({
  cliente: Joi.string().allow(null, ''),
  clienteNombre: Joi.string().allow(''),
  items: Joi.array().items(itemSchema).min(1).required(),
  notas: Joi.string().allow(''),
  estado: Joi.string().valid(...ESTADO_PEDIDO).default('Pendiente'),
  fechaEntrega: Joi.date().allow(null)
});

export const updatePedidoSchema = Joi.object({
  cliente: Joi.string().allow(null, ''),
  clienteNombre: Joi.string().allow(''),
  items: Joi.array().items(itemSchema).min(1),
  notas: Joi.string().allow(''),
  estado: Joi.string().valid(...ESTADO_PEDIDO),
  fechaEntrega: Joi.date().allow(null)
}).min(1);

export const cambiarEstadoSchema = Joi.object({
  estado: Joi.string().valid(...ESTADO_PEDIDO).required()
});
