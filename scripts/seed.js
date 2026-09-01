/**
 * Seed de datos de ejemplo para probar el sistema.
 *
 * Uso:  npm run seed          (desde backend/)
 *
 * Es re-ejecutable de forma segura:
 *  - Entidades con clave natural (email, sku, identificadorBobina, nombre) se hacen upsert.
 *  - Pedido / venta / compra (numerados y transaccionales) solo se crean si no existe ninguno,
 *    para no acumular duplicados en cada corrida.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDb } from '../src/config/db.js';

import { User } from '../src/models/User.js';
import { Configuracion } from '../src/models/Configuracion.js';
import { Proveedor } from '../src/models/Proveedor.js';
import { Cliente } from '../src/models/Cliente.js';
import { Producto } from '../src/models/Producto.js';
import { Filamento } from '../src/models/Filamento.js';
import { Insumo } from '../src/models/Insumo.js';
import { Impresora } from '../src/models/Impresora.js';
import { Archivo3D } from '../src/models/Archivo3D.js';
import { Pedido } from '../src/models/Pedido.js';
import { Venta } from '../src/models/Venta.js';
import { Compra } from '../src/models/Compra.js';

import { registrarVenta } from '../src/services/ventaService.js';
import { registrarCompra } from '../src/services/compraService.js';

const log = (...a) => console.log('[seed]', ...a);

async function upsert(Model, filter, data) {
  return Model.findOneAndUpdate(filter, { $setOnInsert: data }, { new: true, upsert: true });
}

async function run() {
  await connectDb();
  log('Conectado a MongoDB');

  // ─── Usuarios ───────────────────────────────────────────
  let admin = await User.findOne({ email: 'admin@impresion3d.com' });
  if (!admin) {
    admin = await User.create({
      name: 'Administrador',
      email: 'admin@impresion3d.com',
      passwordHash: await bcrypt.hash('admin1234', 10),
      role: 'admin',
      permisos: { verCostos: true }
    });
    log('Admin creado -> admin@impresion3d.com / admin1234');
  } else {
    log('Admin ya existía -> admin@impresion3d.com');
  }

  let empleado = await User.findOne({ email: 'empleado@impresion3d.com' });
  if (!empleado) {
    empleado = await User.create({
      name: 'Empleado Demo',
      email: 'empleado@impresion3d.com',
      passwordHash: await bcrypt.hash('empleado1234', 10),
      role: 'empleado',
      permisos: { verCostos: false }
    });
    log('Empleado creado -> empleado@impresion3d.com / empleado1234');
  }

  // ─── Configuración (singleton) ──────────────────────────
  const cfg = await Configuracion.getSingleton();
  Object.assign(cfg, {
    nombreNegocio: '3D Makers',
    telefono: '3511234567',
    moneda: 'ARS',
    precioKwh: 60,
    costoHoraMaquina: 300,
    consumoImpresoraDefault: 0.15,
    margenDefault: 60,
    whatsappNumero: '5493511234567'
  });
  await cfg.save();
  log('Configuración lista (WhatsApp 5493511234567)');

  // ─── Proveedores ────────────────────────────────────────
  const provFilamentos = await upsert(Proveedor, { nombre: 'FilaStore' }, {
    nombre: 'FilaStore', telefono: '3517778888', email: 'ventas@filastore.com', notas: 'Filamentos PLA/PETG'
  });
  const provInsumos = await upsert(Proveedor, { nombre: 'InsumosYA' }, {
    nombre: 'InsumosYA', telefono: '3516665555', notas: 'Imanes, aros y varios'
  });
  log('Proveedores: FilaStore, InsumosYA');

  // ─── Clientes ───────────────────────────────────────────
  const cliente1 = await upsert(Cliente, { nombre: 'Juan Pérez' }, { nombre: 'Juan Pérez', telefono: '3511111111', email: 'juan@mail.com' });
  const cliente2 = await upsert(Cliente, { nombre: 'María Gómez' }, { nombre: 'María Gómez', telefono: '3512222222' });
  const cliente3 = await upsert(Cliente, { nombre: 'Comercio El Sol' }, { nombre: 'Comercio El Sol', telefono: '3513333333', notas: 'Compra por cantidad' });
  log('Clientes: Juan Pérez, María Gómez, Comercio El Sol');

  // ─── Impresora ──────────────────────────────────────────
  await upsert(Impresora, { modelo: 'Ender 3 V2' }, { modelo: 'Ender 3 V2', consumo: 0.15, costoHora: 300, estado: 'activa', horasAcumuladas: 120 });
  log('Impresora: Ender 3 V2');

  // ─── Filamentos (bobinas) ───────────────────────────────
  const bobinaPLA = await upsert(Filamento, { identificadorBobina: 'PLA-ROJO-001' }, {
    identificadorBobina: 'PLA-ROJO-001', marca: 'Grilon3', tipo: 'PLA', color: 'Rojo',
    pesoOriginal: 1000, pesoDisponible: 1000, precioCompra: 25000, proveedor: provFilamentos._id, estado: 'nueva'
  });
  await upsert(Filamento, { identificadorBobina: 'PETG-NEGRO-001' }, {
    identificadorBobina: 'PETG-NEGRO-001', marca: 'Grilon3', tipo: 'PETG', color: 'Negro',
    pesoOriginal: 1000, pesoDisponible: 750, precioCompra: 30000, proveedor: provFilamentos._id, estado: 'en_uso'
  });
  log('Filamentos: PLA Rojo (1kg), PETG Negro (750g)');

  // ─── Insumos ────────────────────────────────────────────
  await upsert(Insumo, { nombre: 'Imán 8mm' }, { nombre: 'Imán 8mm', categoria: 'imanes', unidad: 'unidad', stock: 200, stockMinimo: 50, costo: 30, proveedor: provInsumos._id });
  await upsert(Insumo, { nombre: 'Aro de llavero' }, { nombre: 'Aro de llavero', categoria: 'aros', unidad: 'unidad', stock: 40, stockMinimo: 100, costo: 15, proveedor: provInsumos._id });
  await upsert(Insumo, { nombre: 'Vaso térmico' }, { nombre: 'Vaso térmico', categoria: 'vasos', unidad: 'unidad', stock: 25, stockMinimo: 10, costo: 800, proveedor: provInsumos._id });
  log('Insumos: Imán 8mm (200), Aro llavero (40, bajo mínimo), Vaso térmico (25)');

  // ─── Productos ──────────────────────────────────────────
  const prodLlavero = await upsert(Producto, { sku: 'LL-001' }, {
    nombre: 'Llavero personalizado', sku: 'LL-001', descripcion: 'Llavero PLA con nombre a elección',
    categoria: 'Llaveros', material: 'PLA', colores: ['Rojo', 'Negro', 'Azul'],
    precioVenta: 1500, stock: 30, stockMinimo: 5, pesoInterno: 12, tiempoImpresion: 25,
    costoFabricacion: 500, visibleEnTienda: true
  });
  const prodMate = await upsert(Producto, { sku: 'MT-001' }, {
    nombre: 'Mate 3D', sku: 'MT-001', descripcion: 'Mate impreso en PETG, apto uso diario',
    categoria: 'Utilitario', material: 'PETG', colores: ['Negro'],
    precioVenta: 6000, stock: 8, stockMinimo: 3, pesoInterno: 90, tiempoImpresion: 180,
    costoFabricacion: 2200, visibleEnTienda: true
  });
  const prodMaceta = await upsert(Producto, { sku: 'MC-001' }, {
    nombre: 'Maceta geométrica', sku: 'MC-001', descripcion: 'Maceta decorativa low-poly',
    categoria: 'Decoracion', material: 'PLA', colores: ['Blanco', 'Verde'],
    precioVenta: 3500, stock: 2, stockMinimo: 4, pesoInterno: 60, tiempoImpresion: 120,
    costoFabricacion: 1300, visibleEnTienda: true, disponibilidadTienda: 'auto'
  });
  await upsert(Producto, { sku: 'PR-001' }, {
    nombre: 'Prototipo cliente (privado)', sku: 'PR-001', descripcion: 'No visible en tienda',
    categoria: 'Personalizado', material: 'PLA', precioVenta: 9000, stock: 0,
    costoFabricacion: 3000, visibleEnTienda: false
  });
  log('Productos: Llavero, Mate 3D, Maceta (bajo mínimo), Prototipo (oculto)');

  // ─── Archivo 3D con versiones ───────────────────────────
  const archivoExiste = await Archivo3D.findOne({ codigo: 'STL-LL-001' });
  if (!archivoExiste) {
    await Archivo3D.create({
      nombre: 'Llavero base', codigo: 'STL-LL-001', categoria: 'Llaveros', producto: prodLlavero._id,
      descripcion: 'Modelo base para llaveros personalizados', pesoImpresion: 12, tiempoImpresion: 25,
      versiones: [
        { numero: 1, cambios: 'Versión inicial', archivoStl: 'llavero_v1.stl', esActual: false },
        { numero: 2, cambios: 'Texto más profundo', archivoStl: 'llavero_v2.stl', esActual: true }
      ]
    });
    log('Archivo 3D: Llavero base (v1, v2)');
  }

  // ─── Compra (suma stock real) ───────────────────────────
  if (await Compra.countDocuments() === 0) {
    await registrarCompra({
      proveedor: provInsumos._id,
      comprobante: 'FC-A-0001',
      formaPago: 'transferencia',
      items: [
        { articuloTipo: 'Filamento', articuloId: bobinaPLA._id, descripcion: 'PLA Rojo 1kg (recarga)', cantidad: 500, precioUnitario: 12.5 },
        { articuloTipo: 'Insumo', descripcion: 'Imanes 8mm x100', cantidad: 100, precioUnitario: 25 }
      ]
    }, admin._id);
    log('Compra registrada (FC-A-0001) — sumó 500g a PLA Rojo');
  }

  // ─── Pedido ─────────────────────────────────────────────
  let pedido = await Pedido.findOne();
  if (!pedido) {
    // Numeración automática vía Counter la maneja el controller; acá creamos directo con numero 1.
    const { getNextSequence } = await import('../src/models/Counter.js');
    const numero = await getNextSequence('pedido');
    pedido = await Pedido.create({
      numero,
      cliente: cliente1._id,
      clienteNombre: cliente1.nombre,
      items: [
        { producto: prodLlavero._id, nombre: prodLlavero.nombre, cantidad: 2, precioUnitario: 1500, subtotal: 3000 },
        { producto: prodMaceta._id, nombre: prodMaceta.nombre, cantidad: 1, precioUnitario: 3500, subtotal: 3500 }
      ],
      total: 6500,
      estado: 'Preparando',
      notas: 'Entrega en la semana'
    });
    log(`Pedido #${numero} creado (Juan Pérez, estado Preparando)`);
  }

  // ─── Ventas (recalculan costo/ganancia y descuentan stock) ─
  if (await Venta.countDocuments() === 0) {
    const v1 = await registrarVenta({
      cliente: cliente2._id,
      clienteNombre: cliente2.nombre,
      formaPago: 'efectivo',
      descontarStock: true,
      items: [{ producto: prodLlavero._id, cantidad: 3 }]
    }, admin._id);
    log(`Venta #${v1.numero}: total ${v1.total}, ganancia ${v1.ganancia} (margen ${v1.margen}%)`);

    const v2 = await registrarVenta({
      cliente: cliente3._id,
      clienteNombre: cliente3.nombre,
      formaPago: 'transferencia',
      descontarStock: true,
      items: [
        { producto: prodMate._id, cantidad: 1 },
        { producto: prodLlavero._id, cantidad: 2 }
      ]
    }, admin._id);
    log(`Venta #${v2.numero}: total ${v2.total}, ganancia ${v2.ganancia} (margen ${v2.margen}%)`);
  }

  // ─── Consumo de filamento (descuenta gramos) ────────────
  const pla = await Filamento.findById(bobinaPLA._id);
  if (pla && pla.pesoDisponible > 800) {
    const { registrarMovimiento } = await import('../src/services/stockService.js');
    await registrarMovimiento({
      articuloTipo: 'Filamento', articuloId: pla._id,
      articuloNombre: `${pla.marca} ${pla.tipo} ${pla.color}`,
      tipo: 'consumo', cantidad: -168, unidad: 'g', referencia: 'Impresión demo', usuario: admin._id
    });
    log('Consumo de 168g de PLA Rojo registrado');
  }

  log('✔ Seed completado');
  await mongoose.connection.close();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('[seed] ERROR:', err);
  try { await mongoose.connection.close(); } catch { /* noop */ }
  process.exit(1);
});
