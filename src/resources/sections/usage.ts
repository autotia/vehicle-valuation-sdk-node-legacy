/**
 * Representa un cuantil de kilometraje en la curva de uso.
 */
export type OdometerQuantile = {
  /** Percentil evaluado en la distribución de odómetro (por ejemplo 10, 25, 50, 75, 90). */
  percentile: number;
  /** Kilometraje asociado al percentil en kilómetros (km). */
  odometer: number;
};

/**
 * Punto de la curva de kilometraje esperado en función de la edad del vehículo.
 */
export type UsageAgePoint = {
  /** Edad del vehículo evaluada en años. */
  age: number;
  /** Año de fabricación de referencia para el punto de la curva. */
  referenceYear: number;
  /** Distribución de cuantiles de kilometraje observados para esta edad. */
  distribution: OdometerQuantile[];
  /** Indica si los valores fueron generados mediante interpolación sintética por datos insuficientes. */
  synthetic: boolean;
  /** Tamaño de la muestra depurada utilizada para ajustar la distribución. */
  sampleSize: number;
  /** Tamaño bruto de la muestra antes de filtrar valores atípicos. */
  sampleSizeRaw: number;
  /** Cantidad de observaciones descartadas por considerarse atípicas. */
  discardedOutliers: number;
  /** Límite inferior de kilometraje para filtrado de valores atípicos en km. */
  lowerFence: number;
  /** Límite superior de kilometraje para filtrado de valores atípicos en km. */
  upperFence: number;
};

/**
 * Distribución de fallback a nivel de modelo cuando no se dispone de serie específica por edad.
 */
export type UsageModelFallback = {
  /** Tamaño de la muestra analizada a nivel de modelo general. */
  sampleSize: number;
  /** Distribución de cuantiles de kilometraje a nivel modelo. */
  distribution: OdometerQuantile[];
};

/**
 * Registro de origen y metadatos de generación de la curva de uso.
 */
export type UsageSource = {
  /** Versión del esquema de la curva de uso vehicular. */
  schemaVersion: string;
  /** Código ISO del país de origen de los datos (por ejemplo 'CL'). */
  country: string;
  /** Fecha y hora de generación de la curva en formato ISO 8601. */
  generatedAt: string;
};

/**
 * Datos de la sección de análisis de intensidad de uso y kilometraje esperado (schema: usage-v1).
 * Disponible en productos de tasación vehicular que incluyen análisis de uso (PRICE_API / general-price).
 */
export type UsageSectionData = {
  /** Clave canónica de la marca en catálogo. */
  markKey: string;
  /** Clave canónica del modelo en catálogo. */
  modelKey: string;
  /** Nombre canónico de la marca para visualización. */
  markCanon: string;
  /** Nombre canónico del modelo para visualización. */
  modelCanon: string;
  /** Edad calculada del vehículo evaluado en años. */
  vehicleAge: number;
  /** Kilometraje informado o evaluado del vehículo en kilómetros (km). */
  vehicleOdometer: number;
  /** Kilometraje verificado u observado en tablero (si se dispone). */
  observedOdometer?: number | null | undefined;
  /** Serie temporal de puntos de kilometraje esperado por edad del vehículo. */
  series: UsageAgePoint[];
  /** Distribución a nivel modelo general utilizada como fallback si no hay serie por edad. */
  modelLevelFallback?: UsageModelFallback | null | undefined;
  /** Metadatos de procedencia y fecha de generación de la curva de uso. */
  source?: UsageSource | null | undefined;
  /** Indica si la edad del vehículo se encuentra dentro del rango de comparabilidad estadística. */
  vehicleAgeComparable: boolean;
  /** Edad máxima en años admitida para comparaciones estadísticas válidas. */
  maxComparableAge?: number | null | undefined;
  /** Tamaño total de la muestra analizada para construir la curva de uso. */
  totalSampleSize: number;
};
