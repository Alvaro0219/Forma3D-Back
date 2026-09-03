import Joi from 'joi';

export const updateConfigSchema = Joi.object({
  nombreNegocio: Joi.string(),
  telefono: Joi.string().allow(''),
  direccion: Joi.string().allow(''),
  logo: Joi.string().allow(''),
  moneda: Joi.string(),
  precioKwh: Joi.number().min(0),
  costoHoraMaquina: Joi.number().min(0),
  consumoImpresoraDefault: Joi.number().min(0),
  manoObraDefault: Joi.number().min(0),
  costoEmbalajeDefault: Joi.number().min(0),
  otrosCostosDefault: Joi.number().min(0),
  // Markup sobre el costo (no margen bruto sobre precio): sin techo matematico en 100%.
  margenDefault: Joi.number().min(0),
  categorias: Joi.array().items(Joi.string()),
  unidades: Joi.array().items(Joi.string()),
  whatsappNumero: Joi.string().allow(''),
  plantillaMensaje: Joi.string().allow(''),
  mostrarDisponibilidad: Joi.boolean(),
  umbralPocasUnidades: Joi.number().min(0)
}).min(1);

export const createImpresoraSchema = Joi.object({
  modelo: Joi.string().required(),
  consumo: Joi.number().min(0).default(0.15),
  costoHora: Joi.number().min(0).default(0),
  estado: Joi.string().valid('activa', 'inactiva', 'mantenimiento').default('activa'),
  horasAcumuladas: Joi.number().min(0).default(0),
  ultimoMantenimiento: Joi.date().allow(null),
  notasMantenimiento: Joi.string().allow('')
});

export const updateImpresoraSchema = createImpresoraSchema.fork(['modelo'], (s) => s.optional()).min(1);
