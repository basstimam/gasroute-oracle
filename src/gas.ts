import { SupportedChain, GasQuote } from "./types";
import { toNumber, toUnixMs, roundTo, weiToGwei } from "./utils";

export async function fetchGasQuote(chain: SupportedChain): Promise<GasQuote> {
  switch (chain) {
    case "ethereum":
      return fetchEthereumGasQuote();
    case "base":
      return fetchBaseGasQuote();
    case "arbitrum":
      return fetchArbitrumGasQuote();
    case "bsc":
      return fetchBscGasQuote();
    default:
      throw new Error(`Unsupported chain '${chain}'.`);
  }
}

async function fetchEthereumGasQuote(): Promise<GasQuote> {
  const apiKey = process.env.BLOCKNATIVE_API_KEY;
  if (!apiKey) {
    throw new Error("BLOCKNATIVE_API_KEY must be configured to fetch ethereum gas prices.");
  }

  const response = await fetch("https://api.blocknative.com/gasprices/blockprices", {
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      "User-Agent": "gasroute-oracle/0.2",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Blocknative request failed (${response.status} ${response.statusText}).`
    );
  }

  const payload = (await response.json()) as any;
  const block = Array.isArray(payload?.blockPrices) ? payload.blockPrices[0] : undefined;
  const candidate = Array.isArray(block?.estimatedPrices)
    ? block.estimatedPrices.find(
        (item: any) => typeof item?.price === "number" && Number.isFinite(item.price)
      ) ?? block.estimatedPrices[0]
    : undefined;
  const priceGwei = Number(candidate?.price);

  if (!Number.isFinite(priceGwei)) {
    throw new Error("Blocknative response did not include a valid gas price.");
  }

  const timestampValue = block?.estimatedTimestamp ?? block?.blockTimestamp;
  const timestamp = toUnixMs(timestampValue) ?? Date.now();

  return {
    gasPriceGwei: roundTo(priceGwei, 6),
    timestamp,
  };
}

async function fetchBaseGasQuote(): Promise<GasQuote> {
  const endpoints = [
    process.env.BASE_GAS_API_URL,
    "https://gas.api.base.org/v1/gas-prices",
    "https://gas.api.base.org/latest",
  ].filter(Boolean) as string[];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "gasroute-oracle/0.2",
        },
      });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as any;
      const priceCandidate =
        toNumber(
          payload?.data?.gasPrice?.instant?.price ??
            payload?.data?.gasPrice?.fast?.price ??
            payload?.gasPrice
        ) ??
        toNumber(payload?.data?.suggestedGasFees?.maxFeePerGas) ??
        toNumber(payload?.result?.maxFeePerGas);
      const parsedPrice = Number(priceCandidate);

      if (Number.isFinite(parsedPrice)) {
        const timestamp =
          toUnixMs(payload?.data?.timestamp) ?? toUnixMs(payload?.timestamp) ?? Date.now();
        return { gasPriceGwei: roundTo(parsedPrice, 6), timestamp };
      }
    } catch {
      continue;
    }
  }

  return fetchGasQuoteFromRpc(
    process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    "base"
  );
}

async function fetchArbitrumGasQuote(): Promise<GasQuote> {
  const endpoints = [
    process.env.ARBITRUM_GAS_API_URL,
    "https://gas.arbitrum.io/v1/arb1",
    "https://gas.arbitrum.io/v1/arb1/price",
    "https://gas.arbitrum.io/v1/arb1/fees",
  ].filter(Boolean) as string[];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "gasroute-oracle/0.2",
        },
      });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as any;
      const priceCandidate =
        toNumber(payload?.result?.gasPrice) ??
        toNumber(payload?.data?.gasPrice?.fast?.price) ??
        toNumber(payload?.gasPrice);
      const parsedPrice = Number(priceCandidate);

      if (Number.isFinite(parsedPrice)) {
        const timestamp =
          toUnixMs(payload?.timestamp) ?? toUnixMs(payload?.data?.timestamp) ?? Date.now();
        return { gasPriceGwei: roundTo(parsedPrice, 6), timestamp };
      }
    } catch {
      continue;
    }
  }

  return fetchGasQuoteFromRpc(
    process.env.ARBITRUM_RPC_URL ?? "https://arb1.arbitrum.io/rpc",
    "arbitrum"
  );
}

async function fetchBscGasQuote(): Promise<GasQuote> {
  const apiKey =
    process.env.ETHERSCAN_API_KEY ?? process.env.BSCSCAN_API_KEY;

  if (apiKey) {
    try {
      const url = new URL("https://api.etherscan.io/v2/api");
      url.searchParams.set("chainid", "56");
      url.searchParams.set("module", "gastracker");
      url.searchParams.set("action", "gasoracle");
      url.searchParams.set("apikey", apiKey);

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "gasroute-oracle/0.2",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Etherscan (BSC) request failed (${response.status} ${response.statusText}).`
        );
      }

      const payload = (await response.json()) as any;
      const result = payload?.result ?? payload;
      const parsedPrice = Number(
        toNumber(
          result?.ProposeGasPrice ??
            result?.FastGasPrice ??
            result?.gasPrice
        )
      );

      if (Number.isFinite(parsedPrice)) {
        const timestamp =
          toUnixMs(result?.timestamp) ??
          toUnixMs(result?.LastBlock) ??
          Date.now();

        return {
          gasPriceGwei: roundTo(parsedPrice, 6),
          timestamp,
        };
      }
    } catch (error) {
      console.warn(
        "[gasroute] Failed to fetch BSC gas via Etherscan v2, falling back to RPC:",
        (error as Error).message
      );
    }
  }

  return fetchGasQuoteFromRpc(
    process.env.BSC_RPC_URL ?? "https://bsc.publicnode.com",
    "bsc"
  );
}

async function fetchGasQuoteFromRpc(
  rpcUrl: string,
  chainName: string
): Promise<GasQuote> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "gasroute-oracle/0.2",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_gasPrice",
      params: [],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `${chainName} RPC gas price request failed (${response.status} ${response.statusText}).`
    );
  }

  const payload = (await response.json()) as any;
  const rawHex = typeof payload?.result === "string" ? payload.result : null;
  const wei = rawHex ? BigInt(rawHex) : null;

  if (wei === null) {
    throw new Error(`${chainName} RPC response is missing a gas price result.`);
  }

  const gasPriceGwei = weiToGwei(wei);

  return {
    gasPriceGwei: roundTo(gasPriceGwei, 6),
    timestamp: Date.now(),
  };
}
