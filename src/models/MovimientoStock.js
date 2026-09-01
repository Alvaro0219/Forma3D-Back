import mongoose from 'mongoose';

export const TIPO_MOVIMIENTO = ['compra', 'consumo', 'ajuste', 'venta', 'correccion'];
export const ARTICULO_TIPO = ['Insumo', 'Filamento', 'Producto'];

/**
 * Historial de movimientos de stock de cualquier articulo.
 * cantidad: positiva (ingreso) o negativa (egreso) segun el tipo.
 */
const MovimientoStockSchema = new mongoose.Schema({
  articuloTipo: { type: String, enum: ARTICULO_TIPO, required: true, index: true },
  articuloId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'articuloTipo', index: true },
  articuloNombre: { type: String }, // denormalizado para el historial

  tipo: { type: String, enum: TIPO_MOVIMIENTO, required: true, index: true },
  cantidad: { type: Number, required: true }, // con signo
  unidad: { type: String, default: 'unidad' },

  referencia: { type: String },   // texto libre (ej. "Compra #12", "Venta #34")
  refModel: { type: String },     // 'Compra' | 'Venta' | 'Impresion' | null
  refId: { type: mongoose.Schema.Types.ObjectId, default: null },

  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  fecha: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

export const MovimientoStock = mongoose.model('MovimientoStock', MovimientoStockSchema);
