import { Venta } from '../models/Venta.js';
import { Compra } from '../models/Compra.js';
import { Pedido } from '../models/Pedido.js';
import { Filamento } from '../models/Filamento.js';
import { Insumo } from '../models/Insumo.js';
import { Impresion } from '../models/Impresion.js';

function startOf(period) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === 'week') {
    const day = d.getDay() || 7; // lunes = 1
    d.setDate(d.getDate() - (day - 1));
  } else if (period === 'month') {
    d.setDate(1);
  }
  return d;
}

async function sumVentas(desde) {
  const agg = await Venta.aggregate([
    { $match: { estado: 'completada', fecha: { $gte: desde } } },
    { $group: { _id: null, total: { $sum: '$total' }, ganancia: { $sum: '$ganancia' }, count: { $sum: 1 } } }
  ]);
  return agg[0] || { total: 0, ganancia: 0, count: 0 };
}

export async function getResumen() {
  const hoy = startOf('day');
  const semana = startOf('week');
  const mes = startOf('month');

  const [
    ventasHoy, ventasSemana, ventasMes,
    gastosMesAgg,
    pedidosPendientes, impresionesEnCurso, impresionesRealizadas,
    stockCriticoInsumos, proximasEntregas,
    gramosMesAgg
  ] = await Promise.all([
    sumVentas(hoy),
    sumVentas(semana),
    sumVentas(mes),
    Compra.aggregate([
      { $match: { fecha: { $gte: mes } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Pedido.countDocuments({ estado: { $nin: ['Entregado', 'Cancelado'] } }),
    Impresion.countDocuments({ estado: 'imprimiendo' }),
    Impresion.countDocuments({ estado: 'terminada' }),
    Insumo.find({ isActive: true, $expr: { $lte: ['$stock', '$stockMinimo'] } }).select('nombre stock stockMinimo unidad').lean(),
    Pedido.find({ estado: { $nin: ['Entregado', 'Cancelado'] }, fechaEntrega: { $ne: null } })
      .sort({ fechaEntrega: 1 }).limit(10).select('numero clienteNombre cliente fechaEntrega estado total').populate('cliente', 'nombre').lean(),
    Impresion.aggregate([
      { $match: { estado: 'terminada', createdAt: { $gte: mes } } },
      { $group: { _id: null, gramos: { $sum: '$pesoTotal' } } }
    ])
  ]);

  return {
    ventas: {
      hoy: ventasHoy.total,
      semana: ventasSemana.total,
      mes: ventasMes.total,
      cantidadMes: ventasMes.count
    },
    gananciaEstimadaMes: ventasMes.ganancia,
    gastosMes: gastosMesAgg[0]?.total || 0,
    pedidosPendientes,
    impresionesEnCurso,
    impresionesRealizadas,
    gramosConsumidosMes: gramosMesAgg[0]?.gramos || 0,
    stockCritico: stockCriticoInsumos,
    proximasEntregas
  };
}

/** Series para graficos: ventas y ganancias por dia de los ultimos N dias. */
export async function getSeriesVentas(dias = 30) {
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  desde.setDate(desde.getDate() - (dias - 1));

  const agg = await Venta.aggregate([
    { $match: { estado: 'completada', fecha: { $gte: desde } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } },
        total: { $sum: '$total' },
        ganancia: { $sum: '$ganancia' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return agg.map((d) => ({ fecha: d._id, total: d.total, ganancia: d.ganancia }));
}
