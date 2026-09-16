import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createArchivoSchema, updateArchivoSchema, addVersionSchema } from '../schemas/archivo.schemas.js';
import {
  listArchivos, getArchivo, createArchivo, updateArchivo, deleteArchivo, addVersion, setVersionActual, descargarVersion
} from '../controllers/archivoController.js';

const router = Router();

router.use(authenticate);
router.get('/', listArchivos);
router.get('/:id/descarga', descargarVersion);
router.get('/:id', getArchivo);
router.post('/', validate(createArchivoSchema), createArchivo);
router.post('/:id/versiones', validate(addVersionSchema), addVersion);
router.patch('/:id/versiones/:numero/actual', setVersionActual);
router.put('/:id', validate(updateArchivoSchema), updateArchivo);
router.delete('/:id', deleteArchivo);

export default router;
