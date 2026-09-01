import mongoose from 'mongoose';

const ClienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, index: true },
  telefono: { type: String, trim: true, index: true },
  email: { type: String, trim: true, lowercase: true },
  direccion: { type: String, trim: true },
  notas: { type: String },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

ClienteSchema.index({ nombre: 'text', telefono: 'text' });

export const Cliente = mongoose.model('Cliente', ClienteSchema);
