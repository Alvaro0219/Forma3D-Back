import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

// Variable de R2: requerida en produccion, opcional (allow '') en desarrollo.
const r2Var = Joi.string().when('NODE_ENV', {
  is: 'production',
  then: Joi.required(),
  otherwise: Joi.string().allow('').default('')
});

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  MONGO_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  REFRESH_SECRET: Joi.string().min(16).required(),
  REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  CORS_ORIGINS: Joi.string().allow('').default(''),
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

if (error && process.env.NODE_ENV === 'production') {
  console.error('Invalid environment configuration:', error.message);
  process.exit(1);
} else if (error) {
  console.warn('Environment warning (non-production):', error.message);
}

export const env = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  corsOrigins: (parsed.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean),
  mongoUrl: parsed.MONGO_URL || 'mongodb://localhost:27017/impresion3d',
  jwtSecret: parsed.JWT_SECRET || 'change_me_dev_secret_min16',
  jwtExpiresIn: parsed.JWT_EXPIRES_IN,
  refreshSecret: parsed.REFRESH_SECRET || 'change_me_dev_refresh_min16',
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
