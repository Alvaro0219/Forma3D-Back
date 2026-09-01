import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { updateConfigSchema, createImpresoraSchema, updateImpresoraSchema } from '../schemas/config.schemas.js';
import {
  getConfig, updateConfig,
  listImpresoras, getImpresora, createImpresora, updateImpresora, deleteImpresora
} from '../controllers/configController.js';

const router = Router();

router.use(authenticate);

// Configuracion general: leer autenticado; escribir solo admin.
router.get('/', getConfig);
router.put('/', requireAdmin, validate(updateConfigSchema), updateConfig);

// Impresoras
router.get('/impresoras', listImpresoras);
router.get('/impresoras/:id', getImpresora);
router.post('/impresoras', requireAdmin, validate(createImpresoraSchema), createImpresora);
router.put('/impresoras/:id', requireAdmin, validate(updateImpresoraSchema), updateImpresora);
router.delete('/impresoras/:id', requireAdmin, deleteImpresora);

export default router;
