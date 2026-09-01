import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { calcularCosto } from '../services/costoService.js';
import { Configuracion } from '../models/Configuracion.js';

/**
 * Calculadora de costos. Toma los defaults de Configuracion para los campos
 * que el cliente no envie (precio kWh, costo/hora maquina, consumo, etc.),
 * de modo que un presupuesto rapido solo requiera gramos y tiempo.
 */
export const calcular = asyncHandler(async (req, res) => {
  const cfg = await Configuracion.getSingleton();
  const input = { ...req.validated };

  if (!input.precioKwh) input.precioKwh = cfg.precioKwh;
  if (!input.costoHoraMaquina) input.costoHoraMaquina = cfg.costoHoraMaquina;
  if (!input.consumoElectrico) input.consumoElectrico = cfg.consumoImpresoraDefault;
  if (!input.manoObra) input.manoObra = cfg.manoObraDefault;
  if (!input.embalaje) input.embalaje = cfg.costoEmbalajeDefault;
  if (!input.otros) input.otros = cfg.otrosCostosDefault;
  if (input.modo === 'margen' && !input.margenDeseado) input.margenDeseado = cfg.margenDefault;

  const resultado = calcularCosto(input);
  return ok(res, { input, resultado });
});
