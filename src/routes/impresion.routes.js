import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createImpresionSchema, updateImpresionSchema } from '../schemas/impresion.schemas.js';
import {
  listImpresiones, getImpresion, createImpresion, updateImpresion, deleteImpresion, registrarConsumo
} from '../controllers/impresionController.js';

const router = Router();

router.use(authenticate);
router.get('/', listImpresiones);
router.get('/:id', getImpresion);
router.post('/', validate(createImpresionSchema), createImpresion);
router.post('/:id/consumo', registrarConsumo);
router.put('/:id', validate(updateImpresionSchema), updateImpresion);
router.delete('/:id', deleteImpresion);

export default router;
