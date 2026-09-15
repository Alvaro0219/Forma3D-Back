import mongoose from 'mongoose';

export const TIPO_FILAMENTO = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'NYLON', 'OTRO'];
export const ESTADO_FILAMENTO = ['nueva', 'en_uso', 'agotada'];
// Catalogo fijo de marcas: define el prefijo del ID de bobina autogenerado (ver bobinaService.js).
export const MARCA_FILAMENTO = ['PRINTALOT', 'GRILON', 'GST3D', 'HELBOT', '3N3', 'ELEGI00', 'BAMBULAB', 'FILAR'];

const FilamentoSchema = new mongoose.Schema({
  // Se autogenera a partir de la marca (bobinaService.generarIdentificadorBobina); no lo carga el usuario.
  identificadorBobina: { type: String, required: true, unique: true, trim: true },
  // Sin enum a nivel Mongoose a proposito: la lista cerrada (MARCA_FILAMENTO) se exige
  // solo al crear (ver filamento.schemas.js). Un enum aca rompería el .save() de
  // bobinas ya cargadas con una marca libre anterior a este catalogo (ej. al registrar consumo).
  marca: { type: String, required: true, index: true },
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
