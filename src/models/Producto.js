import mongoose from 'mongoose';

/**
 * Disponibilidad publica en tienda: se puede fijar manualmente o derivar del stock.
 * 'auto' => se calcula segun stock. Otros valores fuerzan el texto mostrado.
 */
export const DISPONIBILIDAD = ['auto', 'disponible', 'pocas_unidades', 'sin_stock', 'a_pedido'];

/**
 * Insumo/accesorio que consume el producto (lista de materiales).
 * Al registrar una venta se descuenta `cantidad` x unidades vendidas del stock del insumo.
 */
const ProductoInsumoSchema = new mongoose.Schema({
  insumo: { type: mongoose.Schema.Types.ObjectId, ref: 'Insumo', required: true },
  cantidad: { type: Number, required: true, min: 0, default: 1 }
}, { _id: false });

const ProductoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, index: true },
  // Se genera automaticamente segun la categoria (ver services/skuService.js).
  sku: { type: String, required: true, unique: true, trim: true },
  descripcion: { type: String },
  categoria: { type: String, trim: true, index: true },
  material: { type: String, trim: true, index: true },
  colores: [{ type: String, trim: true }],
  fotoPrincipal: { type: String },
  fotos: [{ type: String }],

  precioVenta: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 0, min: 0 },

  // Insumos/accesorios que lleva el producto (se descuentan al vender).
  insumos: { type: [ProductoInsumoSchema], default: [] },

  // Datos internos (nunca se exponen en la tienda publica)
  pesoInterno: { type: Number, default: 0, min: 0 },       // gramos
  tiempoImpresion: { type: Number, default: 0, min: 0 },   // minutos
  costoFabricacion: { type: Number, default: 0, min: 0 },
  ganancia: { type: Number, default: 0 },

  archivo3D: { type: mongoose.Schema.Types.ObjectId, ref: 'Archivo3D', default: null },

  visibleEnTienda: { type: Boolean, default: true, index: true },
  disponibilidadTienda: { type: String, enum: DISPONIBILIDAD, default: 'auto' },

  isActive: { type: Boolean, default: true, index: true } // archivar = false
}, { timestamps: true });

ProductoSchema.index({ nombre: 'text', sku: 'text', descripcion: 'text' });

// Ganancia derivada del precio y costo si no se setea explicitamente.
ProductoSchema.virtual('margen').get(function margen() {
  if (!this.precioVenta) return 0;
  return ((this.precioVenta - this.costoFabricacion) / this.precioVenta) * 100;
});

export const Producto = mongoose.model('Producto', ProductoSchema);
