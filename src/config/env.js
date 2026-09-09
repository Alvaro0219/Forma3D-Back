import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Variable de R2: requerida en produccion, opcional (allow '') en desarrollo.
const r2Var = Joi.string().when('NODE_ENV', {
  is: 'production',
  then: Joi.required(),
  otherwise: Joi.string().allow('').default('')
});

// Los secretos de firma se generan con `npm run gen:secrets`. El minimo de 32 y el
// rechazo de los placeholders evitan que un .env copiado de .env.example arranque
// en produccion con una clave que esta publicada en el repositorio.
const secretVar = Joi.string()
  .min(32)
  .pattern(/change_me/i, { invert: true })
  .required()
  .messages({
    'string.min': '{{#label}} debe tener al menos 32 caracteres (usar: npm run gen:secrets)',
    'string.pattern.invert.base': '{{#label}} sigue teniendo el valor de ejemplo: generar uno real con `npm run gen:secrets`'
  });

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  MONGO_URL: Joi.string().uri().required(),
  JWT_SECRET: secretVar,
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  REFRESH_SECRET: secretVar,
  REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // En produccion es obligatoria: sin ella no hay forma segura de decidir que
  // origenes se aceptan, y el default no puede ser "todos" (ver app.js).
  CORS_ORIGINS: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').default('')
  }),

  BOOTSTRAP_ADMIN_EMAIL: Joi.string().email({ tlds: { allow: false } }).allow('').default(''),
  BOOTSTRAP_ADMIN_PASSWORD: Joi.string().allow('').default(''),
  BOOTSTRAP_ADMIN_NAME: Joi.string().allow('').default('Administrador'),

  // Almacenamiento de imagenes (Cloudflare R2). Requeridas en produccion;
  // opcionales en desarrollo para no bloquear el arranque cuando no se prueban imagenes.
  R2_ACCOUNT_ID: r2Var,
  R2_ACCESS_KEY_ID: r2Var,
  R2_SECRET_ACCESS_KEY: r2Var,
  R2_BUCKET_NAME: r2Var,
  R2_PUBLIC_URL: Joi.string().uri().when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.string().uri().allow('').default('') })
}).unknown(true);

const { error, value: parsed } = schema.validate(process.env, {
  allowUnknown: true,
  stripUnknown: false
});

// Una config invalida nunca debe levantar el server: sin secretos validos no hay
// autenticacion confiable. En desarrollo tambien se corta (antes solo se avisaba,
// y el proceso seguia con los fallbacks inseguros que ya no existen).
if (error) {
  console.error('Configuracion de entorno invalida:');
  for (const detail of error.details) console.error(`  - ${detail.message}`);
  process.exit(1);
}

/**
 * Una connection string sin nombre de base ("...mongodb.net/?retryWrites=true")
 * hace que Mongoose escriba en la base `test` por defecto. En produccion eso
 * significa operar sobre la base equivocada sin ningun aviso.
 */
function assertDatabaseName(mongoUrl) {
  const path = mongoUrl.split('?')[0].split('/')[3] || '';
  if (!path) {
    console.error('MONGO_URL no incluye el nombre de la base de datos.');
    console.error('  Agregalo antes de los parametros, ej: ...mongodb.net/impresion3d_prod?retryWrites=true');
    process.exit(1);
  }
  return path;
}

if (isProduction) assertDatabaseName(parsed.MONGO_URL);

export const env = {
  nodeEnv: parsed.NODE_ENV,
  isProduction,
  port: parsed.PORT,
  corsOrigins: (parsed.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean),
  mongoUrl: parsed.MONGO_URL,
  jwtSecret: parsed.JWT_SECRET,
  jwtExpiresIn: parsed.JWT_EXPIRES_IN,
  refreshSecret: parsed.REFRESH_SECRET,
  refreshExpiresIn: parsed.REFRESH_EXPIRES_IN,
  bootstrapAdmin: {
    email: parsed.BOOTSTRAP_ADMIN_EMAIL || '',
    password: parsed.BOOTSTRAP_ADMIN_PASSWORD || '',
    name: parsed.BOOTSTRAP_ADMIN_NAME || 'Administrador'
  },
  // Cloudflare R2 (almacenamiento de imagenes)
  r2AccountId: parsed.R2_ACCOUNT_ID || '',
  r2AccessKeyId: parsed.R2_ACCESS_KEY_ID || '',
  r2SecretAccessKey: parsed.R2_SECRET_ACCESS_KEY || '',
  r2BucketName: parsed.R2_BUCKET_NAME || '',
  r2PublicUrl: (parsed.R2_PUBLIC_URL || '').replace(/\/$/, '') // sin barra final
};
