import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createClienteSchema, updateClienteSchema } from '../schemas/cliente.schemas.js';
import {
  listClientes, getCliente, createCliente, updateCliente, deleteCliente
} from '../controllers/clienteController.js';

const router = Router();

router.use(authenticate);
router.get('/', listClientes);
router.get('/:id', getCliente);
router.post('/', validate(createClienteSchema), createCliente);
router.put('/:id', validate(updateClienteSchema), updateCliente);
router.delete('/:id', deleteCliente);

export default router;
