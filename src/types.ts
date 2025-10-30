export const SUPPORTED_CHAINS = ["ethereum", "base", "arbitrum", "bsc"] as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export type BusyLevel = "low" | "moderate" | "high";

export interface ChainConfig {
  label: string;
  nativeSymbol: string;
  defaultUsdPrice: number;
  baselineGasGwei: number;
  tipMultiplier: number;
  calldataGasPerByte: number;
  blockTimeSeconds: number;
}

export interface ResolvedChainConfig extends ChainConfig {
  usdPrice: number;
}

export interface GasQuote {
  gasPriceGwei: number;
  timestamp: number;
}

export interface ChainEvaluation {
  chain: SupportedChain;
  config: ResolvedChainConfig;
  quote: GasQuote;
  totalGasUnits: number;
  feeNative: number;
  feeUsd: number;
  busyLevel: BusyLevel;
  busyScore: number;
  priorityFeeGwei: number;
  etaSeconds: number;
}
