import Joi from 'joi';
import { TIPO_FILAMENTO, ESTADO_FILAMENTO } from '../models/Filamento.js';

export const createFilamentoSchema = Joi.object({
  identificadorBobina: Joi.string().required(),
  marca: Joi.string().allow(''),
  tipo: Joi.string().valid(...TIPO_FILAMENTO).default('PLA'),
  color: Joi.string().allow(''),
  pesoOriginal: Joi.number().min(1).required(),
  pesoDisponible: Joi.number().min(0),
  precioCompra: Joi.number().min(0).required(),
  fechaCompra: Joi.date(),
  proveedor: Joi.string().allow(null, ''),
  estado: Joi.string().valid(...ESTADO_FILAMENTO).default('nueva'),
  notas: Joi.string().allow('')
});

export const updateFilamentoSchema = createFilamentoSchema
  .fork(['identificadorBobina', 'pesoOriginal', 'precioCompra'], (s) => s.optional())
  .min(1);

export const consumoFilamentoSchema = Joi.object({
  gramos: Joi.number().min(0).required(),
  referencia: Joi.string().allow('')
});
