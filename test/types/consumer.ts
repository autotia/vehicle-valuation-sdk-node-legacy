import type {
  OrderResultData,
  OrderStatus,
  PriceSectionData,
  ReportSection,
  TrimInferenceResult,
  VehicleValuationClient,
  VersionBasis,
  VersionConfidence,
} from "@autotia/vehicle-valuation-sdk-legacy";

/**
 * Prueba de consumo TypeScript estricto con anotaciones explícitas de tipos (Legacy SDK).
 */
export async function testTypeScriptConsumer(
  client: VehicleValuationClient,
): Promise<void> {
  const order: OrderStatus = await client.orders.get(
    "ordb2b_01j7x000000000000000000000",
  );

  if (order.status === "COMPLETED" && order.result) {
    const data = order.result.data;

    if ("sections" in data && "localization" in data) {
      const resultData: OrderResultData = data as OrderResultData;

      // 1. Verificación explícita de metadatos globales
      const schemaVer: "report-result-v2" | string = resultData.schemaVersion;
      const locale: string = resultData.localization.locale;
      const currCode: string = resultData.localization.currency.code;
      const decimals: number = resultData.localization.currency.decimals;
      const mark: string = resultData.vehicle.mark;
      const versionApplied: boolean = resultData.vehicle.versionApplied;
      const certainty: string = resultData.resolution.certainty;
      const versionConf: VersionConfidence | undefined =
        resultData.resolution.versionConfidence;
      const versionBasis: VersionBasis | undefined =
        resultData.resolution.versionBasis;
      const odoResolved: number | undefined =
        resultData.resolution.fields.odometer?.value;

      void [
        schemaVer,
        locale,
        currCode,
        decimals,
        mark,
        versionApplied,
        certainty,
        versionConf,
        versionBasis,
        odoResolved,
      ];

      // 2. Sección price: opcionalidad explícita y tipos numéricos
      const priceSection:
        | ReportSection<"price-v2", PriceSectionData>
        | undefined = resultData.sections.price;

      if (
        priceSection &&
        priceSection.status === "AVAILABLE" &&
        priceSection.data
      ) {
        const qualityScore: number = priceSection.data.qualityScore;
        const purchaseMin: number = priceSection.data.purchase.minPrice;
        const purchaseMax: number = priceSection.data.purchase.maxPrice;
        const saleMin: number = priceSection.data.sale.minPrice;
        const saleMax: number = priceSection.data.sale.maxPrice;
        const avgMargin: number =
          priceSection.data.grossMarginEstimate.avgGrossMargin;
        const odoKm: number = priceSection.data.marketContext.odometer;
        const quantilePrice: number | undefined =
          priceSection.data.priceDistribution.market[0]?.price;

        void [
          qualityScore,
          purchaseMin,
          purchaseMax,
          saleMin,
          saleMax,
          avgMargin,
          odoKm,
          quantilePrice,
        ];

        // @ts-expect-error Propiedad inexistente en la sección price
        void priceSection.data.noExisteCampo;
      }

      // 3. Sección comparables: items, odómetro y flag distant
      const compSection = resultData.sections.comparables;
      if (
        compSection &&
        compSection.status === "AVAILABLE" &&
        compSection.data
      ) {
        const item = compSection.data.items[0];
        if (item) {
          const itemPrice: number = item.price;
          const itemOdo: number = item.odometer;
          const isDistant: boolean = item.distant;
          const odoDelta: number = item.diff.odometerDelta;
          const sameVersion: boolean = item.diff.sameVersion;
          const itemImage: string | undefined = item.imageUrl;
          void [
            itemPrice,
            itemOdo,
            isDistant,
            odoDelta,
            sameVersion,
            itemImage,
          ];

          // @ts-expect-error Propiedad obsoleta v1 removida
          void item.priceCLP;
        }
      }

      // 4. Sección usage: series y cuantiles
      const usageSection = resultData.sections.usage;
      if (
        usageSection &&
        usageSection.status === "AVAILABLE" &&
        usageSection.data
      ) {
        const vAge: number = usageSection.data.vehicleAge;
        const vOdo: number = usageSection.data.vehicleOdometer;
        const lowerFence: number | undefined =
          usageSection.data.series[0]?.lowerFence;
        void [vAge, vOdo, lowerFence];

        // @ts-expect-error Propiedad inexistente en usage
        void usageSection.data.badField;
      }

      // 5. Sección listingAnalysis: score, hechos objetivos y banda de negociación
      const listingSection = resultData.sections.listingAnalysis;
      if (
        listingSection &&
        listingSection.status === "AVAILABLE" &&
        listingSection.data
      ) {
        const scoreValue: number = listingSection.data.score.value;
        const publishedPrice: number =
          listingSection.data.listingFacts.publishedPrice;
        const entryOffer: number | undefined =
          listingSection.data.negotiationBand?.entryOffer;
        const matches: boolean | undefined =
          listingSection.data.odometerReading?.matches;
        void [scoreValue, publishedPrice, entryOffer, matches];

        // @ts-expect-error Propiedad inexistente en listingAnalysis
        void listingSection.data.campoInvalido;
      }

      // 6. Sección priceHistory: precios como arreglo de números
      const histSection = resultData.sections.priceHistory;
      if (
        histSection &&
        histSection.status === "AVAILABLE" &&
        histSection.data
      ) {
        const windowDays: number = histSection.data.windowDays;
        const percentiles: number[] = histSection.data.percentiles;
        const point = histSection.data.market.national[0];
        if (point) {
          const date: string = point.date;
          const prices: number[] = point.prices;
          void [date, prices];
        }
        void [windowDays, percentiles];

        const regionSeries = histSection.data.market.regions[0];
        if (regionSeries) {
          const regionKind: "region" | "zone" | string = regionSeries.kind;
          const regionCode: string = regionSeries.region;
          void [regionKind, regionCode];
        }

        // @ts-expect-error Propiedad inexistente en priceHistory
        void histSection.data.fakeProp;
      }

      // 7. Sección desconocida mediante index signature
      const unknownSection:
        | ReportSection<string, Record<string, unknown>>
        | undefined = resultData.sections["future-section"];
      if (unknownSection) {
        const schema: string = unknownSection.schema;
        const status: string = unknownSection.status;
        void [schema, status];
      }

      // @ts-expect-error Propiedad obsoleta de nivel superior v1
      void resultData.purchase;
    }
  }

  const inference: TrimInferenceResult = await client.catalog.inferTrim({
    mark: "Peugeot",
    model: "208",
    year: 2024,
    text: "208 PURETECH 4X2 1.2",
  });
  const infConfidence: VersionConfidence | undefined =
    inference.versionConfidence;
  const infBasis: VersionBasis | undefined = inference.versionBasis;
  void [infConfidence, infBasis];
}
