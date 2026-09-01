import Joi from 'joi';
import { DISPONIBILIDAD } from '../models/Producto.js';

// Insumo/accesorio que consume el producto (se descuenta al vender).
const insumoLineaSchema = Joi.object({
  insumo: Joi.string().required(),
  cantidad: Joi.number().min(0).default(1)
});

export const createProductoSchema = Joi.object({
  nombre: Joi.string().required(),
  // El SKU se genera automaticamente a partir de la categoria (ej. VAR-001).
  // Se acepta uno manual solo si el usuario lo fuerza.
  sku: Joi.string().allow('').optional(),
  categoria: Joi.string().required(), // requerida: define el prefijo del SKU
  descripcion: Joi.string().allow(''),
  material: Joi.string().allow(''),
  colores: Joi.array().items(Joi.string()).default([]),
  fotoPrincipal: Joi.string().allow(''),
  fotos: Joi.array().items(Joi.string()).default([]),
  precioVenta: Joi.number().min(0).required(),
  stock: Joi.number().default(0),
  insumos: Joi.array().items(insumoLineaSchema).default([]),
  pesoInterno: Joi.number().min(0).default(0),
  tiempoImpresion: Joi.number().min(0).default(0),
  costoFabricacion: Joi.number().min(0).default(0),
  ganancia: Joi.number().default(0),
  archivo3D: Joi.string().allow(null, ''),
  visibleEnTienda: Joi.boolean().default(true),
  disponibilidadTienda: Joi.string().valid(...DISPONIBILIDAD).default('auto')
});

export const updateProductoSchema = createProductoSchema
  .fork(['nombre', 'categoria', 'precioVenta'], (s) => s.optional())
  .min(1);

export const nextSkuSchema = Joi.object({
  categoria: Joi.string().required()
});
