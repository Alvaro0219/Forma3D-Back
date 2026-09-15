import Joi from 'joi';
import { TIPO_FILAMENTO, ESTADO_FILAMENTO, MARCA_FILAMENTO } from '../models/Filamento.js';

export const createFilamentoSchema = Joi.object({
  // Se genera automaticamente a partir de la marca (ver bobinaService.js).
  // Se acepta uno manual solo si el usuario lo fuerza.
  identificadorBobina: Joi.string().allow('').optional(),
  marca: Joi.string().valid(...MARCA_FILAMENTO).required(), // define el prefijo del ID de bobina
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
  .fork(['pesoOriginal', 'precioCompra'], (s) => s.optional())
  // La marca en edicion NO se restringe al catalogo: bobinas cargadas antes de este
  // catalogo pueden tener una marca libre, y editar otro campo no debe rechazarlas.
  .fork(['marca'], () => Joi.string().optional())
  .min(1);

export const consumoFilamentoSchema = Joi.object({
  gramos: Joi.number().min(0).required(),
  referencia: Joi.string().allow('')
});
