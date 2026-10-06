import { type RequestConfig, requestData } from "../core/request";
import type { CallOptions } from "../core/types";
import type {
  CatalogMarks,
  CatalogModels,
  CatalogTrims,
  CatalogYears,
} from "./types";

export class CatalogResource {
  private readonly config: RequestConfig;

  public constructor(config: RequestConfig) {
    this.config = config;
  }

  public listMarks(options: CallOptions = {}): Promise<CatalogMarks | null> {
    return requestData(this.config, "GET", "/v1/catalog", undefined, options);
  }

  public listModels(
    mark: string,
    options: CallOptions = {},
  ): Promise<CatalogModels | null> {
    return requestData(
      this.config,
      "GET",
      `/v1/catalog/${encodeURIComponent(mark)}`,
      undefined,
      options,
    );
  }

  public listYears(
    mark: string,
    model: string,
    options: CallOptions = {},
  ): Promise<CatalogYears | null> {
    return requestData(
      this.config,
      "GET",
      `/v1/catalog/${encodeURIComponent(mark)}/${encodeURIComponent(model)}`,
      undefined,
      options,
    );
  }

  public listTrims(
    mark: string,
    model: string,
    year: number,
    options: CallOptions = {},
  ): Promise<CatalogTrims | null> {
    return requestData(
      this.config,
      "GET",
      `/v1/catalog/${encodeURIComponent(mark)}/${encodeURIComponent(model)}/${encodeURIComponent(String(year))}`,
      undefined,
      options,
    );
  }
}
