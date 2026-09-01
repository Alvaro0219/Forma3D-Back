import mongoose from 'mongoose';
import { FORMA_PAGO } from './Compra.js';

export const ESTADO_VENTA = ['completada', 'anulada'];

const VentaItemSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', default: null },
  nombre: { type: String, required: true },
  cantidad: { type: Number, required: true, min: 1 },
  precioUnitario: { type: Number, required: true, min: 0 },
  costoUnitario: { type: Number, default: 0, min: 0 },
  subtotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const VentaSchema = new mongoose.Schema({
  numero: { type: Number, unique: true, index: true },
  // Idempotencia opcional desde el cliente. Indice parcial: unico solo cuando uuid es string,
  // asi multiples ventas sin uuid no colisionan (un indice sparse no excluye los null explicitos).
  uuid: { type: String, default: undefined },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
  clienteNombre: { type: String },
  items: { type: [VentaItemSchema], default: [] },

  total: { type: Number, required: true, min: 0 },
  costoReal: { type: Number, default: 0, min: 0 },
  ganancia: { type: Number, default: 0 },
  margen: { type: Number, default: 0 },

  formaPago: { type: String, enum: FORMA_PAGO, default: 'efectivo' },
  estado: { type: String, enum: ESTADO_VENTA, default: 'completada', index: true },
  descontarStock: { type: Boolean, default: true },

  pedido: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', default: null },
  fecha: { type: Date, default: Date.now, index: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

// Unicidad de uuid solo para documentos que realmente lo tienen (idempotencia del cliente).
VentaSchema.index({ uuid: 1 }, { unique: true, partialFilterExpression: { uuid: { $type: 'string' } } });

export const Venta = mongoose.model('Venta', VentaSchema);
