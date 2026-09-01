import mongoose from 'mongoose';

export const ESTADO_PEDIDO = [
  'Pendiente', 'Diseno', 'Preparando', 'Imprimiendo', 'Listo', 'Entregado', 'Cancelado'
];

const PedidoItemSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', default: null },
  nombre: { type: String, required: true },
  cantidad: { type: Number, required: true, min: 1 },
  precioUnitario: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const PedidoSchema = new mongoose.Schema({
  numero: { type: Number, unique: true, index: true },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
  clienteNombre: { type: String }, // fallback si el pedido viene de la tienda sin cliente registrado
  items: { type: [PedidoItemSchema], default: [] },
  total: { type: Number, required: true, min: 0 },
  notas: { type: String },
  estado: { type: String, enum: ESTADO_PEDIDO, default: 'Pendiente', index: true },
  fechaEntrega: { type: Date, default: null },
  impresiones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Impresion' }],
  venta: { type: mongoose.Schema.Types.ObjectId, ref: 'Venta', default: null },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

export const Pedido = mongoose.model('Pedido', PedidoSchema);
