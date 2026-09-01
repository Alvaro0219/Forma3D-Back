import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { calcularCostoSchema } from '../schemas/costo.schemas.js';
import { calcular } from '../controllers/costoController.js';

const router = Router();

// Calculadora de costos: dato sensible -> solo admin.
router.post('/calcular', authenticate, requireAdmin, validate(calcularCostoSchema), calcular);

export default router;
