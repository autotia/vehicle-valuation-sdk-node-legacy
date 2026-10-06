export interface ValuationRequest {
  mark?: string;
  model?: string;
  year: number;
  version?: string;
  odometerKm: number;
}

export interface ValuationAcceptance {
  valuationId: string;
  status: "PENDING" | "RUNNING";
  pollAfterMs: number;
}

export interface ValuationStatus {
  valuationId: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  result?: ValuationResult;
  failure?: { code: string; description: string };
}

export interface ValuationResult {
  schemaVersion: string;
  data: Record<string, unknown>;
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
