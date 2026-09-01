import mongoose from 'mongoose';

export const TIPO_FILAMENTO = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'NYLON', 'OTRO'];
export const ESTADO_FILAMENTO = ['nueva', 'en_uso', 'agotada'];

const FilamentoSchema = new mongoose.Schema({
  identificadorBobina: { type: String, required: true, unique: true, trim: true },
  marca: { type: String, trim: true, index: true },
  tipo: { type: String, enum: TIPO_FILAMENTO, default: 'PLA', index: true },
  color: { type: String, trim: true },

  pesoOriginal: { type: Number, required: true, min: 1 },   // gramos
  pesoDisponible: { type: Number, required: true, min: 0 }, // gramos
  precioCompra: { type: Number, required: true, min: 0 },

  fechaCompra: { type: Date, default: Date.now },
  proveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Proveedor', default: null },

  estado: { type: String, enum: ESTADO_FILAMENTO, default: 'nueva', index: true },
  notas: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Costo por gramo = precio de la bobina / gramos originales.
FilamentoSchema.virtual('costoPorGramo').get(function costoPorGramo() {
  if (!this.pesoOriginal) return 0;
  return this.precioCompra / this.pesoOriginal;
});

export const Filamento = mongoose.model('Filamento', FilamentoSchema);
