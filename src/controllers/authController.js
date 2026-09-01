import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { getPagination, buildPaginatedResponse } from '../utils/pagination.js';
import * as authService from '../services/authService.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated;
  const result = await authService.login(email, password);
  return ok(res, result);
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.validated;
  const result = await authService.refresh(refreshToken);
  return ok(res, result);
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
  return ok(res, user.toSafeJSON());
});

// ─── Gestion de usuarios (solo admin) ───────────────────────
export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const [items, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments()
  ]);
  const safe = items.map((u) => ({
    id: u._id, name: u.name, email: u.email, role: u.role, permisos: u.permisos, isActive: u.isActive
  }));
  return ok(res, buildPaginatedResponse(safe, total, { page, limit }));
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await authService.createUser(req.validated);
  return ok(res, user, 201);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.validated, { new: true });
  if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
  return ok(res, user.toSafeJSON());
});
