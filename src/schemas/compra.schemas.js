import Joi from 'joi';
import { FORMA_PAGO } from '../models/Compra.js';

const itemSchema = Joi.object({
  articuloTipo: Joi.string().valid('Insumo', 'Filamento').required(),
  articuloId: Joi.string().allow(null, ''),
  descripcion: Joi.string().required(),
  cantidad: Joi.number().min(0).required(),
  precioUnitario: Joi.number().min(0).required()
});

export const createCompraSchema = Joi.object({
  proveedor: Joi.string().allow(null, ''),
  fecha: Joi.date(),
  comprobante: Joi.string().allow(''),
  items: Joi.array().items(itemSchema).min(1).required(),
  formaPago: Joi.string().valid(...FORMA_PAGO).default('efectivo'),
  observaciones: Joi.string().allow('')
});
