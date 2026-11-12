import type { CallOptions } from "../core/types";
import type {
  ComparablesSectionData,
  PriceSectionData,
  UsageSectionData,
} from "./sections/index";

export * from "./sections/index";

/**
 * Tipos de informe de tasación soportados.
 */
export type ReportType = "general-price";

/**
 * Parámetros para solicitar un pedido de tasación vehicular.
 * Admite identificación exacta por modelo y versión, o identificación flexible mediante búsqueda libre.
 */
export type OrderRequest = {
  /** Tipo de informe contratado (por ejemplo 'general-price'). */
  reportType: ReportType;
  /** Marca del vehículo (por ejemplo 'Toyota'). */
  mark: string;
  /** Año de fabricación del modelo (por ejemplo 2020). */
  year: number;
  /** Kilometraje aproximado del vehículo en kilómetros (km); si se omite, se infiere desde la curva de uso. */
  odometerKm?: number | undefined;
  /** Código de la región geográfica en Chile (por ejemplo 'CL-RM'); si se omite, se calcula precio nacional. */
  region?: string | undefined;
} & (
  | {
      /** Modelo del vehículo para identificación exacta (excluyente con search). */
      model: string;
      /** Versión normalizada del catálogo para identificación exacta (excluyente con search). */
      version: string;
      search?: never;
    }
  | {
      /** Texto libre de búsqueda para resolución e inferencia automática (excluyente con model y version). */
      search: string;
      model?: never;
      version?: never;
    }
);

/**
 * Respuesta de aceptación asíncrona de un pedido de tasación (HTTP 202 Accepted).
 */
export interface OrderAcceptance {
  /** Identificador único del pedido en formato Crockford base32 con prefijo 'ordb2b_'. */
  orderId: string;
  /** Tipo de informe solicitado. */
  reportType: string;
  /** Estado inicial del procesamiento ('PENDING' o 'RUNNING'). */
  status: "PENDING" | "RUNNING";
  /** Intervalo sugerido en milisegundos antes de consultar el estado con polling. */
  pollAfterMs: number;
  /** Identificador de la venta o cargo asociado en Pagos con prefijo 'sal_', si ya fue asignado. */
  saleId?: string | undefined;
  /** Metadatos de la versión del catálogo y vehículo resuelto en la admisión. */
  resolution?: Resolution | undefined;
  [key: string]: unknown;
}

/**
 * Detalle del fallo en caso de que la tasación no pueda completarse.
 */
export interface OrderFailure {
  /** Código canónico de error (por ejemplo 'data_unavailable'). */
  code: string;
  /** Descripción legible del motivo del fallo. */
  description: string;
  [key: string]: unknown;
}

/**
 * Atributos del vehículo evaluado en el informe de tasación.
 */
export interface OrderResultVehicle {
  /** Marca del vehículo evaluado. */
  mark: string;
  /** Modelo del vehículo evaluado. */
  model: string;
  /** Año de fabricación del vehículo evaluado. */
  year: number;
  /** Versión del vehículo evaluada. */
  version: string;
  /** Versión canónica del catálogo oficial; puede omitirse si no fue homologada. */
  canonicalVersion?: string | undefined;
  /** Método de resolución de versión aplicado (por ejemplo 'unique', 'ambiguous', 'unresolved'); se omite si no está disponible. */
  versionResolution?: string | undefined;
  /** Indica si la versión resuelta influyó directamente en el modelo de tasación. */
  versionApplied: boolean;
  [key: string]: unknown;
}

/**
 * Estados canónicos de disponibilidad de una sección en report-result-v2.
 */
export type SectionStatus = "AVAILABLE" | "UNAVAILABLE" | "FAILED";

/**
 * Envoltorio estándar de toda sección en el resultado de tasación report-result-v2.
 */
export interface ReportSection<
  S extends string = string,
  T = Record<string, unknown>,
> {
  /** Identificador canónico del esquema de la sección (por ejemplo 'price-v2', 'comparables-v1'). */
  schema: S | string;
  /** Estado de disponibilidad de la sección ('AVAILABLE', 'UNAVAILABLE', 'FAILED'). */
  status: SectionStatus | string;
  /** Datos estructurados de la sección; presente cuando el estado es 'AVAILABLE'. */
  data?: T | undefined;
  [key: string]: unknown;
}

/**
 * Contenedor de secciones del informe de tasación.
 * Declara las secciones conocidas como opcionales y admite secciones adicionales mediante firma de índice abierta.
 */
export interface ReportSections {
  /** Sección de tasación de mercado, márgenes y distribución de precios (schema: price-v2). Presente en general-price. */
  price?: ReportSection<"price-v2", PriceSectionData> | undefined;
  /** Sección de vehículos comparables observados en el mercado (schema: comparables-v1). Presente en general-price. */
  comparables?:
    | ReportSection<"comparables-v1", ComparablesSectionData>
    | undefined;
  /** Sección de análisis de intensidad de uso y kilometraje esperado (schema: usage-v1). */
  usage?: ReportSection<"usage-v1", UsageSectionData> | undefined;
  /** Firma de índice abierta para conservar secciones no tipadas o futuras sin error de deserialización. */
  [key: string]: ReportSection<string, Record<string, unknown>> | undefined;
}

/**
 * Metadatos de la moneda aplicada en los valores monetarios del informe.
 */
export interface Currency {
  /** Código ISO 4217 de la moneda ('CLP'). */
  code: string;
  /** Nombre completo de la moneda ('Peso chileno'). */
  name: string;
  /** Símbolo monetario ('$'). */
  symbol: string;
  /** Posición estándar del símbolo respecto a la cifra ('BEFORE' | 'AFTER'). */
  symbolPosition: string;
  /** Cantidad de dígitos decimales de la moneda (0 para CLP). */
  decimals: number;
  /** Carácter separador de decimales (','). */
  decimalSeparator: string;
  /** Carácter separador de miles o grupos ('.'). */
  groupSeparator: string;
  [key: string]: unknown;
}

/**
 * Metadatos de localización regional y monetaria aplicados al informe.
 */
export interface Localization {
  /** Código de idioma y región en formato IETF BCP 47 ('es-CL'). */
  locale: string;
  /** Zona horaria IANA del informe ('America/Santiago'). */
  timeZone: string;
  /** Formato estándar de fecha ('dd-MM-yyyy'). */
  dateFormat: string;
  /** Unidad de medida de distancias ('km'). */
  distanceUnit: string;
  /** Configuración monetaria aplicada a los precios del informe. */
  currency: Currency;
  [key: string]: unknown;
}

/**
 * Resultado completo del pedido de tasación vehicular (schemaVersion: 'report-result-v2').
 * Se entrega directamente en `order.result`; las secciones están en `order.result.sections`.
 */
export interface OrderResult {
  /** Versión del esquema del resultado ('report-result-v2' o string para esquemas futuros). */
  schemaVersion: "report-result-v2" | string;
  /** Metadatos de localización regional y convenciones de formato. */
  localization: Localization;
  /** Atributos del vehículo evaluado en el informe. */
  vehicle: OrderResultVehicle;
  /** Metadatos de resolución de catálogo incluidos en el informe. */
  resolution: ResultResolution;
  /** Secciones generadas del informe según el producto contratado. */
  sections: ReportSections;
  [key: string]: unknown;
}

/**
 * Estado actual de un pedido de tasación consultado vía GET /v1/orders/{orderId}.
 */
export interface OrderStatus {
  /** Identificador único del pedido en formato 'ordb2b_…'. */
  orderId: string;
  /** Tipo de informe solicitado. */
  reportType: string;
  /** Estado del procesamiento ('PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'). */
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  /** Identificador de la venta asociada en Pagos ('sal_…'), si existe. */
  saleId?: string | undefined;
  /** Resultado de la tasación cuando el estado es 'COMPLETED'. */
  result?: OrderResult | undefined;
  /** Motivo del fallo cuando el estado es 'FAILED'. */
  failure?: OrderFailure | undefined;
  /** Metadatos de resolución del catálogo vehicular. */
  resolution?: OrderStatusResolution | undefined;
  [key: string]: unknown;
}

/**
 * Nivel de confianza en la identificación de la versión del vehículo ('EXACT' | 'HIGH' | 'MEDIUM' | 'LOW').
 *
 * - `EXACT`: La versión llegó explícita en la solicitud y existe en el catálogo.
 * - `HIGH`: El texto deja una sola versión posible.
 * - `MEDIUM`: El texto aporta al menos un dato mecánico y se eligió la versión base más común del mercado (o la más barata entre las igual de comunes), que además representa una parte relevante de los avisos.
 * - `LOW`: Misma elección que `MEDIUM`, pero con poca información en el texto o pocos datos de mercado.
 *
 * Nota: El nivel bajo mide la identificación de la versión, no el riesgo de la tasación comercial.
 */
export type VersionConfidence = "EXACT" | "HIGH" | "MEDIUM" | "LOW";

/**
 * Criterio o base aplicada para la selección de la versión del vehículo ('TEXT' | 'MOST_COMMON' | 'LOWEST_PRICE' | 'SIMPLEST').
 *
 * - `TEXT`: La versión se seleccionó por coincidencia textual o especificación directa.
 * - `MOST_COMMON`: Se eligió la versión con más avisos del mercado.
 * - `LOWEST_PRICE`: Desempate aplicado seleccionando la versión con menor precio mediano de mercado observado.
 * - `SIMPLEST`: Respaldo determinista seleccionando la versión base o más simple del catálogo (menor potencia, transmisión manual, menor equipamiento).
 */
export type VersionBasis = "TEXT" | "MOST_COMMON" | "LOWEST_PRICE" | "SIMPLEST";

/** Fuente u origen del valor asignado a un campo resuelto. */
export type ResolutionFieldSource =
  | "EXACT"
  | "INFERRED"
  | "NATIONAL"
  | "PROVIDED"
  | "USAGE_CURVE_YEAR_MEDIAN"
  | "USAGE_CURVE_MODEL_MEDIAN"
  | string;

/**
 * Campo textual resuelto con indicación de su fuente de procedencia.
 */
export interface ResolvedStringField {
  /** Valor textual resuelto (por ejemplo 'Toyota', 'Yaris', 'CL-RM'). */
  value: string;
  /** Fuente de donde proviene el valor resuelto. */
  source: ResolutionFieldSource;
  [key: string]: unknown;
}

/**
 * Campo numérico resuelto con indicación de su fuente de procedencia.
 */
export interface ResolvedNumberField {
  /** Valor numérico resuelto (por ejemplo kilometraje). */
  value: number;
  /** Fuente de donde proviene el valor numérico. */
  source: ResolutionFieldSource;
  [key: string]: unknown;
}

/**
 * Versión de catálogo candidata evaluada durante la resolución del vehículo.
 */
export interface ResolutionCandidate {
  /** Nombre del modelo del candidato. */
  model: string;
  /** Nombre de la versión del candidato. */
  version: string;
  /** Confianza relativa normalizada de la versión (0 a 100). */
  confidence: number;
  [key: string]: unknown;
}

/**
 * Metadatos de resolución de catálogo vehicular y procedencia de atributos.
 */
export interface Resolution {
  /** Versión del catálogo vehicular utilizada para la resolución. */
  catalogVersion: string;
  /** Versión del catálogo de origen de los datos. */
  sourceCatalogVersion: string;
  /** Versión de la curva de kilometraje utilizada en inferencias, si aplica. */
  usageCurveVersion?: string | undefined;
  /** Año de fabricación de referencia utilizado. */
  referenceYear: number;
  /** Texto de búsqueda original en caso de inferencia flexible. */
  search?: string | undefined;
  /** Confianza en la identificación de la versión elegida. */
  versionConfidence: VersionConfidence;
  /** Criterio aplicado para seleccionar la versión. */
  versionBasis: VersionBasis;
  /** Detalle campo a campo de los valores y fuentes aplicadas. */
  fields: ResolutionFields;
  /** Versión candidata seleccionada como coincidencia definitiva. */
  selected: ResolutionCandidate;
  /** Otras versiones candidatas consideradas durante la evaluación. */
  alternatives: ResolutionCandidate[];
  [key: string]: unknown;
}

/**
 * Campos clave del vehículo con su procedencia.
 */
export interface ResolutionFields {
  /** Modelo del vehículo y su origen. */
  model: ResolvedStringField;
  /** Versión del vehículo y su origen. */
  version: ResolvedStringField;
  /** Región geográfica aplicada y su origen. */
  region: ResolvedStringField;
  /** Kilometraje resuelto en km y su origen. */
  odometerKm: ResolvedNumberField;
  [key: string]: unknown;
}

/**
 * Metadatos de resolución incluidos dentro del resultado (`order.result.resolution`).
 * A diferencia de `Resolution` (nivel de pedido), el kilometraje se informa en `fields.odometer`
 * y no incluye `versionConfidence` ni `versionBasis`.
 */
export interface ResultResolution {
  /** Versión del catálogo vehicular utilizada para la resolución. */
  catalogVersion: string;
  /** Versión del catálogo de origen de los datos. */
  sourceCatalogVersion: string;
  /** Versión de la curva de kilometraje utilizada en inferencias, si aplica. */
  usageCurveVersion?: string | undefined;
  /** Año de fabricación de referencia utilizado. */
  referenceYear: number;
  /** Texto de búsqueda original en caso de inferencia flexible. */
  search?: string | undefined;
  /** Detalle campo a campo de los valores y fuentes aplicadas. */
  fields: ResultResolutionFields;
  /** Versión candidata seleccionada como coincidencia definitiva. */
  selected: ResolutionCandidate;
  /** Otras versiones candidatas consideradas durante la evaluación. */
  alternatives: ResolutionCandidate[];
  [key: string]: unknown;
}

/** Resolución devuelta al consultar pedidos antiguos que aún no guardaban la confianza de versión. */
export interface OrderStatusResolution {
  catalogVersion: string;
  sourceCatalogVersion: string;
  usageCurveVersion?: string | undefined;
  referenceYear: number;
  search?: string | undefined;
  versionConfidence?: VersionConfidence | undefined;
  versionBasis?: VersionBasis | undefined;
  fields: ResolutionFields;
  selected: ResolutionCandidate;
  alternatives: ResolutionCandidate[];
  [key: string]: unknown;
}

/**
 * Campos clave del vehículo con su procedencia dentro del resultado.
 */
export interface ResultResolutionFields {
  /** Modelo del vehículo y su origen. */
  model: ResolvedStringField;
  /** Versión del vehículo y su origen. */
  version: ResolvedStringField;
  /** Región geográfica aplicada y su origen. */
  region: ResolvedStringField;
  /** Kilometraje resuelto en km y su origen. */
  odometer: ResolvedNumberField;
  [key: string]: unknown;
}

/**
 * Referencia descriptiva a un elemento de catálogo (marca, modelo o versión).
 */
export interface CatalogRef {
  /** Clave canónica del elemento para uso en rutas de API. */
  key: string;
  /** Nombre o texto descriptivo del elemento para visualización. */
  text: string;
  [key: string]: unknown;
}

/**
 * Listado de marcas vehiculares disponibles en el catálogo.
 */
export interface CatalogMarks {
  /** Versión actual del catálogo vehicular. */
  catalogVersion: string;
  /** Lista de marcas indexadas en el catálogo. */
  marks: CatalogRef[];
  [key: string]: unknown;
}

/**
 * Modelo de catálogo con sus años de fabricación comercializados.
 */
export interface CatalogModel extends CatalogRef {
  /** Años de fabricación disponibles para el modelo. */
  years: number[];
}

/**
 * Modelos disponibles para una marca en el catálogo.
 */
export interface CatalogModels {
  /** Versión actual del catálogo vehicular. */
  catalogVersion: string;
  /** Marca consultada. */
  mark: CatalogRef;
  /** Modelos comercializados bajo la marca. */
  models: CatalogModel[];
  [key: string]: unknown;
}

/**
 * Años de fabricación registrados para un modelo en el catálogo.
 */
export interface CatalogYears {
  /** Versión actual del catálogo vehicular. */
  catalogVersion: string;
  /** Marca consultada. */
  mark: CatalogRef;
  /** Modelo consultado. */
  model: CatalogRef;
  /** Años disponibles registrados en el catálogo. */
  years: number[];
  [key: string]: unknown;
}

/**
 * Versiones de catálogo disponibles para un modelo y año de fabricación.
 */
export interface CatalogTrims {
  /** Versión actual del catálogo vehicular. */
  catalogVersion: string;
  /** Marca consultada. */
  mark: CatalogRef;
  /** Modelo consultado. */
  model: CatalogRef;
  /** Año consultado. */
  year: number;
  /** Versiones o acabados disponibles en el catálogo. */
  trims: CatalogRef[];
  [key: string]: unknown;
}

/**
 * Solicitud de inferencia de versión de catálogo a partir de texto libre.
 */
export interface TrimInferenceRequest {
  /** Marca del vehículo a consultar. */
  mark: string;
  /** Modelo del vehículo a consultar. */
  model: string;
  /** Año de fabricación del vehículo. */
  year: number;
  /** Descripción o texto libre de la versión (por ejemplo '1.5 GL sedan mecanico'). */
  text: string;
  /** Límite máximo de versiones candidatas a devolver. */
  limit?: number | undefined;
}

/**
 * Resultado cualitativo de la inferencia de versión.
 */
export type TrimInferenceOutcome = "matched" | "no_match";

/**
 * Versión inferida con su nivel de preferencia y puntaje.
 */
export interface InferredTrim {
  /** Nombre de la versión inferida en el catálogo. */
  version: string;
  /** Preferencia relativa entre las opciones evaluadas (0 a 100, suma 100 sobre el total). */
  confidence: number;
  [key: string]: unknown;
}

/**
 * Respuesta del endpoint de inferencia de versión de catálogo.
 */
export type TrimInferenceResult =
  | (TrimInferenceResultBase & {
      outcome: "matched";
      versionConfidence: VersionConfidence;
      versionBasis: VersionBasis;
      versions: [InferredTrim, ...InferredTrim[]];
    })
  | (TrimInferenceResultBase & {
      outcome: "no_match";
      versionConfidence?: never;
      versionBasis?: never;
    });

interface TrimInferenceResultBase {
  /** Versión del catálogo utilizada. */
  catalogVersion: string;
  /** Resultado del proceso de inferencia. */
  outcome: TrimInferenceOutcome;
  /** Total de candidatos compatibles encontrados. */
  totalCandidates: number;
  /** Versiones candidatas ordenadas por preferencia decreciente. */
  versions: InferredTrim[];
  [key: string]: unknown;
}

/**
 * Solicitud de resolución previa de un vehículo antes de crear un pedido.
 */
export type VehicleResolutionRequest = {
  /** Marca del vehículo a resolver. */
  mark: string;
  /** Año de fabricación del vehículo. */
  year: number;
  /** Kilometraje informado en kilómetros (km); opcional. */
  odometerKm?: number | undefined;
  /** Región geográfica en Chile; opcional. */
  region?: string | undefined;
} & (
  | {
      /** Modelo para búsqueda exacta (excluyente con search). */
      model: string;
      /** Versión para búsqueda exacta (excluyente con search). */
      version: string;
      search?: never;
    }
  | {
      /** Texto libre para búsqueda flexible (excluyente con model y version). */
      search: string;
      model?: never;
      version?: never;
    }
);

/**
 * Resultado de la resolución previa de catálogo vehicular.
 */
export interface VehicleResolutionResult {
  /** Marca normalizada resuelta. */
  mark: string;
  /** Modelo normalizado resuelto. */
  model: string;
  /** Año de fabricación resuelto. */
  year: number;
  /** Versión normalizada resuelta. */
  version: string;
  /** Región aplicada (vacía si es precio nacional). */
  region: string;
  /** Kilometraje resuelto en kilómetros (km). */
  odometerKm: number;
  /** Metadatos completos del proceso de resolución y candidatos evaluados. */
  resolution: Resolution;
  [key: string]: unknown;
}

/**
 * Solicitud de inferencia de marca vehicular a partir de texto libre.
 */
export interface MarkInferenceRequest {
  /** Texto libre que contiene la marca (por ejemplo 'toyot'). */
  text: string;
  /** Límite de candidatas a devolver. */
  limit?: number | undefined;
}

/**
 * Marca candidata sugerida por el motor de inferencia.
 */
export interface MarkCandidate {
  /** Clave canónica de la marca. */
  mark: string;
  /** Nombre legible de la marca. */
  name: string;
  /** Confianza relativa asignada a la marca (0 a 100). */
  confidence: number;
  [key: string]: unknown;
}

/**
 * Resultado de la inferencia de marca vehicular.
 */
export interface MarkInferenceResult {
  /** Versión del catálogo consultada. */
  catalogVersion: string;
  /** Resultado de la búsqueda ('matched' | 'no_match'). */
  outcome: "matched" | "no_match" | string;
  /** Cantidad total de marcas coincidentes evaluadas. */
  totalCandidates: number;
  /** Lista de marcas sugeridas ordenadas por afinidad. */
  marks: MarkCandidate[];
  [key: string]: unknown;
}

/**
 * Solicitud de inferencia de modelo vehicular a partir de marca, año y texto libre.
 */
export interface ModelInferenceRequest {
  /** Marca del vehículo ya identificada. */
  mark: string;
  /** Año de fabricación del modelo. */
  year: number;
  /** Texto libre con el nombre del modelo. */
  text: string;
  /** Límite de modelos candidatos a devolver. */
  limit?: number | undefined;
}

/**
 * Modelo candidato sugerido por el motor de inferencia.
 */
export interface ModelCandidate {
  /** Clave canónica del modelo en catálogo. */
  model: string;
  /** Nombre descriptivo del modelo. */
  name: string;
  /** Confianza relativa del modelo (0 a 100). */
  confidence: number;
  [key: string]: unknown;
}

/**
 * Resultado de la inferencia de modelo vehicular.
 */
export interface ModelInferenceResult {
  /** Versión del catálogo consultada. */
  catalogVersion: string;
  /** Resultado de la inferencia ('matched' | 'no_match'). */
  outcome: "matched" | "no_match" | string;
  /** Total de candidatos evaluados. */
  totalCandidates: number;
  /** Modelos sugeridos ordenados por afinidad. */
  models: ModelCandidate[];
  [key: string]: unknown;
}

/**
 * Parámetros para solicitar un pedido de tasación combinando inferencia de versión y creación.
 */
export interface OrderFromTrimTextRequest {
  /** Tipo de informe contratado (por ejemplo 'general-price'). */
  reportType: ReportType;
  /** Marca del vehículo evaluado. */
  mark: string;
  /** Modelo del vehículo evaluado. */
  model: string;
  /** Año de fabricación del vehículo. */
  year: number;
  /** Texto libre que describe la versión o equipamiento. */
  trimText: string;
  /** Kilometraje aproximado en kilómetros (km); opcional. */
  odometerKm?: number | undefined;
  /** Límite de versiones candidatas a evaluar internamente. */
  limit?: number | undefined;
}

/**
 * Opciones adicionales para el método createFromTrimText.
 */
export interface OrderFromTrimTextOptions extends CallOptions {
  /** Confianza mínima de versión aceptada. Por defecto es "MEDIUM". */
  minVersionConfidence?: VersionConfidence | undefined;
}

/**
 * Resultado compuesto de la operación createFromTrimText.
 */
export interface OrderFromTrimTextResult {
  /** Pedido aceptado o estado devuelto tras la creación. */
  order: OrderAcceptance | OrderStatus;
  /** Detalle completo de la inferencia de versión realizada. */
  inference: TrimInferenceResult;
  /** Versión de catálogo seleccionada para la tasación. */
  selectedVersion: string;
}
