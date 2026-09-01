import mongoose from 'mongoose';

export const ESTADO_IMPRESION = ['pendiente', 'imprimiendo', 'terminada', 'fallida', 'cancelada'];

/**
 * Bobina consumida por la impresion. Una impresion puede usar varias bobinas
 * (multicolor), y de cada una se registra cuantos gramos gasto.
 */
const ImpresionFilamentoSchema = new mongoose.Schema({
  filamento: { type: mongoose.Schema.Types.ObjectId, ref: 'Filamento', required: true },
  gramos: { type: Number, required: true, min: 0 }
}, { _id: false });

/**
 * Registro de trabajos de impresion.
 * Al pasar a estado "terminada" se descuentan los gramos de cada bobina y se
 * calcula el costo real (ver services/impresionService.js).
 * La biblioteca de archivos 3D no participa de este flujo.
 */
const ImpresionSchema = new mongoose.Schema({
  numero: { type: Number, unique: true, index: true },
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  impresora: { type: mongoose.Schema.Types.ObjectId, ref: 'Impresora', required: true },

  // Varias bobinas por impresion, con los gramos gastados de cada una.
  filamentos: { type: [ImpresionFilamentoSchema], default: [] },

  cantidadPiezas: { type: Number, default: 1, min: 1 },
  pesoTotal: { type: Number, default: 0, min: 0 }, // derivado: suma de gramos de las bobinas
  tiempo: { type: Number, default: 0, min: 0 },    // minutos reales de impresion

  fechaInicio: { type: Date, default: null },
  fechaFin: { type: Date, default: null },
  estado: { type: String, enum: ESTADO_IMPRESION, default: 'pendiente', index: true },

  costoMaterial: { type: Number, default: 0 },
  costoTotal: { type: Number, default: 0 },

  consumoRegistrado: { type: Boolean, default: false }, // evita descontar stock dos veces
  notas: { type: String },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

// pesoTotal siempre derivado de las bobinas cargadas.
ImpresionSchema.pre('save', function recalcPeso(next) {
  this.pesoTotal = (this.filamentos || []).reduce((acc, f) => acc + (Number(f.gramos) || 0), 0);
  next();
});

export const Impresion = mongoose.model('Impresion', ImpresionSchema);
