import mongoose from 'mongoose';

const ProveedorSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, index: true },
  telefono: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  notas: { type: String },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

export const Proveedor = mongoose.model('Proveedor', ProveedorSchema);
