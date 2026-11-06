/**
 * Diferencias observables entre la publicación comparable y el vehículo evaluado.
 */
export type ComparableDiff = {
  /** Diferencia en años respecto al vehículo evaluado (positivo si el comparable es más nuevo). */
  yearDelta: number;
  /** Diferencia en kilómetros de odómetro respecto al vehículo evaluado (positivo si tiene más km). */
  odometerDelta: number;
  /** Indica si la publicación corresponde exactamente a la misma versión resuelta. */
  sameVersion: boolean;
  /** Indica si la publicación se encuentra en la misma región geográfica solicitada. */
  sameRegion: boolean;
};

/**
 * Publicación de vehículo comparable observada en el mercado.
 */
export type ComparableItem = {
  /** Nombre del portal o fuente de origen (por ejemplo 'chileautos'). */
  portal: string;
  /** Identificador único de la publicación en el portal de origen. */
  publicationId: string;
  /** Enlace web directo a la publicación del vehículo. */
  url: string;
  /** Precio publicado en pesos chilenos (CLP). */
  price: number;
  /** Año de fabricación del vehículo en la publicación. */
  year: number;
  /** Kilometraje publicado en kilómetros (km). */
  odometer: number;
  /** Versión del vehículo informada en la publicación. */
  version: string;
  /**
   * Indica si se pudo identificar la versión de la publicación. En informes nuevos, cuando es `true`,
   * `version` contiene una cadena no vacía; cuando es `false`, `version` es `""`. El campo se omite
   * en informes históricos: si no está presente, determine si se identificó usando `version !== ""`.
   */
  versionIdentified?: boolean | undefined;
  /** Clave canónica de versión en catálogo si fue resuelta. */
  canonicalVersionKey?: string | undefined;
  /** URL de la imagen de la publicación. Opcional: se omite cuando la publicación no tiene imagen. */
  imageUrl?: string | undefined;
  /** Región geográfica donde se ubica la publicación. */
  region: string;
  /**
   * Indica si se pudo identificar la región de la publicación. En informes nuevos, cuando es `true`,
   * `region` contiene una cadena no vacía; cuando es `false`, `region` es `""`. El campo se omite
   * en informes históricos: si no está presente, determine si se identificó usando `region !== ""`.
   */
  regionIdentified?: boolean | undefined;
  /** Tipo de vendedor de la publicación ('dealer' o 'private'). */
  sellerType: "dealer" | "private" | string;
  /** Fecha y hora de primera captura de la publicación en formato ISO 8601. */
  firstSeenAt: string;
  /** Fecha y hora de última observación de la publicación en formato ISO 8601. */
  lastSeenAt: string;
  /** Indica si la publicación fue incluida para alcanzar el mínimo de 3 comparables aun estando fuera de la tolerancia del modelo. */
  distant: boolean;
  /** Resumen de diferencias observables respecto al vehículo evaluado. */
  diff: ComparableDiff;
};

/**
 * Parámetros del modelo algorítmico utilizado para la búsqueda de comparables.
 */
export type ComparableModel = {
  /** Versión del algoritmo de selección de comparables. */
  algorithmVersion: string;
  /** Día lógico de referencia de los datos en formato ISO 'YYYY-MM-DD'. */
  logicalDay: string;
  /** Alcance de la búsqueda de publicaciones comparables (por ejemplo 'model' o 'trim'). */
  scope: string;
};

/**
 * Métricas de selección y filtrado de la muestra de vehículos comparables.
 */
export type ComparableSelection = {
  /** Cantidad total de publicaciones candidatas evaluadas. */
  candidates: number;
  /** Cantidad de candidatas que se encontraron dentro de la tolerancia estricta. */
  withinTolerance: number;
  /** Límite máximo de resultados devueltos por el informe. */
  maxResults: number;
  /** Cantidad mínima de comparables requerida para el reporte. */
  kMin: number;
};

/**
 * Datos de la sección de vehículos comparables del mercado (schema: comparables-v1).
 * Incluida en informes de tasación B2B (general-price / PRICE_API).
 */
export type ComparablesSectionData = {
  /** Listado de publicaciones de vehículos comparables seleccionadas (máximo 5 por informe). */
  items: ComparableItem[];
  /** Metadatos del modelo algorítmico de selección de comparables. */
  model: ComparableModel;
  /** Métricas de selección y restricciones de la muestra de comparables. */
  selection: ComparableSelection;
};
