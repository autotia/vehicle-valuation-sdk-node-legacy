/**
 * Resumen de datos objetivos recolectados de una publicación de venta.
 */
export type ListingFacts = {
  /** Identificador de la publicación en el portal de origen. */
  publicationId: string;
  /** Portal o fuente donde se encuentra publicado el aviso. */
  portal: string;
  /** URL pública directa al detalle de la publicación. */
  detailUrl: string;
  /** Título publicado del aviso. */
  title: string;
  /** Precio de venta publicado en pesos chilenos (CLP). */
  publishedPrice: number;
  /** Kilometraje publicado en el aviso en kilómetros (km). */
  publishedOdometer: number;
  /** Tipo de vendedor declarado ('dealer' o 'private'). */
  sellerType: string;
  /** Nombre o razón social del vendedor si está disponible. */
  sellerName?: string | undefined;
  /** Ubicación o comuna declarada en el aviso. */
  location: string;
  /** Texto descriptivo completo del aviso publicado. */
  description: string;
  /** Fecha y hora de captura de la publicación en formato ISO 8601. */
  scrapedAt: string;
};

/**
 * Evaluación de un elemento específico del checklist de análisis de publicación.
 */
export type ListingScoreItem = {
  /** Elemento o aspecto evaluado del aviso. */
  element: string;
  /** Categoría o dimensión del elemento evaluado. */
  class: string;
  /** Veredicto emitido sobre el elemento (por ejemplo 'PASS', 'WARN', 'FAIL'). */
  verdict: string;
  /** Puntos asignados al elemento evaluado. */
  points: number;
  /** Indica si este elemento computa en el puntaje total de la publicación. */
  counted: boolean;
};

/**
 * Puntuación integral y desglose de evaluación de la publicación.
 */
export type ListingScore = {
  /** Puntaje final normalizado en escala de 0 a 100. */
  value: number;
  /** Etiqueta descriptiva del puntaje obtenido. */
  label: string;
  /** Puntaje bruto total acumulado. */
  rawScore: number;
  /** Puntaje máximo teórico alcanzable. */
  maxPossible: number;
  /** Detalle de elementos evaluados en el checklist. */
  items: ListingScoreItem[];
};

/**
 * Resumen temático por sección de análisis del informe.
 */
export type ListingSummary = {
  /** Nombre de la sección o aspecto resumido. */
  section: string;
  /** Texto explicativo del análisis de la sección. */
  text: string;
};

/**
 * Delimita un rango monetario de costo estimado de reparación o reacondicionamiento.
 */
export type CostBounds = {
  /** Monto mínimo estimado en pesos chilenos (CLP). */
  minAmount?: number | null | undefined;
  /** Monto máximo estimado en pesos chilenos (CLP). */
  maxAmount?: number | null | undefined;
};

/**
 * Hallazgo u observación relevante detectada en la publicación.
 */
export type ListingFinding = {
  /** Descripción del hallazgo detectado. */
  text: string;
  /** Nivel de severidad técnica o comercial del hallazgo ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'). */
  severity: string;
  /** Origen de la detección ('TEXT', 'IMAGE', 'METADATA'). */
  origin: string;
  /** Clave del recurso multimedia o imagen vinculada al hallazgo, si aplica. */
  resourceKey?: string | undefined;
  /** Estimación de costo económico asociado al hallazgo en pesos chilenos (CLP). */
  repairCostEstimate?: CostBounds | null | undefined;
};

/**
 * Veredicto técnico sobre un componente o elemento inspeccionado del vehículo.
 */
export type ListingVerdict = {
  /** Componente o elemento evaluado. */
  element: string;
  /** Veredicto asignado al elemento. */
  verdict: string;
  /** Justificación técnica del veredicto emitido. */
  rationale: string;
  /** Claves de recursos multimedia que respaldan la evaluación. */
  resourceKeys: string[];
  /** Puntos asignados al componente, si aplica. */
  points?: number | null | undefined;
};

/**
 * Contraste entre el kilometraje publicado en el aviso y el observado visualmente en el tablero.
 */
export type OdometerReading = {
  /** Kilometraje listado por el vendedor en kilómetros (km). */
  listed: number;
  /** Kilometraje informado en la ficha del portal en kilómetros (km). */
  published: number;
  /** Kilometraje visualmente observado en la foto del odómetro en kilómetros (km). */
  observed?: number | null | undefined;
  /** Clave de la foto del odómetro utilizada para la lectura visual. */
  observedResourceKey?: string | undefined;
  /** Indica si la lectura observada coincide con lo publicado dentro de la tolerancia. */
  matches: boolean;
  /** Umbral de discrepancia tolerable en kilómetros (km). */
  threshold: number;
  /** Indica si existe diferencia apreciable entre lo declarado y lo observado. */
  listedDiffers: boolean;
  /** Indica si se utilizó valor de fallback por ausencia de lectura en foto. */
  listedFallback: boolean;
};

/**
 * Atributos identificadores del vehículo detectados en la publicación.
 */
export type VehicleAttributes = {
  /** Número de identificación vehicular (VIN) detectado. */
  vin?: string | undefined;
  /** Color de la carrocería identificado visualmente o en texto. */
  bodyColor?: string | undefined;
  /** Placa patente del vehículo identificada en las imágenes o datos. */
  licensePlate?: string | undefined;
};

/**
 * Totalización de los recursos multimedia disponibles en la publicación.
 */
export type MediaSummary = {
  /** Cantidad total de fotos disponibles en la publicación. */
  photoCount: number;
  /** Cantidad de videos disponibles en la publicación. */
  videoCount: number;
  /** Resumen textual de la cobertura y calidad fotográfica. */
  summaryText: string;
};

/**
 * Banda comercial de negociación sugerida calculada respecto al precio de mercado.
 */
export type NegotiationBand = {
  /** Oferta de entrada recomendada para iniciar negociación en pesos chilenos (CLP). */
  entryOffer: number;
  /** Precio máximo recomendado de compra en pesos chilenos (CLP). */
  maxRecommended: number;
  /** Precio de lista publicado en pesos chilenos (CLP). */
  published: number;
  /** Ahorro potencial estimado respecto al precio publicado en pesos chilenos (CLP). */
  saving: number;
  /** Precio mediana de referencia del mercado en pesos chilenos (CLP). */
  medianReferencePrice: number;
  /** Argumentos comerciales objetivos sugeridos para fundamentar la negociación. */
  arguments: string[];
  /** Indica si la banda de negociación comercial se encuentra disponible. */
  available: boolean;
};

/**
 * Pregunta recomendada para formular al vendedor durante la visita o inspección.
 */
export type ContextualQuestion = {
  /** Clave o código identificador de la pregunta. */
  key: string;
  /** Texto sugerido de la pregunta a realizar. */
  text: string;
};

/**
 * Recurso multimedia asociado a la publicación con URL CDN estable.
 */
export type ListingMedia = {
  /** Identificador único del recurso multimedia. */
  resourceKey: string;
  /** Tipo de contenido MIME (por ejemplo 'image/jpeg'). */
  mediaType: string;
  /** URL CDN estable para visualización o descarga de la imagen. */
  url: string;
  /** Sección temática del informe a la que corresponde la imagen (por ejemplo 'dashboard'). */
  section: string;
};

/**
 * Datos de la sección de análisis comercial de publicación e inspección visual (schema: listing-analysis-v2).
 * Disponible en productos de análisis de avisos vehiculares.
 */
export type ListingAnalysisSectionData = {
  /** Datos objetivos extraídos de la publicación. */
  listingFacts: ListingFacts;
  /** Puntuación general y evaluación del checklist de la publicación. */
  score: ListingScore;
  /** Puntos clave del resumen ejecutivo de la publicación. */
  executiveSummary: string[];
  /** Resúmenes analíticos por sección de inspección. */
  sectionSummaries: ListingSummary[];
  /** Hallazgos relevantes detectados con evaluación económica de reparaciones. */
  findings: ListingFinding[];
  /** Veredictos técnicos emitidos sobre los componentes inspeccionados. */
  elementVerdicts: ListingVerdict[];
  /** Comparativa entre kilometraje publicado y lectura directa en foto de odómetro. */
  odometerReading?: OdometerReading | null | undefined;
  /** Atributos identificadores detectados (VIN, color, placa patente). */
  vehicleAttributes?: VehicleAttributes | null | undefined;
  /** Métricas de cobertura de medios y fotos de la publicación. */
  mediaSummary?: MediaSummary | null | undefined;
  /** Banda comercial recomendada para negociación de precio de compra. */
  negotiationBand?: NegotiationBand | null | undefined;
  /** Preguntas contextuales sugeridas para hacer al vendedor. */
  contextualQuestions: ContextualQuestion[];
  /** Galería de medios y fotografías clasificadas vinculadas al informe. */
  media: ListingMedia[];
};
