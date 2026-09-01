import { Impresion } from '../models/Impresion.js';
import { Filamento } from '../models/Filamento.js';
import { Impresora } from '../models/Impresora.js';
import { Configuracion } from '../models/Configuracion.js';
import { registrarMovimiento } from './stockService.js';
import { calcularCostoImpresion } from './costoService.js';
import { runAtomic } from '../utils/transaction.js';
import { AppError } from '../utils/AppError.js';

/**
 * Finaliza una impresion: descuenta los gramos de CADA bobina usada, calcula el
 * costo real (material multicolor + electricidad + maquina + mano de obra),
 * acumula las horas en la impresora y marca la impresion como terminada.
 *
 * Es idempotente: si el consumo ya fue registrado, devuelve la impresion sin tocar stock.
 * Se invoca cada vez que la impresion pasa a estado "terminada" (creacion, edicion,
 * cambio de estado o endpoint explicito).
 */
export async function finalizarImpresion(impresionId, usuarioId = null) {
  const imp = await Impresion.findById(impresionId);
  if (!imp) throw new AppError('Impresion no encontrada', 404, 'NOT_FOUND');
  if (imp.consumoRegistrado) return imp; // ya se descontó: no duplicar

  const lineas = (imp.filamentos || []).filter((f) => f.filamento && f.gramos > 0);
  if (!lineas.length) {
    throw new AppError(
      'Para finalizar la impresión hay que cargar al menos una bobina con los gramos consumidos',
      400, 'NO_FILAMENT'
    );
  }

  // Cargar bobinas y validar disponibilidad ANTES de tocar stock.
  const ids = lineas.map((l) => l.filamento);
  const bobinas = await Filamento.find({ _id: { $in: ids } });
  const byId = new Map(bobinas.map((b) => [b._id.toString(), b]));

  for (const l of lineas) {
    const bobina = byId.get(String(l.filamento));
    if (!bobina) throw new AppError('Bobina no encontrada', 404, 'NOT_FOUND');
    if (l.gramos > bobina.pesoDisponible) {
      throw new AppError(
        `La bobina ${bobina.identificadorBobina} no tiene suficiente material (disponible ${bobina.pesoDisponible} g, requiere ${l.gramos} g)`,
        400, 'INSUFFICIENT_STOCK'
      );
    }
  }

  const [cfg, impresora] = await Promise.all([
    Configuracion.getSingleton(),
    imp.impresora ? Impresora.findById(imp.impresora) : null
  ]);

  const costo = calcularCostoImpresion({
    materiales: lineas.map((l) => {
      const b = byId.get(String(l.filamento));
      return { precioRollo: b.precioCompra, pesoRollo: b.pesoOriginal, gramos: l.gramos };
    }),
    tiempoImpresion: imp.tiempo || 0,
    consumoElectrico: impresora?.consumo ?? cfg.consumoImpresoraDefault,
    precioKwh: cfg.precioKwh,
    costoHoraMaquina: impresora?.costoHora || cfg.costoHoraMaquina,
    manoObra: cfg.manoObraDefault
  });

  return runAtomic(async (session) => {
    // 1. Descontar gramos de cada bobina + movimiento historico
    for (const l of lineas) {
      const bobina = byId.get(String(l.filamento));
      await registrarMovimiento({
        articuloTipo: 'Filamento',
        articuloId: bobina._id,
        articuloNombre: `${bobina.marca || ''} ${bobina.tipo} ${bobina.color || ''}`.trim(),
        tipo: 'consumo',
        cantidad: -l.gramos,
        unidad: 'g',
        referencia: `Impresion #${imp.numero}`,
        refModel: 'Impresion',
        refId: imp._id,
        usuario: usuarioId,
        session
      });
    }

    // 2. Guardar costos y marcar terminada
    imp.costoMaterial = costo.costoMaterial;
    imp.costoTotal = costo.costoTotal;
    imp.consumoRegistrado = true;
    imp.estado = 'terminada';
    if (!imp.fechaFin) imp.fechaFin = new Date();
    await imp.save({ session: session || undefined });

    // 3. Acumular horas de maquina
    if (impresora && imp.tiempo > 0) {
      await Impresora.updateOne(
        { _id: impresora._id },
        { $inc: { horasAcumuladas: imp.tiempo / 60 } },
        session ? { session } : {}
      );
    }

    // 4. Actualizar estado de las bobinas segun disponible
    for (const l of lineas) {
      const bobina = await Filamento.findById(l.filamento).session(session || null);
      const nuevoEstado = bobina.pesoDisponible <= 0 ? 'agotada' : 'en_uso';
      if (bobina.estado !== nuevoEstado) {
        await Filamento.updateOne({ _id: bobina._id }, { estado: nuevoEstado }, session ? { session } : {});
      }
    }

    return imp;
  });
}
