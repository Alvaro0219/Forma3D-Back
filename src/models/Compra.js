import mongoose from 'mongoose';

export const FORMA_PAGO = ['efectivo', 'transferencia', 'debito', 'credito', 'mercadopago', 'otro'];

const CompraItemSchema = new mongoose.Schema({
  articuloTipo: { type: String, enum: ['Insumo', 'Filamento'], required: true },
  articuloId: { type: mongoose.Schema.Types.ObjectId, refPath: 'items.articuloTipo', default: null },
  descripcion: { type: String, required: true },
  cantidad: { type: Number, required: true, min: 0 },
  precioUnitario: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const CompraSchema = new mongoose.Schema({
  proveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Proveedor', default: null },
  fecha: { type: Date, default: Date.now, index: true },
  comprobante: { type: String },
  items: { type: [CompraItemSchema], default: [] },
  total: { type: Number, required: true, min: 0 },
  formaPago: { type: String, enum: FORMA_PAGO, default: 'efectivo' },
  observaciones: { type: String },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

export const Compra = mongoose.model('Compra', CompraSchema);
