import mongoose from 'mongoose';

/**
 * Biblioteca de archivos 3D con versionado embebido.
 * MODULO SECUNDARIO (esqueleto): modelo completo, CRUD basico; ampliar segun necesidad
 * (carga fisica de STL/3MF, previsualizaciones, etc.).
 */
const VersionSchema = new mongoose.Schema({
  numero: { type: Number, required: true }, // v1, v2, v3...
  fecha: { type: Date, default: Date.now },
  cambios: { type: String, default: '' },
  archivoStl: { type: String, default: '' }, // url/ruta
  archivo3mf: { type: String, default: '' },
  esActual: { type: Boolean, default: false }
}, { _id: false });

const Archivo3DSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, index: true },
  codigo: { type: String, trim: true, index: true },
  categoria: { type: String, trim: true },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null }, // si es personalizado
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', default: null },
  fotos: [{ type: String }],
  descripcion: { type: String },
  notas: { type: String },

  // Datos tecnicos por defecto
  pesoImpresion: { type: Number, default: 0 },     // gramos
  tiempoImpresion: { type: Number, default: 0 },   // minutos
  configuracionImpresion: { type: String, default: '' },

  versiones: { type: [VersionSchema], default: [] },
  estado: { type: String, enum: ['activo', 'archivado'], default: 'activo', index: true }
}, { timestamps: true });

export const Archivo3D = mongoose.model('Archivo3D', Archivo3DSchema);
