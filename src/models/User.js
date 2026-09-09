import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  // Marca del ultimo cambio de contraseña: invalida los refresh tokens emitidos antes.
  passwordChangedAt: { type: Date, default: null },
  role: { type: String, enum: ['admin', 'empleado'], default: 'empleado', index: true },
  // Permisos granulares opcionales para empleados (ej. restringir acceso a costos).
  permisos: {
    verCostos: { type: Boolean, default: false }
  },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

UserSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    permisos: this.permisos,
    isActive: this.isActive
  };
};

export const User = mongoose.model('User', UserSchema);
