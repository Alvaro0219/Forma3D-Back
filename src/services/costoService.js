/**
 * Motor de costos. Funciona de forma independiente (presupuestos) y como base
 * para calcular el costo de productos, pedidos y ventas.
 *
 * Formulas (parametrizables desde Configuracion):
 *   costo por gramo   = precio de la bobina / gramos originales
 *   costo de material = gramos consumidos x costo por gramo
 *   costo electrico   = consumo (kW) x tiempo (h) x precio kWh
 *   costo maquina     = tiempo (h) x costo/hora de maquina
 *   costo total       = material + electricidad + maquina + mano de obra + embalaje + otros
 *   ganancia          = precio de venta - costo total
 *   margen            = ganancia / precio de venta x 100
 */

const round = (n, d = 2) => {
  const f = 10 ** d;
  return Math.round((Number(n) || 0) * f) / f;
};

/**
 * @param {object} input
 * @param {number} input.precioRollo      precio de la bobina completa
 * @param {number} input.pesoRollo        gramos originales de la bobina
 * @param {number} input.gramosUtilizados gramos consumidos por la pieza
 * @param {number} input.tiempoImpresion  minutos de impresion
 * @param {number} input.consumoElectrico consumo de la impresora en kW
 * @param {number} input.precioKwh        precio del kWh
 * @param {number} input.costoHoraMaquina costo por hora de maquina
 * @param {number} input.manoObra         costo de mano de obra por hora
 * @param {number} input.embalaje         costo de embalaje (fijo)
 * @param {number} input.otros            otros costos (fijo)
 * @param {string} input.modo             'margen' | 'ganancia'
 * @param {number} input.margenDeseado    % (modo margen)
 * @param {number} input.gananciaDeseada  monto (modo ganancia)
 */
export function calcularCosto(input = {}) {
  const {
    precioRollo = 0,
    pesoRollo = 0,
    gramosUtilizados = 0,
    tiempoImpresion = 0,
    consumoElectrico = 0,
    precioKwh = 0,
    costoHoraMaquina = 0,
    manoObra = 0,
    embalaje = 0,
    otros = 0,
    modo = 'margen',
    margenDeseado = 0,
    gananciaDeseada = 0
  } = input;

  const tiempoHoras = (Number(tiempoImpresion) || 0) / 60;
  const costoPorGramo = pesoRollo > 0 ? precioRollo / pesoRollo : 0;

  const costoMaterial = costoPorGramo * (Number(gramosUtilizados) || 0);
  const costoElectricidad = (Number(consumoElectrico) || 0) * tiempoHoras * (Number(precioKwh) || 0);
  const costoMaquina = tiempoHoras * (Number(costoHoraMaquina) || 0);
  const costoManoObra = tiempoHoras * (Number(manoObra) || 0);

  const costoTotal =
    costoMaterial + costoElectricidad + costoMaquina + costoManoObra +
    (Number(embalaje) || 0) + (Number(otros) || 0);

  let precioSugerido = 0;
  if (modo === 'ganancia') {
    precioSugerido = costoTotal + (Number(gananciaDeseada) || 0);
  } else {
    // modo margen: en este negocio "margen deseado" se entiende como markup
    // sobre el costo (no como margen bruto sobre precio) — ej. costo $1000 y
    // margen 100% => precio $2000. Por eso no tiene techo matematico en 100%.
    const m = Math.max(Number(margenDeseado) || 0, 0);
    precioSugerido = costoTotal * (1 + m / 100);
  }

  const ganancia = precioSugerido - costoTotal;
  // En modo margen el % ya es el markup pedido (autoconsistente); en modo ganancia
  // se informa el margen bruto resultante sobre el precio sugerido.
  const margen = modo === 'ganancia'
    ? (precioSugerido > 0 ? (ganancia / precioSugerido) * 100 : 0)
    : (costoTotal > 0 ? (ganancia / costoTotal) * 100 : 0);

  return {
    costoPorGramo: round(costoPorGramo, 4),
    costoMaterial: round(costoMaterial),
    costoElectricidad: round(costoElectricidad),
    costoMaquina: round(costoMaquina),
    costoManoObra: round(costoManoObra),
    costoEmbalaje: round(embalaje),
    costoOtros: round(otros),
    costoTotal: round(costoTotal),
    precioSugerido: round(precioSugerido),
    ganancia: round(ganancia),
    margen: round(margen)
  };
}

/**
 * Costo de una impresion que puede consumir VARIAS bobinas (multicolor).
 * El costo de material se suma por bobina (gramos x costo/gramo de esa bobina) y el
 * resto de los rubros se delega a calcularCosto(), que sigue siendo la fuente unica
 * de las formulas de electricidad, maquina y mano de obra.
 *
 * @param {Array} materiales [{ precioRollo, pesoRollo, gramos }]
 */
export function calcularCostoImpresion({
  materiales = [],
  tiempoImpresion = 0,
  consumoElectrico = 0,
  precioKwh = 0,
  costoHoraMaquina = 0,
  manoObra = 0,
  embalaje = 0,
  otros = 0
} = {}) {
  const detalleMateriales = materiales.map((m) => {
    const costoPorGramo = m.pesoRollo > 0 ? m.precioRollo / m.pesoRollo : 0;
    const gramos = Number(m.gramos) || 0;
    return {
      ...m,
      costoPorGramo: round(costoPorGramo, 4),
      costo: round(costoPorGramo * gramos)
    };
  });
  const costoMaterial = detalleMateriales.reduce((acc, m) => acc + m.costo, 0);

  // gramosUtilizados en 0: el material ya se calculo por bobina arriba.
  const resto = calcularCosto({
    gramosUtilizados: 0,
    tiempoImpresion,
    consumoElectrico,
    precioKwh,
    costoHoraMaquina,
    manoObra,
    embalaje,
    otros,
    modo: 'margen',
    margenDeseado: 0
  });

  const costoTotal = costoMaterial + resto.costoTotal;

  return {
    ...resto,
    costoMaterial: round(costoMaterial),
    costoTotal: round(costoTotal),
    precioSugerido: round(costoTotal),
    ganancia: 0,
    margen: 0,
    detalleMateriales
  };
}

/** Costo real de una venta dado el precio y el costo total ya conocidos. */
export function calcularRentabilidad(precioVenta, costoTotal) {
  const ganancia = (Number(precioVenta) || 0) - (Number(costoTotal) || 0);
  const margen = precioVenta > 0 ? (ganancia / precioVenta) * 100 : 0;
  return { ganancia: round(ganancia), margen: round(margen) };
}
