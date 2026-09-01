import Joi from 'joi';

// Se relaja la validacion de TLD para aceptar dominios locales/personalizados (ej. .local).
const emailRule = Joi.string().email({ tlds: { allow: false } });

export const loginSchema = Joi.object({
  email: emailRule.required(),
  password: Joi.string().required()
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

export const createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: emailRule.required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'empleado').default('empleado'),
  permisos: Joi.object({
    verCostos: Joi.boolean().default(false)
  }).default()
});

export const updateUserSchema = Joi.object({
  name: Joi.string(),
  role: Joi.string().valid('admin', 'empleado'),
  isActive: Joi.boolean(),
  permisos: Joi.object({
    verCostos: Joi.boolean()
  })
}).min(1);
