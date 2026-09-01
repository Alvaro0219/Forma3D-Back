import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';

import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { globalApiLimiter } from './middlewares/rateLimit.js';
import { AppError } from './utils/AppError.js';
import apiRoutes from './routes/index.js';
import { bootstrapAdmin } from './services/authService.js';

const app = express();

// 1. CORS
const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origin (curl, apps moviles) y los origenes configurados.
    if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin no permitido por CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 2. Logging
app.use(morgan('dev'));

// 3. Seguridad de headers
app.use(helmet());

// 4. Body parser
app.use(express.json({ limit: '1mb' }));

// 5. Rate limiter global
app.use('/api', globalApiLimiter);

// 6. Healthcheck
app.get('/health', (req, res) => res.json({ ok: true }));

// 7. Rutas de la app
app.use('/api', apiRoutes);

// 404 para rutas no encontradas bajo /api
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: { message: 'Ruta no encontrada', code: 'NOT_FOUND' } });
});

// 8. Error handler global
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

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
