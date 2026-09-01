import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createFilamentoSchema, updateFilamentoSchema, consumoFilamentoSchema } from '../schemas/filamento.schemas.js';
import {
  listFilamentos, getFilamento, createFilamento, updateFilamento, deleteFilamento, consumir, getMovimientos
} from '../controllers/filamentoController.js';

const router = Router();

router.use(authenticate);
router.get('/', listFilamentos);
router.get('/:id', getFilamento);
router.get('/:id/movimientos', getMovimientos);
router.post('/', validate(createFilamentoSchema), createFilamento);
router.post('/:id/consumir', validate(consumoFilamentoSchema), consumir);
router.put('/:id', validate(updateFilamentoSchema), updateFilamento);
router.delete('/:id', deleteFilamento);

export default router;
