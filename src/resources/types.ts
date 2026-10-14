export type ReportType = "general-price" | string;

export interface OrderRequest {
  reportType: "general-price" | string;
  mark?: string;
  model?: string;
  year: number;
  version?: string;
  odometerKm: number;
}

export interface OrderAcceptance {
  orderId: string;
  reportType: string;
  status: "PENDING" | "RUNNING";
  pollAfterMs: number;
  saleId?: string;
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
