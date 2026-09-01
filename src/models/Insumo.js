import mongoose from 'mongoose';

/**
 * Insumos generales (no filamentos): imanes, aros de llavero, vasos, etc.
 * Los filamentos se gestionan por bobina en su propio modelo.
 */
const InsumoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, index: true },
  categoria: { type: String, trim: true, default: 'general', index: true },
  unidad: { type: String, trim: true, default: 'unidad' }, // unidad, g, ml, m, etc.
  stock: { type: Number, default: 0 },
  stockMinimo: { type: Number, default: 0 },
  costo: { type: Number, default: 0, min: 0 }, // costo unitario
  proveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Proveedor', default: null },
  notas: { type: String },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

export const Insumo = mongoose.model('Insumo', InsumoSchema);
