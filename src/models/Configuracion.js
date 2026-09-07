import mongoose from 'mongoose';

/**
 * Documento unico de configuracion del negocio (singleton).
 * Se obtiene siempre con Configuracion.getSingleton().
 */
const ConfiguracionSchema = new mongoose.Schema({
  clave: { type: String, default: 'main', unique: true }, // fija el singleton

  // Datos del emprendimiento
  nombreNegocio: { type: String, default: 'Forma Impresiones 3D' },
  telefono: { type: String, default: '' },
  direccion: { type: String, default: '' },
  logo: { type: String, default: '' },
  moneda: { type: String, default: 'ARS' },

  // Parametros de costo (editables, alimentan la calculadora)
  precioKwh: { type: Number, default: 60 },
  costoHoraMaquina: { type: Number, default: 300 },   // por hora
  consumoImpresoraDefault: { type: Number, default: 0.15 }, // kW (150W)
  manoObraDefault: { type: Number, default: 0 },      // por hora
  costoEmbalajeDefault: { type: Number, default: 0 },
  otrosCostosDefault: { type: Number, default: 0 },
  margenDefault: { type: Number, default: 60 },       // %

  // Catalogos configurables
  categorias: { type: [String], default: ['Llaveros', 'Decoracion', 'Utilitario', 'Personalizado'] },
  unidades: { type: [String], default: ['unidad', 'g', 'ml', 'm', 'par'] },

  // Tienda publica
  whatsappNumero: { type: String, default: '' }, // formato internacional sin +, ej. 5493511234567
  plantillaMensaje: {
    type: String,
    default: 'Hola! Quiero hacer un pedido:\n\n{items}\n\nTotal: {total}\n\nMis datos:\nNombre: {nombre}\nNotas: {notas}'
  },
  mostrarDisponibilidad: { type: Boolean, default: true },
  // Umbral global para mostrar "Pocas unidades" en la tienda (los productos ya no tienen stock minimo).
  umbralPocasUnidades: { type: Number, default: 3 }
}, { timestamps: true });

ConfiguracionSchema.statics.getSingleton = async function getSingleton() {
  let cfg = await this.findOne({ clave: 'main' });
  if (!cfg) cfg = await this.create({ clave: 'main' });
  return cfg;
};

export const Configuracion = mongoose.model('Configuracion', ConfiguracionSchema);
