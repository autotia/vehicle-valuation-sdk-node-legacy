/**
 * Punto diario de la serie histórica de precios para un conjunto de percentiles.
 */
export type HistoryPoint = {
  /** Fecha del punto histórico en formato ISO 'YYYY-MM-DD'. */
  date: string;
  /** Arreglo ordenado de precios estimados para los percentiles configurados en pesos chilenos (CLP). */
  prices: number[];
  /** Indica si la estimación en esta fecha cuenta con baja confianza por muestra reducida. */
  lowConfidence: boolean;
};

/**
 * Puntos de serie temporal de precios correspondientes a una región específica.
 */
export type RegionHistory = {
  /** Código de la región geográfica analizada. */
  region: string;
  /** Serie ordenada de puntos diarios históricos para la región. */
  points: HistoryPoint[];
};

/**
 * Agrupa la serie histórica de precios a nivel nacional y regional para una población de vendedores.
 */
export type HistoryPopulation = {
  /** Serie temporal nacional de precios. */
  national: HistoryPoint[];
  /** Series temporales desglosadas por región geográfica. */
  regions: RegionHistory[];
};

/**
 * Datos de la sección de serie temporal y evolución histórica de precios (schema: price-history-v1).
 * Disponible en productos de análisis temporal y de mercado extendido.
 */
export type PriceHistorySectionData = {
  /** Ventana temporal analizada en días (por ejemplo 30, 60 o 90 días). */
  windowDays: number;
  /** Percentiles de precio representados en cada punto de la serie (por ejemplo [25, 50, 75]). */
  percentiles: number[];
  /** Evolución histórica de precios para la población global de mercado. */
  market: HistoryPopulation;
  /** Evolución histórica de precios de publicaciones de particulares. */
  private: HistoryPopulation;
  /** Evolución histórica de precios de publicaciones de automotoras / dealers. */
  dealer: HistoryPopulation;
};
