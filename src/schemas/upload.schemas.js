import Joi from 'joi';

// Contrato del presign: el backend NO recibe el archivo, solo metadatos para firmar.
// kind='image' -> valida content-type de imagen; kind='model' -> STL/3MF (valida por extension).
export const presignSchema = Joi.object({
  fileName: Joi.string().required(),
  kind: Joi.string().valid('image', 'model').default('image'),
  contentType: Joi.string().when('kind', {
    is: 'model',
    then: Joi.string().default('application/octet-stream'),
    otherwise: Joi.string().valid('image/jpeg', 'image/png', 'image/webp').required()
  }),
  folder: Joi.string().alphanum().default('general')
});
