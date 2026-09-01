import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createInsumoSchema, updateInsumoSchema, ajusteStockSchema } from '../schemas/insumo.schemas.js';
import {
  listInsumos, getInsumo, createInsumo, updateInsumo, deleteInsumo, ajustarStock, getMovimientos
} from '../controllers/insumoController.js';

const router = Router();

router.use(authenticate);
router.get('/', listInsumos);
router.get('/:id', getInsumo);
router.get('/:id/movimientos', getMovimientos);
router.post('/', validate(createInsumoSchema), createInsumo);
router.post('/:id/ajuste', validate(ajusteStockSchema), ajustarStock);
router.put('/:id', validate(updateInsumoSchema), updateInsumo);
router.delete('/:id', deleteInsumo);

export default router;
