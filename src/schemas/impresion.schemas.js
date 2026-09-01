import Joi from 'joi';
import { ESTADO_IMPRESION } from '../models/Impresion.js';

// Una impresion puede consumir varias bobinas (multicolor), con los gramos de cada una.
const filamentoLineaSchema = Joi.object({
  filamento: Joi.string().required(),
  gramos: Joi.number().min(0).required()
});

export const createImpresionSchema = Joi.object({
  producto: Joi.string().required(),
  impresora: Joi.string().required(),
  filamentos: Joi.array().items(filamentoLineaSchema).default([]),
  cantidadPiezas: Joi.number().min(1).default(1),
  tiempo: Joi.number().min(0).default(0), // minutos reales
  fechaInicio: Joi.date().allow(null),
  fechaFin: Joi.date().allow(null),
  estado: Joi.string().valid(...ESTADO_IMPRESION).default('pendiente'),
  notas: Joi.string().allow('')
});

export const updateImpresionSchema = Joi.object({
  producto: Joi.string(),
  impresora: Joi.string(),
  filamentos: Joi.array().items(filamentoLineaSchema),
  cantidadPiezas: Joi.number().min(1),
  tiempo: Joi.number().min(0),
  fechaInicio: Joi.date().allow(null),
  fechaFin: Joi.date().allow(null),
  estado: Joi.string().valid(...ESTADO_IMPRESION),
  notas: Joi.string().allow('')
}).min(1);
