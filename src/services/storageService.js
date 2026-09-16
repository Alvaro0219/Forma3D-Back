import { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/**
 * Encapsula toda la interaccion con Cloudflare R2 (S3-compatible):
 * genera URLs firmadas para subir, borra objetos y arma la URL publica final.
 * Ningun controller instancia el cliente S3 directamente.
 * Las imagenes nunca se guardan en Mongo: solo la URL publica se persiste.
 */
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.r2AccessKeyId,
    secretAccessKey: env.r2SecretAccessKey
  }
});

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// Archivos 3D: los navegadores suelen reportar STL/3MF como octet-stream o vacio,
// asi que para 'model' se valida por EXTENSION, no por content-type.
const ALLOWED_MODEL_EXT = new Set(['stl', '3mf']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;        // imagenes: 5MB
const MAX_MODEL_SIZE_BYTES = 50 * 1024 * 1024; // modelos 3D: 50MB

export function buildImageKey(originalName, folder = 'general') {
  const ext = (originalName.split('.').pop() || 'jpg').toLowerCase();
  return `${folder}/${randomUUID()}.${ext}`; // nunca usar el nombre original del cliente
}

/**
 * Genera la URL firmada para subir a R2.
 * kind='image' (default): valida content-type de imagen.
 * kind='model': valida extension STL/3MF (el content-type de estos archivos no es confiable).
 *
 * `size` se firma como ContentLength: R2 rechaza la subida si el archivo real no pesa
 * exactamente eso. Sin esto los limites de 5MB/50MB son solo una validacion del
 * navegador, y quien tenga un presign puede subir un archivo de cualquier tamaño.
 */
export async function getUploadUrl(key, contentType, kind = 'image', size = 0) {
  const maxSize = kind === 'model' ? MAX_MODEL_SIZE_BYTES : MAX_SIZE_BYTES;

  if (kind === 'model') {
    const ext = (key.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_MODEL_EXT.has(ext)) {
      throw new AppError('Tipo de archivo 3D no permitido (solo STL o 3MF)', 400, 'INVALID_FILE_TYPE');
    }
  } else if (!ALLOWED_TYPES.has(contentType)) {
    throw new AppError('Tipo de archivo no permitido', 400, 'INVALID_FILE_TYPE');
  }

  if (!size || size > maxSize) {
    throw new AppError(`El archivo supera el maximo de ${Math.round(maxSize / 1024 / 1024)}MB`, 400, 'FILE_TOO_LARGE');
  }

  const command = new PutObjectCommand({
    Bucket: env.r2BucketName,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
    ContentLength: size
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 300, // 5 minutos
    signableHeaders: new Set(['content-length', 'content-type'])
  });
  const publicUrl = `${env.r2PublicUrl}/${key}`;
  return { uploadUrl, publicUrl, key };
}

export async function deleteImage(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: env.r2BucketName, Key: key }));
}

/** Arma el header Content-Disposition con soporte para nombres con tildes/ñ (RFC 5987). */
function buildContentDisposition(filename) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * URL firmada de DESCARGA (GET), de corta duracion: fuerza al navegador a guardar
 * el archivo con `filename` en vez del nombre interno (UUID) de la key en R2.
 * No modifica el objeto guardado, solo la respuesta de esta descarga puntual.
 */
export async function getDownloadUrl(key, filename) {
  const command = new GetObjectCommand({
    Bucket: env.r2BucketName,
    Key: key,
    ResponseContentDisposition: buildContentDisposition(filename)
  });
  return getSignedUrl(s3, command, { expiresIn: 120 });
}

/** Recupera la key de R2 a partir de la URL publica guardada en el documento. */
export function keyFromPublicUrl(url) {
  if (!url) return null;
  const prefix = `${env.r2PublicUrl}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

export { MAX_SIZE_BYTES, MAX_MODEL_SIZE_BYTES, ALLOWED_TYPES, ALLOWED_MODEL_EXT };
