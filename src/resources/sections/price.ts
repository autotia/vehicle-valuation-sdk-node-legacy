/**
 * Métricas de soporte y convergencia utilizadas para evaluar la calidad de la tasación.
 */
export type PriceQualityInputs = {
  /** Número total de publicaciones analizadas en la muestra. */
  publicationCount: number;
  /** Nivel de soporte estadístico del modelo de regresión (0 a 1). */
  support: number;
  /** Peso efectivo asignado a los datos de la muestra. */
  effectiveWeight: number;
  /** Indica si la estimación cuenta con baja confianza estadística por escasez de publicaciones. */
  lowConfidence: boolean;
  /** Indica si el ajuste del modelo convergió adecuadamente. */
  converged: boolean;
  /** Número de cruces de cuantiles corregidos durante el proceso de suavizado. */
  crossingsCorrected: number;
};

/**
 * Parámetros de contexto geográfico y kilometraje aplicados en la estimación de precio.
 */
export type PriceMarketContext = {
  /** Región solicitada originalmente por el cliente (código ISO de región de Chile o null si no se especificó). */
  requestedRegion?: string | null | undefined;
  /** Región efectivamente aplicada tras la resolución (null si es referencia nacional). */
  appliedRegion?: string | null | undefined;
  /** Indica si los valores corresponden a una referencia a nivel nacional por falta de muestra regional suficiente. */
  isNationalReference: boolean;
  /** Kilometraje evaluado en kilómetros (km) sin unidad en el nombre. */
  odometer: number;
};

/**
 * Delimita un rango de precio con montos en pesos chilenos (CLP).
 */
export type PriceRange = {
  /** Límite inferior del rango de precio estimado en pesos chilenos (CLP). */
  minPrice: number;
  /** Límite superior del rango de precio estimado en pesos chilenos (CLP). */
  maxPrice: number;
};

/**
 * Resumen de estimación de margen comercial bruto y rentabilidad esperada.
 */
export type GrossMarginEstimate = {
  /** Aviso legal y explicativo sobre la naturaleza referencial del margen comercial. */
  disclaimer: string;
  /** Rango sugerido de compra (percentiles P20 a P40 de mercado) en pesos chilenos (CLP). */
  purchaseRange: PriceRange;
  /** Rango sugerido de venta (percentiles P70 a P80 de mercado) en pesos chilenos (CLP). */
  saleRange: PriceRange;
  /** Margen bruto mínimo estimado en pesos chilenos (CLP). */
  minGrossMargin: number;
  /** Porcentaje de margen bruto mínimo respecto al valor de venta. */
  minGrossMarginPercent: number;
  /** Margen bruto máximo estimado en pesos chilenos (CLP). */
  maxGrossMargin: number;
  /** Porcentaje de margen bruto máximo respecto al valor de venta. */
  maxGrossMarginPercent: number;
  /** Margen bruto promedio estimado en pesos chilenos (CLP). */
  avgGrossMargin: number;
  /** Porcentaje de margen bruto promedio respecto al valor de venta. */
  avgGrossMarginPercent: number;
};

/**
 * Representa un percentil evaluado con su precio correspondiente.
 */
export type PriceQuantile = {
  /** Número de percentil evaluado (por ejemplo 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90). */
  percentile: number;
  /** Monto estimado correspondiente al percentil en pesos chilenos (CLP). */
  price: number;
};

/**
 * Distribución de percentiles canónicos ordenados de precio por población.
 */
export type PriceDistribution = {
  /** 11 percentiles canónicos evaluados sobre la población global de mercado. */
  market: PriceQuantile[];
  /** 11 percentiles de referencia para publicaciones de vendedores particulares. */
  private: PriceQuantile[];
  /** 11 percentiles de referencia para publicaciones de automotoras / dealers. */
  dealer: PriceQuantile[];
};

/**
 * Describe la vigencia temporal de los datos analizados.
 */
export type PriceFreshness = {
  /** Último día lógico válido analizado en formato ISO 'YYYY-MM-DD'. */
  lastValidLogicalDay: string;
  /** Antigüedad de los datos en días respecto al día de cálculo. */
  ageDays: number;
  /** Estado de vigencia de los datos (por ejemplo 'CURRENT', 'STALE'). */
  status: string;
};

/**
 * Versiones de los algoritmos y métodos aplicados en la sección de precio.
 */
export type PriceMethodology = {
  /** Versión del algoritmo de cálculo de puntaje de calidad. */
  qualityVersion: string;
  /** Versión del algoritmo de corrección y suavizado de cuantiles. */
  smoothingVersion: string;
  /** Versión del algoritmo principal de estimación y regresión de precios. */
  algorithmVersion: string;
};

/**
 * Conteos descriptivos de publicaciones clasificadas por tipo de vendedor.
 */
export type SellerCounts = {
  /** Cantidad de publicaciones observadas de vendedores particulares. */
  private: number;
  /** Cantidad de publicaciones observadas de automotoras o dealers. */
  dealer: number;
  /** Cantidad de publicaciones observadas de origen no clasificado. */
  unknown: number;
};

/**
 * Muestra observada para la versión exacta del vehículo evaluado.
 */
export type ExactMatchSample = {
  /** Año del modelo de la versión exacta. */
  year: number;
  /** Clave canónica de la versión exacta en el catálogo. */
  trimKey: string;
  /** Cantidad de publicaciones encontradas para la versión exacta. */
  publicationCount: number;
  /** Conteo por tipo de vendedor para la versión exacta. */
  sellerCounts: SellerCounts;
};

/**
 * Información descriptiva de la muestra observada en el mercado para el modelo y versión.
 */
export type PriceSample = {
  /** Total de publicaciones observadas para el modelo completo. */
  modelPublicationCount: number;
  /** Desglose de vendedores a nivel del modelo general. */
  modelSellerCounts: SellerCounts;
  /** Muestra observada específicamente para la versión exacta evaluada, si existe. */
  exactMatch?: ExactMatchSample | undefined;
};

/**
 * Datos del resultado de tasación de mercado y márgenes comerciales (schema: price-v2).
 * Presente en todos los informes de tasación de vehículos (producto general-price / PRICE_API).
 */
export type PriceSectionData = {
  /** Puntaje de calidad de la tasación en escala de 0 a 100. */
  qualityScore: number;
  /** Métricas estadísticas de calidad, soporte y convergencia del modelo. */
  qualityInputs: PriceQualityInputs;
  /** Contexto geográfico y de odómetro utilizado para la evaluación de precio. */
  marketContext: PriceMarketContext;
  /** Rango sugerido de compra para el vehículo en pesos chilenos (CLP). */
  purchase: PriceRange;
  /** Rango sugerido de venta para el vehículo en pesos chilenos (CLP). */
  sale: PriceRange;
  /** Estimación de márgenes brutos de compraventa y rentabilidad estimada. */
  grossMarginEstimate: GrossMarginEstimate;
  /** Curvas de percentiles de distribución de precio para mercado, particulares y dealers. */
  priceDistribution: PriceDistribution;
  /** Indicadores de vigencia de la información analizada. */
  freshness: PriceFreshness;
  /** Versiones metodológicas de los algoritmos de tasación aplicados. */
  methodology: PriceMethodology;
  /** Muestra estadística de publicaciones observadas (opcional según disponibilidad de datos). */
  sample?: PriceSample | undefined;
};
