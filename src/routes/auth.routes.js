import { Router } from 'express';
import { authLimiter } from '../middlewares/rateLimit.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema, refreshSchema, createUserSchema, updateUserSchema } from '../schemas/auth.schemas.js';
import { login, refresh, me, listUsers, createUser, updateUser } from '../controllers/authController.js';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', authLimiter, validate(refreshSchema), refresh);
router.get('/me', authenticate, me);

// Gestion de usuarios (solo admin)
router.get('/users', authenticate, requireAdmin, listUsers);
router.post('/users', authenticate, requireAdmin, validate(createUserSchema), createUser);
router.put('/users/:id', authenticate, requireAdmin, validate(updateUserSchema), updateUser);

export default router;
