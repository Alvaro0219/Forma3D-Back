import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

function issueTokens(user) {
  const accessToken = jwt.sign(
    { sub: user._id.toString(), role: user.role, name: user.name },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
  const refreshToken = jwt.sign(
    { sub: user._id.toString() },
    env.refreshSecret,
    { expiresIn: env.refreshExpiresIn }
  );
  return { accessToken, refreshToken };
}

export async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
  if (!user) throw new AppError('Credenciales invalidas', 401, 'INVALID_CREDENTIALS');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new AppError('Credenciales invalidas', 401, 'INVALID_CREDENTIALS');

  const tokens = issueTokens(user);
  return { ...tokens, user: user.toSafeJSON() };
}

export async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.refreshSecret);
  } catch {
    throw new AppError('Refresh token invalido', 401, 'INVALID_REFRESH');
  }

  const user = await User.findOne({ _id: payload.sub, isActive: true });
  if (!user) throw new AppError('Usuario no encontrado', 401, 'INVALID_REFRESH');

  // Un token emitido antes del ultimo cambio de contraseña ya no vale: es lo que
  // convierte "cambiar la clave" en una forma real de cortar sesiones robadas.
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
    throw new AppError('La sesion expiro por un cambio de contraseña', 401, 'INVALID_REFRESH');
  }

  const tokens = issueTokens(user);
  return { ...tokens, user: user.toSafeJSON() };
}

export async function createUser({ name, email, password, role = 'empleado', permisos }) {
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new AppError('Ya existe un usuario con ese email', 409, 'CONFLICT');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role, permisos });
  return user.toSafeJSON();
}

/** Cambio de la propia contraseña. Exige la actual y corta las sesiones anteriores. */
export async function changePassword(userId, actual, nueva) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');

  const match = await bcrypt.compare(actual, user.passwordHash);
  if (!match) throw new AppError('La contraseña actual no es correcta', 400, 'INVALID_CREDENTIALS');

  user.passwordHash = await bcrypt.hash(nueva, 10);
  user.passwordChangedAt = new Date();
  await user.save();
}

/** Actualiza un usuario. Si viene `password`, se hashea (nunca se guarda en claro). */
export async function updateUser(id, { password, ...campos }) {
  const user = await User.findById(id);
  if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');

  Object.assign(user, campos);
  if (password) {
    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordChangedAt = new Date();
  }
  await user.save();
  return user.toSafeJSON();
}

/** Crea el primer admin desde variables de entorno si la base no tiene usuarios. */
export async function bootstrapAdmin() {
  const { email, password, name } = env.bootstrapAdmin;
  if (!email || !password) return;

  const count = await User.countDocuments();
  if (count > 0) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ name, email, passwordHash, role: 'admin', permisos: { verCostos: true } });
  console.log(`[bootstrap] Admin inicial creado: ${email}`);
}
