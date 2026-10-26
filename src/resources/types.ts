import type { CallOptions } from "../core/types";

export type ReportType = "general-price" | string;

export interface OrderRequest {
  reportType: "general-price" | string;
  mark: string;
  model?: string;
  year: number;
  version?: string;
  search?: string;
  odometerKm?: number;
  region?: string;
}

export interface OrderAcceptance {
  orderId: string;
  reportType: string;
  status: "PENDING" | "RUNNING";
  pollAfterMs: number;
  saleId?: string;
  resolution?: Resolution;
}

export interface OrderFailure {
  code: string;
  description: string;
}

export interface OrderResultVehicle {
  mark: string;
  model: string;
  year: number;
  version: string;
  canonicalVersion?: string;
  versionResolution: string;
  versionApplied: boolean;
}

export interface OrderMarketContext {
  region: string;
  purchaseSellerType: string;
  saleSellerType: string;
  odometerKm: number;
}

export interface OrderPriceOption {
  percentile: number;
  priceCLP: number;
}

export interface OrderPriceSide {
  sellerType: string;
  qualityScore: number;
  options: OrderPriceOption[];
}

export interface OrderMarginRange {
  purchasePercentile: number;
  salePercentile: number;
  purchasePriceCLP: number;
  salePriceCLP: number;
  marginCLP: number;
  marginPercent: number;
}

export interface OrderGrossMarginEstimate {
  qualityScore: number;
  disclaimer: string;
  maxMargin: OrderMarginRange;
  minMargin: OrderMarginRange;
}

export interface OrderFreshness {
  lastValidLogicalDay: string;
  ageDays: number;
  status: string;
}

export interface OrderMethodology {
  qualityVersion: string;
  smoothingVersion: string;
  algorithmVersion: string;
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
}

export interface OrderStatus {
  orderId: string;
  reportType: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  saleId?: string;
  result?: OrderResult;
  failure?: OrderFailure;
  resolution?: Resolution;
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
}

export interface ResolvedNumberField {
  value: number;
  source: ResolutionFieldSource;
}

export interface ResolutionCandidate {
  model: string;
  version: string;
  confidence: number;
  score: number;
}

export interface Resolution {
  catalogVersion: string;
  sourceCatalogVersion: string;
  usageCurveVersion?: string;
  referenceYear: number;
  search?: string;
  certainty: ResolutionCertainty;
  topMargin: number;
  fields: {
    model: ResolvedStringField;
    version: ResolvedStringField;
    region: ResolvedStringField;
    odometerKm: ResolvedNumberField;
  };
  selected: ResolutionCandidate;
  alternatives: ResolutionCandidate[];
}

export interface CatalogRef {
  key: string;
  text: string;
}

export interface CatalogMarks {
  catalogVersion: string;
  marks: CatalogRef[];
}

export interface CatalogModel extends CatalogRef {
  years: number[];
}

export interface CatalogModels {
  catalogVersion: string;
  mark: CatalogRef;
  models: CatalogModel[];
}

export interface CatalogYears {
  catalogVersion: string;
  mark: CatalogRef;
  model: CatalogRef;
  years: number[];
}

export interface CatalogTrims {
  catalogVersion: string;
  mark: CatalogRef;
  model: CatalogRef;
  year: number;
  trims: CatalogRef[];
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
}

export interface TrimInferenceResult {
  catalogVersion: string;
  outcome: TrimInferenceOutcome;
  totalCandidates: number;
  topMargin: number;
  versions: InferredTrim[];
}

export interface VehicleResolutionRequest {
  mark: string;
  year: number;
  model?: string;
  version?: string;
  search?: string;
  odometerKm?: number;
  region?: string;
}

export interface VehicleResolutionResult {
  mark: string;
  model: string;
  year: number;
  version: string;
  region: string;
  odometerKm: number;
  resolution: Resolution;
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
}

export interface MarkInferenceResult {
  catalogVersion: string;
  outcome: "matched" | "no_match" | string;
  totalCandidates: number;
  topMargin: number;
  marks: MarkCandidate[];
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
}

export interface ModelInferenceResult {
  catalogVersion: string;
  outcome: "matched" | "no_match" | string;
  totalCandidates: number;
  topMargin: number;
  models: ModelCandidate[];
}

export interface OrderFromTrimTextRequest {
  reportType: "general-price" | string;
  mark: string;
  model: string;
  year: number;
  trimText: string;
  odometerKm: number;
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
