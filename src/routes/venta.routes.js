import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createVentaSchema, desdePedidoSchema } from '../schemas/venta.schemas.js';
import {
  listVentas, getVenta, createVenta, desdePedido, anularVenta
} from '../controllers/ventaController.js';

const router = Router();

router.use(authenticate);
router.get('/', listVentas);
router.get('/:id', getVenta);
router.post('/', validate(createVentaSchema), createVenta);
router.post('/desde-pedido', validate(desdePedidoSchema), desdePedido);
router.patch('/:id/anular', anularVenta);

export default router;
