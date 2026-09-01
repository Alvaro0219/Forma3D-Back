import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { getResumen, getSeriesVentas } from '../services/dashboardService.js';

export const resumen = asyncHandler(async (req, res) => {
  const data = await getResumen();
  return ok(res, data);
});

export const series = asyncHandler(async (req, res) => {
  const dias = Math.min(parseInt(req.query.dias, 10) || 30, 365);
  const data = await getSeriesVentas(dias);
  return ok(res, data);
});
