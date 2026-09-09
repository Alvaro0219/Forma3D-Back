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

// Minimo de 10 caracteres: la unica barrera contra fuerza bruta offline si alguna
// vez se filtra la coleccion de usuarios es la longitud de la contraseña.
const passwordRule = Joi.string().min(10).messages({
  'string.min': 'La contraseña debe tener al menos 10 caracteres'
});

export const createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: emailRule.required(),
  password: passwordRule.required(),
  role: Joi.string().valid('admin', 'empleado').default('empleado'),
  permisos: Joi.object({
    verCostos: Joi.boolean().default(false)
  }).default()
});

export const updateUserSchema = Joi.object({
  name: Joi.string(),
  role: Joi.string().valid('admin', 'empleado'),
  isActive: Joi.boolean(),
  // Reset de contraseña por un admin (ej. un empleado que perdio la suya).
  password: passwordRule,
  permisos: Joi.object({
    verCostos: Joi.boolean()
  })
}).min(1);

/** Cambio de la propia contraseña: exige la actual para que un token robado no alcance. */
export const changePasswordSchema = Joi.object({
  actual: Joi.string().required(),
  nueva: passwordRule.required()
});
