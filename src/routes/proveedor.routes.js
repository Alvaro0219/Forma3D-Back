import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createProveedorSchema, updateProveedorSchema } from '../schemas/proveedor.schemas.js';
import {
  listProveedores, getProveedor, createProveedor, updateProveedor, deleteProveedor
} from '../controllers/proveedorController.js';

const router = Router();

router.use(authenticate);
router.get('/', listProveedores);
router.get('/:id', getProveedor);
router.post('/', validate(createProveedorSchema), createProveedor);
router.put('/:id', validate(updateProveedorSchema), updateProveedor);
router.delete('/:id', deleteProveedor);

export default router;
