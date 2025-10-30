import { SUPPORTED_CHAINS, SupportedChain, ChainConfig, ResolvedChainConfig } from "./types";
import { parseUsd } from "./utils";

const DEFAULT_CHAIN_CONFIG: Record<SupportedChain, ChainConfig> = {
  ethereum: {
    label: "Ethereum",
    nativeSymbol: "ETH",
    defaultUsdPrice: 3600,
    baselineGasGwei: 30,
    tipMultiplier: 0.12,
    calldataGasPerByte: 16,
    blockTimeSeconds: 12,
  },
  base: {
    label: "Base",
    nativeSymbol: "ETH",
    defaultUsdPrice: 3600,
    baselineGasGwei: 0.25,
    tipMultiplier: 0.18,
    calldataGasPerByte: 16,
    blockTimeSeconds: 2,
  },
  arbitrum: {
    label: "Arbitrum One",
    nativeSymbol: "ETH",
    defaultUsdPrice: 3600,
    baselineGasGwei: 0.7,
    tipMultiplier: 0.15,
    calldataGasPerByte: 16,
    blockTimeSeconds: 2,
  },
  bsc: {
    label: "BNB Smart Chain",
    nativeSymbol: "BNB",
    defaultUsdPrice: 325,
    baselineGasGwei: 3,
    tipMultiplier: 0.12,
    calldataGasPerByte: 16,
    blockTimeSeconds: 3,
  },
};

export function resolveChainConfig(): Record<SupportedChain, ResolvedChainConfig> {
  return Object.fromEntries(
    SUPPORTED_CHAINS.map((chain) => {
      const defaults = DEFAULT_CHAIN_CONFIG[chain];
      const chainOverride = parseUsd(
        process.env[`${chain.toUpperCase()}_USD_PRICE` as keyof NodeJS.ProcessEnv]
      );
      const symbolOverride = parseUsd(
        process.env[`${defaults.nativeSymbol.toUpperCase()}_USD_PRICE` as keyof NodeJS.ProcessEnv]
      );

      return [
        chain,
        {
          ...defaults,
          usdPrice: chainOverride ?? symbolOverride ?? defaults.defaultUsdPrice,
        },
      ];
    })
  ) as Record<SupportedChain, ResolvedChainConfig>;
}

export const CHAIN_CONFIG = DEFAULT_CHAIN_CONFIG;
