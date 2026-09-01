import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createPedidoSchema, updatePedidoSchema, cambiarEstadoSchema } from '../schemas/pedido.schemas.js';
import {
  listPedidos, getPedido, createPedido, updatePedido, cambiarEstado, deletePedido
} from '../controllers/pedidoController.js';

const router = Router();

router.use(authenticate);
router.get('/', listPedidos);
router.get('/:id', getPedido);
router.post('/', validate(createPedidoSchema), createPedido);
router.put('/:id', validate(updatePedidoSchema), updatePedido);
router.patch('/:id/estado', validate(cambiarEstadoSchema), cambiarEstado);
router.delete('/:id', deletePedido);

export default router;
