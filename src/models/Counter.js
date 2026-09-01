import mongoose from 'mongoose';

/**
 * Contadores para numeracion automatica (pedidos, ventas, impresiones).
 * getNextSequence('pedido') devuelve un entero incremental atomico.
 */
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // nombre de la secuencia
  seq: { type: Number, default: 0 }
});

export const Counter = mongoose.model('Counter', CounterSchema);

export async function getNextSequence(name, session = null) {
  const opts = { new: true, upsert: true };
  if (session) opts.session = session;
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    opts
  );
  return counter.seq;
}
