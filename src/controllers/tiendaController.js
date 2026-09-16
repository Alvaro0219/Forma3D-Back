import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, buildPaginatedResponse } from '../utils/pagination.js';
import { queryString, containsRegex } from '../utils/queryParams.js';
import { Producto } from '../models/Producto.js';
import { Configuracion } from '../models/Configuracion.js';
import { Filamento } from '../models/Filamento.js';

const DISPONIBILIDAD_TEXTO = {
  disponible: 'Disponible',
  pocas_unidades: 'Pocas unidades',
  sin_stock: 'Sin stock',
  a_pedido: 'A pedido'
};

/**
 * Deriva la disponibilidad publica SIN revelar cantidades exactas.
 * Respeta un override manual (disponibilidadTienda != 'auto').
 */
function calcularDisponibilidad(producto, mostrar, umbral = 0) {
  if (!mostrar) return null;
  if (producto.disponibilidadTienda && producto.disponibilidadTienda !== 'auto') {
    return DISPONIBILIDAD_TEXTO[producto.disponibilidadTienda] || null;
  }
  if (producto.stock <= 0) return DISPONIBILIDAD_TEXTO.sin_stock;
  if (umbral > 0 && producto.stock <= umbral) return DISPONIBILIDAD_TEXTO.pocas_unidades;
  return DISPONIBILIDAD_TEXTO.disponible;
}

/**
 * Proyeccion publica de un producto: SOLO datos permitidos en la tienda.
 * Nunca expone peso, tiempo, costo, ganancia, margen, proveedor ni stock exacto.
 */
function toPublic(producto, mostrarDisp, umbral = 0) {
  return {
    id: producto._id,
    nombre: producto.nombre,
    codigo: producto.sku,
    descripcion: producto.descripcion,
    categoria: producto.categoria,
    material: producto.material,
    precio: producto.precioVenta,
    fotoPrincipal: producto.fotoPrincipal,
    fotos: producto.fotos,
    disponibilidad: calcularDisponibilidad(producto, mostrarDisp, umbral)
  };
}

// ─── Catalogo publico ───────────────────────────────────────
export const listCatalogo = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, { defaultLimit: 24, maxLimit: 60 });
  const cfg = await Configuracion.getSingleton();

  // Endpoint publico sin auth: todo lo que venga por query se lee como escalar
  // y el texto de busqueda se escapa antes de usarse como regex.
  const filter = { visibleEnTienda: true, isActive: { $ne: false } };
  const q = queryString(req, 'q');
  if (q) filter.$or = [
    { nombre: containsRegex(q) },
    { sku: containsRegex(q) },
    { descripcion: containsRegex(q) }
  ];
  const categoria = queryString(req, 'categoria');
  const material = queryString(req, 'material');
  if (categoria) filter.categoria = categoria;
  if (material) filter.material = material;

  const [items, total] = await Promise.all([
    Producto.find(filter).sort({ nombre: 1 }).skip(skip).limit(limit).lean(),
    Producto.countDocuments(filter)
  ]);

  const publicItems = items
    .map((p) => toPublic(p, cfg.mostrarDisponibilidad, cfg.umbralPocasUnidades))
    .filter((p) => !(req.query.soloDisponibles === 'true' && p.disponibilidad === DISPONIBILIDAD_TEXTO.sin_stock));

  return ok(res, buildPaginatedResponse(publicItems, total, { page, limit }));
});

export const getProductoPublico = asyncHandler(async (req, res) => {
  const cfg = await Configuracion.getSingleton();
  const producto = await Producto.findOne({ _id: req.params.id, visibleEnTienda: true, isActive: { $ne: false } }).lean();
  if (!producto) throw new AppError('Producto no encontrado', 404, 'NOT_FOUND');
  return ok(res, toPublic(producto, cfg.mostrarDisponibilidad, cfg.umbralPocasUnidades));
});

/** Info publica de la tienda: nombre, filtros disponibles, whatsapp configurado. */
export const getTiendaInfo = asyncHandler(async (req, res) => {
  const cfg = await Configuracion.getSingleton();
  const [categorias, materiales, coloresDisponibles] = await Promise.all([
    Producto.distinct('categoria', { visibleEnTienda: true, isActive: { $ne: false } }),
    Producto.distinct('material', { visibleEnTienda: true, isActive: { $ne: false } }),
    // Colores que realmente hay en stock (no los que carga cada producto a mano):
    // solo el color, nunca marca/precio/proveedor/peso de la bobina.
    Filamento.distinct('color', { pesoDisponible: { $gt: 0 } })
  ]);
  return ok(res, {
    nombreNegocio: cfg.nombreNegocio,
    logo: cfg.logo,
    moneda: cfg.moneda,
    whatsappConfigurado: !!cfg.whatsappNumero,
    categorias: categorias.filter(Boolean),
    materiales: materiales.filter(Boolean),
    coloresDisponibles: coloresDisponibles.filter(Boolean)
  });
});

/**
 * Checkout por WhatsApp: recalcula el carrito con precios de la base (nunca confia
 * en el precio enviado por el cliente), arma el mensaje segun la plantilla y devuelve
 * la URL de wa.me. NO persiste el pedido ni procesa pagos.
 */
export const checkout = asyncHandler(async (req, res) => {
  const cfg = await Configuracion.getSingleton();
  if (!cfg.whatsappNumero) throw new AppError('La tienda no tiene WhatsApp configurado', 400, 'NO_WHATSAPP');

  const { items = [], nombre = '', telefono = '', notas = '', email = '', direccion = '' } = req.validated;
  if (!items.length) throw new AppError('El carrito esta vacio', 400, 'EMPTY_CART');

  const ids = items.map((i) => i.producto);
  const productos = await Producto.find({ _id: { $in: ids }, visibleEnTienda: true, isActive: { $ne: false } }).lean();
  const byId = new Map(productos.map((p) => [p._id.toString(), p]));

  const lineas = [];
  let total = 0;
  const resumen = [];

  for (const item of items) {
    const prod = byId.get(String(item.producto));
    if (!prod) throw new AppError(`Producto no disponible: ${item.producto}`, 404, 'NOT_FOUND');
    const cantidad = Math.max(parseInt(item.cantidad, 10) || 1, 1);
    const subtotal = prod.precioVenta * cantidad;
    total += subtotal;
    lineas.push(`- ${cantidad}x ${prod.nombre} (${prod.sku}) = ${formatMoney(subtotal, cfg.moneda)}`);
    resumen.push({ producto: prod.nombre, codigo: prod.sku, cantidad, precioUnitario: prod.precioVenta, subtotal });
  }

  const mensaje = (cfg.plantillaMensaje || '')
    .replace('{items}', lineas.join('\n'))
    .replace('{total}', formatMoney(total, cfg.moneda))
    .replace('{nombre}', nombre)
    .replace('{telefono}', telefono)
    .replace('{notas}', notas || '-')
    .replace('{email}', email || '-')
    .replace('{direccion}', direccion || '-');

  const url = `https://wa.me/${cfg.whatsappNumero}?text=${encodeURIComponent(mensaje)}`;

  return ok(res, { url, mensaje, resumen, total });
});

function formatMoney(n, moneda = 'ARS') {
  return `${moneda} ${Number(n || 0).toLocaleString('es-AR')}`;
}
