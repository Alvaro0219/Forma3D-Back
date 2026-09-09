import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';

import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { globalApiLimiter } from './middlewares/rateLimit.js';
import { sanitizeRequest } from './middlewares/sanitize.js';
import { AppError } from './utils/AppError.js';
import apiRoutes from './routes/index.js';
import { bootstrapAdmin } from './services/authService.js';

const app = express();

// 0. Proxy reverso (Railway/Render/Cloudflare).
// Sin esto, express-rate-limit ve siempre la IP del proxy y mete a TODOS los
// clientes en el mismo cupo, con lo cual el limite de login deja de proteger.
// El numero es la cantidad de proxies delante de la app: subirlo si se agrega otro.
if (env.isProduction) app.set('trust proxy', 1);

// 1. CORS — lista blanca explicita. Si CORS_ORIGINS esta vacio no se permite
// ningun origen de navegador: el default tiene que ser denegar, no aceptar todo.
const corsOptions = {
  origin: (origin, callback) => {
    // Sin header Origin (curl, health checks, server-to-server): no es una
    // request cross-origin de navegador, no hay nada que restringir.
    if (!origin) return callback(null, true);
    if (env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin no permitido por CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 2. Logging
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

// 3. Seguridad de headers
app.use(helmet());

// 4. Body parser
app.use(express.json({ limit: '1mb' }));

// 5. Sanitizacion de operadores Mongo ($gt, $ne, $where) en body/query/params.
app.use(sanitizeRequest);

// 6. Rate limiter global
app.use('/api', globalApiLimiter);

// 7. Healthcheck
app.get('/health', (req, res) => res.json({ ok: true }));

// 8. Rutas de la app
app.use('/api', apiRoutes);

// 404 para rutas no encontradas bajo /api
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: { message: 'Ruta no encontrada', code: 'NOT_FOUND' } });
});

// 9. Error handler global
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.message === 'Origin no permitido por CORS') {
    return res.status(403).json({ success: false, error: { message: 'Origen no permitido', code: 'CORS_FORBIDDEN' } });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, error: { message: err.message, code: err.code } });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, error: { message: err.message, code: 'VALIDATION_ERROR' } });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, error: { message: 'Recurso duplicado', code: 'CONFLICT' } });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, error: { message: 'Identificador invalido', code: 'INVALID_ID' } });
  }
  return res.status(500).json({ success: false, error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' } });
});

async function startServer() {
  try {
    await connectDb();
    console.log('MongoDB conectado');
    await bootstrapAdmin();
    app.listen(env.port, () => {
      console.log(`API escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
    });
  } catch (err) {
    console.error('No se pudo iniciar el servidor:', err);
    process.exit(1);
  }
}

startServer();

export default app;
