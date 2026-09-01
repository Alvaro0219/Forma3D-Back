import { Router } from 'express';
import authRoutes from './auth.routes.js';
import clienteRoutes from './cliente.routes.js';
import proveedorRoutes from './proveedor.routes.js';
import productoRoutes from './producto.routes.js';
import filamentoRoutes from './filamento.routes.js';
import insumoRoutes from './insumo.routes.js';
import compraRoutes from './compra.routes.js';
import pedidoRoutes from './pedido.routes.js';
import ventaRoutes from './venta.routes.js';
import costoRoutes from './costo.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import configRoutes from './config.routes.js';
import tiendaRoutes from './tienda.routes.js';
import impresionRoutes from './impresion.routes.js';
import archivoRoutes from './archivo.routes.js';
import uploadsRoutes from './uploads.routes.js';

const router = Router();

// Administracion (privado)
router.use('/auth', authRoutes);
router.use('/clientes', clienteRoutes);
router.use('/proveedores', proveedorRoutes);
router.use('/productos', productoRoutes);
router.use('/filamentos', filamentoRoutes);
router.use('/insumos', insumoRoutes);
router.use('/compras', compraRoutes);
router.use('/pedidos', pedidoRoutes);
router.use('/ventas', ventaRoutes);
router.use('/costos', costoRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/config', configRoutes);
router.use('/impresiones', impresionRoutes);
router.use('/archivos', archivoRoutes);
router.use('/uploads', uploadsRoutes);

// Tienda publica (sin auth)
router.use('/tienda', tiendaRoutes);

export default router;
