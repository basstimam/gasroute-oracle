import { z } from "zod";
import { createAgentApp, AgentKitConfig } from "@lucid-dreams/agent-kit";
import type { AgentMeta, EntrypointDef } from "@lucid-dreams/agent-kit";

import {
  SUPPORTED_CHAINS,
  SupportedChain,
  ChainEvaluation,
} from "./types";
import { resolveChainConfig } from "./config";
import {
  evaluateChain,
  buildTipHint,
  rankAlternatives,
} from "./recommendation";

const configOverrides: AgentKitConfig = {
  payments: {
    facilitatorUrl:
      (process.env.FACILITATOR_URL as any) ??
      "https://facilitator.daydreams.systems",
    payTo:
      (process.env.PAY_TO as `0x${string}`) ??
      "0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429",
    network: (process.env.NETWORK as any) ?? "base",
    defaultPrice: process.env.DEFAULT_PRICE ?? "0.02",
  },
};

const agentMeta: AgentMeta = {
  name: "GasRoute Oracle",
  version: "0.2.0",
  description:
    "Recommends the cheapest EVM chain and timing hints for contract calls across Ethereum, Base, Arbitrum, and BSC.",
};

const { app, addEntrypoint, payments } = createAgentApp(agentMeta, {
  config: configOverrides,
});

const recommendRouteEntrypoint: EntrypointDef = {
  key: "recommendRoute",
  description:
    "Analyse gas costs across the provided chains and return the cheapest route with timing guidance.",
  input: z.object({
    chain_set: z
      .array(z.enum(SUPPORTED_CHAINS))
      .nonempty()
      .describe("Candidate chains to evaluate."),
    calldata_size_bytes: z
      .number()
      .int()
      .min(0)
      .describe("Calldata size in bytes expected for the transaction."),
    gas_units_est: z
      .number()
      .positive()
      .describe("Base gas estimate (without calldata) for the transaction."),
  }),
  output: z.object({
    chain: z.enum(SUPPORTED_CHAINS),
    fee_native: z.number(),
    fee_usd: z.number(),
    busy_level: z.enum(["low", "moderate", "high"]),
    tip_hint: z.string(),
    evaluated_at: z.number(),
    alternatives: z
      .array(
        z.object({
          chain: z.enum(SUPPORTED_CHAINS),
          fee_native: z.number(),
          fee_usd: z.number(),
          busy_level: z.enum(["low", "moderate", "high"]),
          tip_hint: z.string(),
        })
      )
      .optional(),
  }),
  price: "0.02 USDC",
  async handler(ctx) {
    const chainSet = Array.from(
      new Set(ctx.input.chain_set)
    ) as SupportedChain[];
    const gasUnits = Number(ctx.input.gas_units_est);
    const calldataBytes = Number(ctx.input.calldata_size_bytes);

    const configs = resolveChainConfig();
    const evaluations = await Promise.all(
      chainSet.map((chain) => evaluateChain(configs, chain, gasUnits, calldataBytes))
    );

    const best = evaluations.reduce((prev, current) =>
      current.feeUsd < prev.feeUsd ? current : prev
    );

    const alternatives = rankAlternatives(evaluations, best).map(toPublicEvaluation);

    return {
      output: {
        chain: best.chain,
        fee_native: best.feeNative,
        fee_usd: best.feeUsd,
        busy_level: best.busyLevel,
        tip_hint: buildTipHint(best),
        evaluated_at: best.quote.timestamp,
        alternatives: alternatives.length ? alternatives : undefined,
      },
      model: "gasroute-oracle:v1",
    };
  },
};

addEntrypoint(recommendRouteEntrypoint);

function toPublicEvaluation(evaluation: ChainEvaluation) {
  return {
    chain: evaluation.chain,
    fee_native: evaluation.feeNative,
    fee_usd: evaluation.feeUsd,
    busy_level: evaluation.busyLevel,
    tip_hint: buildTipHint(evaluation),
  };
}

export { app, agentMeta, recommendRouteEntrypoint, payments };
