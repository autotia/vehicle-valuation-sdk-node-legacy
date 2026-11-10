// @ts-check
const {
  VehicleValuationClient,
} = require("@autotia/vehicle-valuation-sdk-legacy");

/**
 * Recorrido de prueba de consumo de tipos en JavaScript CommonJS.
 * Valida la visibilidad en IDE y verificación estática de campos hasta las hojas.
 *
 * @param {InstanceType<typeof VehicleValuationClient>} client
 */
async function testConsumer(client) {
  const order = await client.orders.get("ordb2b_01j7x000000000000000000000");

  if (order.status === "COMPLETED" && order.result) {
    const data = order.result.data;

    if ("sections" in data && "localization" in data) {
      // 1. Metadatos globales y vehículo
      const schemaVer = data.schemaVersion;
      const locale = data.localization.locale;
      const currencyCode = data.localization.currency.code;
      const mark = data.vehicle.mark;
      const resCertainty = data.resolution.certainty;
      const resVersionConfidence = data.resolution.versionConfidence;
      const resVersionBasis = data.resolution.versionBasis;
      const resolvedModel = data.resolution.fields.model.value;

      void [
        schemaVer,
        locale,
        currencyCode,
        mark,
        resCertainty,
        resVersionConfidence,
        resVersionBasis,
        resolvedModel,
      ];

      // 2. Sección price (price-v2)
      const priceSection = data.sections.price;
      if (
        priceSection &&
        priceSection.status === "AVAILABLE" &&
        priceSection.data
      ) {
        const qualityScore = priceSection.data.qualityScore;
        const purchaseMin = priceSection.data.purchase.minPrice;
        const purchaseMax = priceSection.data.purchase.maxPrice;
        const marginAvg = priceSection.data.grossMarginEstimate.avgGrossMargin;
        const quantile0 = priceSection.data.priceDistribution.market[0]?.price;
        const odo = priceSection.data.marketContext.odometer;

        void [
          qualityScore,
          purchaseMin,
          purchaseMax,
          marginAvg,
          quantile0,
          odo,
        ];

        // @ts-expect-error Propiedad inexistente en la sección de precio
        void priceSection.data.campoInexistente;
      }

      // 3. Sección comparables (comparables-v1)
      const compSection = data.sections.comparables;
      if (
        compSection &&
        compSection.status === "AVAILABLE" &&
        compSection.data
      ) {
        const firstComp = compSection.data.items[0];
        if (firstComp) {
          const cPrice = firstComp.price;
          const cOdo = firstComp.odometer;
          const cDistant = firstComp.distant;
          const cYearDelta = firstComp.diff.yearDelta;
          const cOdoDelta = firstComp.diff.odometerDelta;
          void [cPrice, cOdo, cDistant, cYearDelta, cOdoDelta];

          // @ts-expect-error Propiedad v1 obsoleta en comparable (era priceCLP)
          void firstComp.priceCLP;
        }
      }

      // 4. Sección usage (usage-v1)
      const usageSection = data.sections.usage;
      if (
        usageSection &&
        usageSection.status === "AVAILABLE" &&
        usageSection.data
      ) {
        const vAge = usageSection.data.vehicleAge;
        const vOdo = usageSection.data.vehicleOdometer;
        const p0Odo = usageSection.data.series[0]?.distribution[0]?.odometer;
        void [vAge, vOdo, p0Odo];

        // @ts-expect-error Propiedad inexistente en la sección de uso
        void usageSection.data.campoFicticio;
      }

      // 5. Sección listingAnalysis (listing-analysis-v2)
      const listingSection = data.sections.listingAnalysis;
      if (
        listingSection &&
        listingSection.status === "AVAILABLE" &&
        listingSection.data
      ) {
        const scoreVal = listingSection.data.score.value;
        const pubPrice = listingSection.data.listingFacts.publishedPrice;
        const publishedOdo = listingSection.data.listingFacts.publishedOdometer;
        const entryOffer = listingSection.data.negotiationBand?.entryOffer;
        const odoMatches = listingSection.data.odometerReading?.matches;
        void [scoreVal, pubPrice, publishedOdo, entryOffer, odoMatches];

        // @ts-expect-error Propiedad inexistente en análisis de publicación
        void listingSection.data.noExiste;
      }

      // 6. Sección priceHistory (price-history-v1)
      const histSection = data.sections.priceHistory;
      if (
        histSection &&
        histSection.status === "AVAILABLE" &&
        histSection.data
      ) {
        const wDays = histSection.data.windowDays;
        const pList = histSection.data.percentiles;
        const firstPointDate = histSection.data.market.national[0]?.date;
        const firstPointPrice = histSection.data.market.national[0]?.prices[0];
        void [wDays, pList, firstPointDate, firstPointPrice];

        // @ts-expect-error Propiedad inexistente en histórico de precios
        void histSection.data.errorProp;
      }

      // 7. Sección desconocida conservada vía firma de índice abierta
      const customSection = data.sections["custom-section"];
      if (customSection) {
        const cSchema = customSection.schema;
        const cStatus = customSection.status;
        void [cSchema, cStatus];
      }

      // @ts-expect-error Propiedad v1 obsoleta en OrderResultData (era marketContext)
      void data.marketContext;
    }
  }
}

module.exports = { testConsumer };
