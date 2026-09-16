import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createCompraSchema, updateCompraSchema } from '../schemas/compra.schemas.js';
import { listCompras, getCompra, createCompra, updateCompra } from '../controllers/compraController.js';

const router = Router();

router.use(authenticate);
// Las compras implican costos: restringidas a admin.
router.get('/', requireAdmin, listCompras);
router.get('/:id', requireAdmin, getCompra);
router.post('/', requireAdmin, validate(createCompraSchema), createCompra);
router.put('/:id', requireAdmin, validate(updateCompraSchema), updateCompra);

export default router;
