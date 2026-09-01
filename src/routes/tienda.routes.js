import { Router } from 'express';
import { storeLimiter } from '../middlewares/rateLimit.js';
import { validate } from '../middlewares/validate.js';
import { checkoutSchema } from '../schemas/tienda.schemas.js';
import {
  listCatalogo, getProductoPublico, getTiendaInfo, checkout
} from '../controllers/tiendaController.js';

const router = Router();

// Rutas PUBLICAS: sin autenticacion. Solo exponen datos publicos del catalogo.
router.use(storeLimiter);
router.get('/info', getTiendaInfo);
router.get('/productos', listCatalogo);
router.get('/productos/:id', getProductoPublico);
router.post('/checkout', validate(checkoutSchema), checkout);

export default router;
