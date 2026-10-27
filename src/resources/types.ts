import type { CallOptions } from "../core/types";

export type ReportType = "general-price";

export type OrderRequest = {
  reportType: ReportType;
  mark: string;
  year: number;
  odometerKm?: number;
  region?: string;
} & (
  | { model: string; version: string; search?: never }
  | { search: string; model?: never; version?: never }
);

export interface OrderAcceptance {
  orderId: string;
  reportType: string;
  status: "PENDING" | "RUNNING";
  pollAfterMs: number;
  saleId?: string;
  resolution?: Resolution;
  [key: string]: unknown;
}

export interface OrderFailure {
  code: string;
  description: string;
  [key: string]: unknown;
}

export interface OrderResultVehicle {
  mark: string;
  model: string;
  year: number;
  version: string;
  canonicalVersion?: string;
  versionResolution: string;
  versionApplied: boolean;
  [key: string]: unknown;
}

export interface OrderMarketContext {
  region: string;
  purchaseSellerType: string;
  saleSellerType: string;
  odometerKm: number;
  [key: string]: unknown;
}

export interface OrderPriceOption {
  percentile: number;
  priceCLP: number;
  [key: string]: unknown;
}

export interface OrderPriceSide {
  sellerType: string;
  qualityScore: number;
  options: OrderPriceOption[];
  [key: string]: unknown;
}

export interface OrderMarginRange {
  purchasePercentile: number;
  salePercentile: number;
  purchasePriceCLP: number;
  salePriceCLP: number;
  marginCLP: number;
  marginPercent: number;
  [key: string]: unknown;
}

export interface OrderGrossMarginEstimate {
  qualityScore: number;
  disclaimer: string;
  maxMargin: OrderMarginRange;
  minMargin: OrderMarginRange;
  [key: string]: unknown;
}

export interface OrderFreshness {
  lastValidLogicalDay: string;
  ageDays: number;
  status: string;
  [key: string]: unknown;
}

export interface OrderMethodology {
  qualityVersion: string;
  smoothingVersion: string;
  algorithmVersion: string;
  [key: string]: unknown;
}

export interface OrderResultData {
  vehicle: OrderResultVehicle;
  marketContext: OrderMarketContext;
  purchase: OrderPriceSide;
  sale: OrderPriceSide;
  grossMarginEstimate: OrderGrossMarginEstimate;
  freshness: OrderFreshness;
  methodology: OrderMethodology;
  [key: string]: unknown;
}

export interface OrderResult {
  schemaVersion: "general-price-result-v1" | string;
  data: OrderResultData | Record<string, unknown>;
  [key: string]: unknown;
}

export interface OrderStatus {
  orderId: string;
  reportType: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  pollAfterMs?: number;
  saleId?: string;
  result?: OrderResult;
  failure?: OrderFailure;
  resolution?: Resolution;
  [key: string]: unknown;
}

export type ResolutionCertainty = "EXACT" | "HIGH" | "LOW" | string;
export type ResolutionFieldSource =
  | "EXACT"
  | "INFERRED"
  | "NATIONAL"
  | "PROVIDED"
  | "USAGE_CURVE_YEAR_MEDIAN"
  | "USAGE_CURVE_MODEL_MEDIAN"
  | string;

export interface ResolvedStringField {
  value: string;
  source: ResolutionFieldSource;
  [key: string]: unknown;
}

export interface ResolvedNumberField {
  value: number;
  source: ResolutionFieldSource;
  [key: string]: unknown;
}

export interface ResolutionCandidate {
  model: string;
  version: string;
  confidence: number;
  score: number;
  [key: string]: unknown;
}

export interface Resolution {
  catalogVersion: string;
  sourceCatalogVersion: string;
  usageCurveVersion?: string;
  referenceYear: number;
  search?: string;
  certainty: ResolutionCertainty;
  topMargin: number;
  fields: ResolutionFields;
  selected: ResolutionCandidate;
  alternatives: ResolutionCandidate[];
  [key: string]: unknown;
}

export interface ResolutionFields {
  model: ResolvedStringField;
  version: ResolvedStringField;
  region: ResolvedStringField;
  odometerKm: ResolvedNumberField;
  [key: string]: unknown;
}

export interface CatalogRef {
  key: string;
  text: string;
  [key: string]: unknown;
}

export interface CatalogMarks {
  catalogVersion: string;
  marks: CatalogRef[];
  [key: string]: unknown;
}

export interface CatalogModel extends CatalogRef {
  years: number[];
}

export interface CatalogModels {
  catalogVersion: string;
  mark: CatalogRef;
  models: CatalogModel[];
  [key: string]: unknown;
}

export interface CatalogYears {
  catalogVersion: string;
  mark: CatalogRef;
  model: CatalogRef;
  years: number[];
  [key: string]: unknown;
}

export interface CatalogTrims {
  catalogVersion: string;
  mark: CatalogRef;
  model: CatalogRef;
  year: number;
  trims: CatalogRef[];
  [key: string]: unknown;
}

export interface TrimInferenceRequest {
  mark: string;
  model: string;
  year: number;
  text: string;
  limit?: number;
}

export type TrimInferenceOutcome =
  | "matched"
  | "no_evidence"
  | "no_match"
  | string;

export interface InferredTrim {
  version: string;
  confidence: number;
  score: number;
  [key: string]: unknown;
}

export interface TrimInferenceResult {
  catalogVersion: string;
  outcome: TrimInferenceOutcome;
  totalCandidates: number;
  topMargin: number;
  versions: InferredTrim[];
  [key: string]: unknown;
}

export type VehicleResolutionRequest = {
  mark: string;
  year: number;
  odometerKm?: number;
  region?: string;
} & (
  | { model: string; version: string; search?: never }
  | { search: string; model?: never; version?: never }
);

export interface VehicleResolutionResult {
  mark: string;
  model: string;
  year: number;
  version: string;
  region: string;
  odometerKm: number;
  resolution: Resolution;
  [key: string]: unknown;
}

export interface MarkInferenceRequest {
  text: string;
  limit?: number;
}

export interface MarkCandidate {
  mark: string;
  name: string;
  confidence: number;
  score: number;
  [key: string]: unknown;
}

export interface MarkInferenceResult {
  catalogVersion: string;
  outcome: "matched" | "no_match" | string;
  totalCandidates: number;
  topMargin: number;
  marks: MarkCandidate[];
  [key: string]: unknown;
}

export interface ModelInferenceRequest {
  mark: string;
  year: number;
  text: string;
  limit?: number;
}

export interface ModelCandidate {
  model: string;
  name: string;
  confidence: number;
  score: number;
  [key: string]: unknown;
}

export interface ModelInferenceResult {
  catalogVersion: string;
  outcome: "matched" | "no_match" | string;
  totalCandidates: number;
  topMargin: number;
  models: ModelCandidate[];
  [key: string]: unknown;
}

export interface OrderFromTrimTextRequest {
  reportType: ReportType;
  mark: string;
  model: string;
  year: number;
  trimText: string;
  odometerKm?: number;
  limit?: number;
}

export interface OrderFromTrimTextOptions extends CallOptions {
  minConfidence?: number;
}

export interface OrderFromTrimTextResult {
  order: OrderAcceptance | OrderStatus;
  inference: TrimInferenceResult;
  selectedVersion: string;
}
