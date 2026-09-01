import mongoose from 'mongoose';

/**
 * Detecta si el error se debe a que el servidor Mongo no soporta transacciones
 * (mongod standalone en desarrollo local, sin replica set).
 */
function isNoTransactionSupport(err) {
  const msg = String(err?.message || '').toLowerCase();
  return (
    err?.code === 20 ||
    err?.codeName === 'IllegalOperation' ||
    msg.includes('transaction numbers are only allowed on a replica set') ||
    msg.includes('transactions are not supported')
  );
}

/**
 * Ejecuta `work(session)` dentro de una transaccion cuando el servidor lo soporta
 * (Atlas / replica set, produccion). En un mongod standalone (dev) hace fallback a
 * ejecucion sin sesion para no romper el flujo local.
 *
 * work debe usar `{ session }` en cada operacion de escritura cuando session != null.
 */
export async function runAtomic(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    if (isNoTransactionSupport(err)) {
      try { await session.endSession(); } catch { /* noop */ }
      return work(null); // fallback sin transaccion (dev standalone)
    }
    throw err;
  } finally {
    try { await session.endSession(); } catch { /* noop */ }
  }
}
