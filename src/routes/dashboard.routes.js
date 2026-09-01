import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { resumen, series } from '../controllers/dashboardController.js';

const router = Router();

router.use(authenticate);
router.get('/resumen', resumen);
router.get('/series', series);

export default router;
