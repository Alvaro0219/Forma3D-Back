# Backend — Sistema de gestión impresión 3D

API REST (Node.js + Express + MongoDB) para la administración del emprendimiento y la tienda pública.
Sigue la arquitectura de referencia: capas `routes → controllers → services → models`, respuestas
`{ success, data }` / `{ success, error }`, validación Joi por ruta, JWT access+refresh y rate limiting.

> Sistema **single-tenant** (un solo negocio): no usa `organizationId`. Los datos sensibles
> (costos, compras, configuración, calculadora) están restringidos al rol `admin`.

## Requisitos

- Node.js 18+
- MongoDB (local o [MongoDB Atlas](https://mongodb.com/atlas))

> **Transacciones:** las operaciones de venta/compra usan transacciones cuando el servidor las
> soporta (Atlas / replica set). En un `mongod` standalone local hay *fallback* automático sin
> transacción para no romper el flujo de desarrollo (ver `src/utils/transaction.js`). Para máxima
> integridad en producción, usar Atlas (M0 free ya es replica set).

## Puesta en marcha

```bash
npm install
cp .env.example .env      # y editar los valores
npm run dev               # arranca en http://localhost:4000
```

Al arrancar, si la base no tiene usuarios y están definidas las variables `BOOTSTRAP_ADMIN_*`,
se crea automáticamente el primer administrador.

Healthcheck: `GET http://localhost:4000/health` → `{ "ok": true }`

## Variables de entorno

Ver `.env.example`. Críticas en producción: `MONGO_URL`, `JWT_SECRET`, `REFRESH_SECRET`
(el proceso falla al arrancar si faltan con `NODE_ENV=production`).

**Cloudflare R2 (subida de imágenes/archivos 3D):** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`. Son **`.required()` solo en producción**
(en desarrollo son opcionales, pero necesarias para probar subidas). `R2_ACCESS_KEY_ID` y
`R2_SECRET_ACCESS_KEY` se obtienen creando un **R2 API Token** (permiso *Object Read & Write*) en el
dashboard de Cloudflare. `R2_PUBLIC_URL` es la URL pública del bucket (en local, el subdominio
`https://pub-xxxx.r2.dev`; en producción, un dominio propio vía Cloudflare).

> El bucket R2 necesita una **CORS policy** que permita `PUT` y el header `Content-Type` desde el
> origen del frontend (`http://localhost:5173` en local), o la subida directa del navegador falla.

## Estructura

```
src/
├── app.js              # entry point + middlewares + error handler global
├── config/             # env.js (Joi al arranque) + db.js
├── models/             # 1 archivo = 1 entidad (Mongoose)
├── controllers/        # validan y responden; sin try/catch (asyncHandler)
├── services/           # lógica de negocio: costos, ventas, compras, stock, dashboard, auth
├── routes/             # endpoints + cadena de middlewares
├── schemas/            # validación Joi por entidad
├── middlewares/        # auth (authenticate/requireRole), validate, rateLimit
└── utils/              # response, asyncHandler, AppError, pagination, transaction, crudController
```

## Endpoints principales (bajo `/api`)

### Administración (requiere `Authorization: Bearer <token>`)

| Recurso | Rutas |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `*/auth/users` (admin) |
| Dashboard | `GET /dashboard/resumen`, `GET /dashboard/series?dias=30` |
| Clientes | `GET/POST /clientes`, `GET/PUT/DELETE /clientes/:id` (con historial en el detalle) |
| Proveedores | `GET/POST /proveedores`, `GET/PUT/DELETE /proveedores/:id` |
| Productos | `GET/POST /productos`, `GET/PUT/DELETE /productos/:id`, `GET /productos/next-sku?categoria=X` (previsualiza el SKU) |
| Filamentos | `GET/POST /filamentos`, `POST /filamentos/:id/consumir`, `GET /filamentos/:id/movimientos` |
| Insumos | `GET/POST /insumos`, `POST /insumos/:id/ajuste`, `GET /insumos/:id/movimientos` |
| Compras (admin) | `GET/POST /compras`, `GET /compras/:id` |
| Pedidos | `GET/POST /pedidos`, `PUT /pedidos/:id`, `PATCH /pedidos/:id/estado` |
| Ventas | `GET/POST /ventas`, `POST /ventas/desde-pedido`, `PATCH /ventas/:id/anular` |
| Costos (admin) | `POST /costos/calcular` |
| Configuración | `GET /config`, `PUT /config` (admin), `*/config/impresoras` |
| Impresiones | `GET/POST/PUT/DELETE /impresiones`, `POST /impresiones/:id/consumo`. Pasar a `terminada` (por PUT o por este endpoint) descuenta **todas** las bobinas usadas, calcula el costo real y suma horas a la impresora |
| Archivos 3D | `GET/POST/PUT/DELETE /archivos`, `POST /archivos/:id/versiones`, `PATCH /archivos/:id/versiones/:numero/actual` |
| Uploads | `POST /uploads/presign` (autenticado + `uploadLimiter`) → `{ uploadUrl, publicUrl, key }`. Body: `{ fileName, contentType, folder, kind: 'image'\|'model' }`. El archivo se sube directo a R2, no a este endpoint. |

### Tienda pública (sin autenticación)

| Ruta | Descripción |
|---|---|
| `GET /tienda/info` | Nombre del negocio, filtros disponibles, si hay WhatsApp configurado |
| `GET /tienda/productos` | Catálogo (solo datos públicos, disponibilidad sin cantidades) |
| `GET /tienda/productos/:id` | Detalle público de un producto |
| `POST /tienda/checkout` | Recalcula el carrito y devuelve la URL de `wa.me` con el mensaje del pedido. **No persiste nada.** |

## Reglas de negocio clave

- **Costos:** fórmulas parametrizables desde `Configuracion` (precio kWh, costo/hora máquina, etc.).
  Ver `src/services/costoService.js`.
- **Ventas:** recalculan precio y costo desde la base (nunca confían en el cliente), descuentan stock
  y calculan ganancia/margen. Idempotencia opcional por `uuid`.
- **Compras:** aumentan stock (insumo → `stock`, filamento → `pesoDisponible`) y dejan movimiento.
- **Productos:** la **categoría** viene de la lista precargada en `Configuracion.categorias` y define el **SKU automático** (`Varios` → `VAR-001`, secuencia propia por prefijo). Los productos no tienen stock mínimo. `Producto.insumos` lista los accesorios que consume cada unidad.
- **Ventas:** además del stock del producto, descuentan los **insumos** asociados (`cantidad × unidades vendidas`) en la misma operación atómica.
- **Impresiones:** se cargan con producto + impresora + **varias bobinas** (multicolor, gramos por bobina) + piezas + un único tiempo real. Al pasar a **terminada** se descuentan los gramos de cada bobina, se calcula el costo real completo (material multicolor + electricidad + máquina + mano de obra) y se acumulan las horas de la impresora. Idempotente por `consumoRegistrado`.
- **Archivos 3D:** biblioteca con versionado embebido (v1, v2…); una única versión marcada `esActual`. Los
  archivos STL/3MF y las fotos se guardan en R2; el documento solo persiste sus URLs.
- **Almacenamiento (R2):** las imágenes/archivos nunca se guardan en Mongo, solo su URL pública. El backend
  firma la subida (`services/storageService.js`) pero no recibe el archivo. Ver sección de variables de entorno.
- **Separación público/interno:** la tienda nunca expone peso, tiempo, costo, margen, proveedor ni
  stock exacto (ver `src/controllers/tiendaController.js`).
