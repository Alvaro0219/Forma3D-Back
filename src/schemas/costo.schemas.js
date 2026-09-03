import Joi from 'joi';

export const calcularCostoSchema = Joi.object({
  precioRollo: Joi.number().min(0).default(0),
  pesoRollo: Joi.number().min(0).default(0),
  gramosUtilizados: Joi.number().min(0).default(0),
  tiempoImpresion: Joi.number().min(0).default(0), // minutos
  consumoElectrico: Joi.number().min(0).default(0), // kW
  precioKwh: Joi.number().min(0).default(0),
  costoHoraMaquina: Joi.number().min(0).default(0),
  manoObra: Joi.number().min(0).default(0),
  embalaje: Joi.number().min(0).default(0),
  otros: Joi.number().min(0).default(0),
  modo: Joi.string().valid('margen', 'ganancia').default('margen'),
  // Markup sobre el costo (no margen bruto sobre precio): sin techo matematico en 100%.
  margenDeseado: Joi.number().min(0).default(0),
  gananciaDeseada: Joi.number().min(0).default(0)
});
