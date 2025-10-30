import {
  BusyLevel,
  ChainEvaluation,
  ResolvedChainConfig,
  SupportedChain,
} from "./types";
import { fetchGasQuote } from "./gas";
import { roundTo } from "./utils";

export async function evaluateChain(
  configs: Record<SupportedChain, ResolvedChainConfig>,
  chain: SupportedChain,
  gasUnits: number,
  calldataBytes: number
): Promise<ChainEvaluation> {
  const config = configs[chain];
  const quote = await fetchGasQuote(chain);

  const callDataGas = calldataBytes * config.calldataGasPerByte;
  const totalGasUnits = gasUnits + callDataGas;
  const gasPriceEth = quote.gasPriceGwei / 1_000_000_000;
  const feeNativeRaw = gasPriceEth * totalGasUnits;
  const feeNative = roundTo(feeNativeRaw, 8);
  const feeUsd = roundTo(feeNative * config.usdPrice, 4);

  const busyScore = config.baselineGasGwei
    ? quote.gasPriceGwei / config.baselineGasGwei
    : 1;
  const busyLevel = classifyBusyLevel(busyScore);
  const priorityFeeGwei = roundTo(quote.gasPriceGwei * config.tipMultiplier, 6);
  const etaSeconds = estimateEtaSeconds(config, busyScore);

  return {
    chain,
    config,
    quote,
    totalGasUnits,
    feeNative,
    feeUsd,
    busyLevel,
    busyScore,
    priorityFeeGwei,
    etaSeconds,
  };
}

export function buildTipHint(evaluation: ChainEvaluation): string {
  const priority = evaluation.priorityFeeGwei;
  const eta = evaluation.etaSeconds;
  return `Add ≈${priority} gwei priority (busy: ${evaluation.busyLevel}) for ~${eta}s confirmation on ${evaluation.config.label}.`;
}

export function classifyBusyLevel(score: number): BusyLevel {
  if (!Number.isFinite(score) || score <= 0.6) {
    return "low";
  }
  if (score <= 1.4) {
    return "moderate";
  }
  return "high";
}

export function estimateEtaSeconds(
  config: ResolvedChainConfig,
  busyScore: number
): number {
  if (!Number.isFinite(busyScore) || busyScore <= 0) {
    return Math.round(config.blockTimeSeconds * 2);
  }
  if (busyScore < 0.8) {
    return Math.round(config.blockTimeSeconds * 2);
  }
  if (busyScore < 1.25) {
    return Math.round(config.blockTimeSeconds * 4);
  }
  if (busyScore < 2) {
    return Math.round(config.blockTimeSeconds * 6);
  }
  return Math.round(config.blockTimeSeconds * 10);
}

export function rankAlternatives(
  evaluations: ChainEvaluation[],
  winner: ChainEvaluation
) {
  return evaluations
    .filter((evaluation) => evaluation.chain !== winner.chain)
    .sort((a, b) => a.feeUsd - b.feeUsd);
}
