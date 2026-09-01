import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createProductoSchema, updateProductoSchema } from '../schemas/producto.schemas.js';
import {
  listProductos, getProducto, createProducto, updateProducto, deleteProducto, nextSku
} from '../controllers/productoController.js';

const router = Router();

router.use(authenticate);
router.get('/', listProductos);
router.get('/next-sku', nextSku); // antes de /:id para que no lo capture
router.get('/:id', getProducto);
router.post('/', validate(createProductoSchema), createProducto);
router.put('/:id', validate(updateProductoSchema), updateProducto);
router.delete('/:id', deleteProducto);

export default router;
