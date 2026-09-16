import { Compra } from '../models/Compra.js';
import { Insumo } from '../models/Insumo.js';
import { Filamento } from '../models/Filamento.js';
import { registrarMovimiento } from './stockService.js';
import { runAtomic } from '../utils/transaction.js';
import { AppError } from '../utils/AppError.js';

// Las bobinas de filamento son siempre de 1kg: en un item de compra tipo Filamento,
// "cantidad" es la cantidad de BOBINAS (y "precioUnitario" el precio de la bobina
// completa), no gramos sueltos. Se convierte a gramos solo al impactar el stock
// (pesoDisponible), que se mide en gramos.
const GRAMOS_POR_BOBINA = 1000;

/** Valida los items y calcula cantidad/subtotal/total. No toca stock. */
function construirItems(items) {
  const compraItems = [];
  let total = 0;
  for (const item of items) {
    const cantidad = Number(item.cantidad) || 0;
    const precioUnitario = Number(item.precioUnitario) || 0;
    if (cantidad <= 0) throw new AppError('Cantidad invalida', 400, 'VALIDATION_ERROR');

    const subtotal = cantidad * precioUnitario;
    total += subtotal;

    compraItems.push({
      articuloTipo: item.articuloTipo,
      articuloId: item.articuloId || null,
      descripcion: item.descripcion,
      cantidad,
      precioUnitario,
      subtotal
    });
  }
  return { compraItems, total };
}

/**
 * Suma, por articulo, cuanto cambiaria su stock si se revierten `viejos` y se
 * aplican `nuevos` (o solo una de las dos listas, la otra vacia). Positivo en
 * gramos/unidades para Filamento/Insumo respectivamente.
 */
function netoPorArticulo(viejos, nuevos) {
  const neto = new Map(); // "Tipo:id" -> variacion neta
  const acumular = (items, signo) => {
    for (const item of items) {
      if (!item.articuloId) continue;
      const esFilamento = item.articuloTipo === 'Filamento';
      const delta = (esFilamento ? item.cantidad * GRAMOS_POR_BOBINA : item.cantidad) * signo;
      const key = `${item.articuloTipo}:${item.articuloId}`;
      neto.set(key, (neto.get(key) || 0) + delta);
    }
  };
  acumular(viejos, -1);
  acumular(nuevos, 1);
  return neto;
}

/**
 * Corta la edicion ANTES de escribir nada si dejaria el stock de algun articulo
 * en negativo (tipico cuando ya se consumio parte de lo que esta compra habia
 * ingresado, y la edicion reduce la cantidad comprada).
 */
async function validarStockResultante(neto, session) {
  for (const [key, delta] of neto) {
    if (delta >= 0) continue; // un aumento neto nunca deja nada en negativo
    const [tipo, id] = key.split(':');
    const esFilamento = tipo === 'Filamento';
    const Model = esFilamento ? Filamento : Insumo;
    const campo = esFilamento ? 'pesoDisponible' : 'stock';
    const doc = await Model.findById(id).session(session || null);
    if (!doc) continue; // el articulo se pudo haber borrado; no bloquear la edicion por eso
    if (doc[campo] + delta < 0) {
      const nombre = esFilamento ? doc.identificadorBobina : doc.nombre;
      throw new AppError(
        `No se puede guardar: dejaria el stock de "${nombre}" en negativo (ya se consumio parte de lo que esta compra habia ingresado)`,
        400,
        'NEGATIVE_STOCK'
      );
    }
  }
}

/**
 * Aplica (signo=1) o revierte (signo=-1) el efecto de stock de una lista de items
 * ya construida (con cantidad/subtotal calculados). Ademas de pesoDisponible,
 * ajusta pesoOriginal y precioCompra del Filamento en la misma proporcion: un
 * mismo registro puede acumular varias bobinas fisicas compradas en distintos
 * momentos (y a distinto precio), y esos dos campos son los que hacen que el
 * % disponible y el costo promedio por gramo sigan siendo correctos.
 */
async function aplicarStockItems(compraItems, compraId, { tipo, referencia, usuarioId, session, signo = 1 }) {
  const sessOpt = session ? { session } : {};
  for (const item of compraItems) {
    if (!item.articuloId) continue;
    const esFilamento = item.articuloTipo === 'Filamento';
    const gramos = item.cantidad * GRAMOS_POR_BOBINA;

    await registrarMovimiento({
      articuloTipo: item.articuloTipo,
      articuloId: item.articuloId,
      articuloNombre: item.descripcion,
      tipo,
      cantidad: (esFilamento ? gramos : item.cantidad) * signo,
      unidad: esFilamento ? 'g' : 'unidad',
      referencia,
      refModel: 'Compra',
      refId: compraId,
      usuario: usuarioId,
      session
    });

    if (esFilamento) {
      await Filamento.updateOne(
        { _id: item.articuloId },
        { $inc: { pesoOriginal: gramos * signo, precioCompra: item.subtotal * signo } },
        sessOpt
      );
    }
  }
}

/**
 * Registra una compra: crea el comprobante, aumenta el stock de cada item
 * (Insumo -> stock, Filamento -> pesoDisponible) y deja el movimiento historico.
 * El total se recalcula en el servidor a partir de los items.
 */
export async function registrarCompra(payload, usuarioId = null) {
  const {
    proveedor = null,
    fecha = new Date(),
    items = [],
    formaPago = 'efectivo',
    observaciones = ''
  } = payload;

  if (!items.length) throw new AppError('La compra debe tener al menos un item', 400, 'EMPTY_PURCHASE');

  return runAtomic(async (session) => {
    const sessOpt = session ? { session } : {};
    const { compraItems, total } = construirItems(items);

    const [compra] = await Compra.create([{
      proveedor, fecha, items: compraItems, total, formaPago, observaciones, usuario: usuarioId
    }], sessOpt);

    await aplicarStockItems(compraItems, compra._id, { tipo: 'compra', referencia: 'Compra', usuarioId, session, signo: 1 });

    return compra;
  });
}

/**
 * Edita una compra ya registrada. Se trata como "deshacer el efecto de stock de
 * los items anteriores y aplicar el de los nuevos" (en vez de comparar item por
 * item): es mas simple y cubre cualquier cambio (cantidad, precio, o el articulo
 * al que apunta el item) sin casos particulares. Antes de escribir nada, valida
 * que ningun articulo quede con stock negativo.
 */
export async function actualizarCompra(id, payload, usuarioId = null) {
  const {
    proveedor = null,
    fecha = new Date(),
    items = [],
    formaPago = 'efectivo',
    observaciones = ''
  } = payload;

  if (!items.length) throw new AppError('La compra debe tener al menos un item', 400, 'EMPTY_PURCHASE');

  return runAtomic(async (session) => {
    const compraActual = await Compra.findById(id).session(session || null);
    if (!compraActual) throw new AppError('Compra no encontrada', 404, 'NOT_FOUND');

    const { compraItems, total } = construirItems(items);

    const neto = netoPorArticulo(compraActual.items, compraItems);
    await validarStockResultante(neto, session);

    await aplicarStockItems(compraActual.items, compraActual._id, {
      tipo: 'correccion', referencia: 'Edicion de compra (reversion)', usuarioId, session, signo: -1
    });
    await aplicarStockItems(compraItems, compraActual._id, {
      tipo: 'compra', referencia: 'Compra (editada)', usuarioId, session, signo: 1
    });

    compraActual.proveedor = proveedor;
    compraActual.fecha = fecha;
    compraActual.items = compraItems;
    compraActual.total = total;
    compraActual.formaPago = formaPago;
    compraActual.observaciones = observaciones;
    await compraActual.save(session ? { session } : {});

    return compraActual;
  });
}
