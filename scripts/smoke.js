"use strict";

if (process.env.AUTOTIA_SMOKE !== "1") {
  process.stdout.write(
    "Smoke desactivado. Define AUTOTIA_SMOKE=1 y credenciales de servidor para habilitarlo.\n",
  );
  process.exit(0);
}

const sdk = require("../dist");
const client = new sdk.VehicleValuationClient({
  environment: "dev",
  clientId: process.env.AUTOTIA_CLIENT_ID,
  clientSecret: process.env.AUTOTIA_CLIENT_SECRET,
});
client.catalog
  .listMarks()
  .then((catalog) => {
    process.stdout.write(
      `Conexión correcta; versión de catálogo: ${catalog.catalogVersion}\n`,
    );
  })
  .catch((error) => {
    process.stderr.write(`${error.name}: ${error.message}\n`);
    process.exitCode = 1;
  });
