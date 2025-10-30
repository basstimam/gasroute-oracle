import { loadConfig } from "./lib/env";
import { executePaidRequest } from "./lib/x402";

async function main(): Promise<void> {
  const config = loadConfig();
  console.log("Requesting recommendRoute with:");
  console.log(
    JSON.stringify(
      {
        baseUrl: config.baseUrl,
        chain_set: config.chainSet,
        gas_units_est: config.gasUnits,
        calldata_size_bytes: config.calldataBytes,
        network: config.network,
      },
      null,
      2
    )
  );

  const result = await executePaidRequest(config);

  console.log("status:", result.status);
  console.log("response:", result.responseBody);
  if (result.paymentResponse) {
    console.log("payment:", result.paymentResponse);
  } else {
    console.log("payment: <none>");
  }
  if (result.paymentError) {
    console.log("payment-error:", result.paymentError);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
