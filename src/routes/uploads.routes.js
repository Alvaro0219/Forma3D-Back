import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { uploadLimiter } from '../middlewares/rateLimit.js';
import { validate } from '../middlewares/validate.js';
import { presignSchema } from '../schemas/upload.schemas.js';
import { requestUploadUrl } from '../controllers/uploadController.js';

const router = Router();

// Autenticado + rate limit + validate. No recibe el archivo, solo firma la subida.
router.post('/presign', authenticate, uploadLimiter, validate(presignSchema), requestUploadUrl);

export default router;
