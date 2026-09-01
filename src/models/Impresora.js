import mongoose from 'mongoose';

export const ESTADO_IMPRESORA = ['activa', 'inactiva', 'mantenimiento'];

const ImpresoraSchema = new mongoose.Schema({
  modelo: { type: String, required: true, trim: true },
  consumo: { type: Number, default: 0.15 }, // kW
  costoHora: { type: Number, default: 0 },
  estado: { type: String, enum: ESTADO_IMPRESORA, default: 'activa', index: true },
  horasAcumuladas: { type: Number, default: 0 },
  ultimoMantenimiento: { type: Date, default: null },
  notasMantenimiento: { type: String },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

export const Impresora = mongoose.model('Impresora', ImpresoraSchema);
