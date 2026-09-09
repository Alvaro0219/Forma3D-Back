import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { buildImageKey, getUploadUrl } from '../services/storageService.js';

/**
 * Devuelve una URL firmada para que el frontend suba la imagen DIRECTO a R2.
 * El archivo nunca pasa por el backend (evita cargar el server con su peso).
 * La validacion vive en la ruta via validate(presignSchema); aca se lee req.validated.
 */
export const requestUploadUrl = asyncHandler(async (req, res) => {
  const { fileName, contentType, folder, kind, size } = req.validated;
  const key = buildImageKey(fileName, folder);
  const { uploadUrl, publicUrl } = await getUploadUrl(key, contentType, kind, size);
  return ok(res, { uploadUrl, publicUrl, key });
});
