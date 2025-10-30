import "dotenv/config";
import { z } from "zod";
import { SUPPORTED_CHAINS, type SupportedChain } from "../../src/types";

const DEFAULT_PORT = 8787;

const envSchema = z.object({
  API_BASE_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().positive().optional(),
  CHAIN_SET: z.string().optional(),
  CHAIN: z.string().optional(),
  GAS_UNITS: z.coerce.number().positive().optional(),
  CALLDATA_BYTES: z.coerce.number().int().min(0).optional(),
  NETWORK: z.string().default("base"),
  PRIVATE_KEY: z.string().min(1, "PRIVATE_KEY is required to sign x402 payments."),
});

type RawEnv = z.infer<typeof envSchema>;

export interface PayScriptConfig {
  baseUrl: string;
  chainSet: SupportedChain[];
  gasUnits: number;
  calldataBytes: number;
  network: string;
  privateKey: string;
}

export function loadConfig(): PayScriptConfig {
  const parsed = envSchema.parse(process.env) as RawEnv;

  const baseUrl =
    parsed.API_BASE_URL ??
    `http://localhost:${parsed.PORT ? String(parsed.PORT) : DEFAULT_PORT}`;

  const chainSetValues = deriveChainSet(parsed.CHAIN_SET, parsed.CHAIN);

  return {
    baseUrl,
    chainSet: chainSetValues,
    gasUnits: parsed.GAS_UNITS ?? 21_000,
    calldataBytes: parsed.CALLDATA_BYTES ?? 0,
    network: parsed.NETWORK,
    privateKey: parsed.PRIVATE_KEY,
  };
}

function deriveChainSet(
  rawChainSet: string | undefined,
  fallbackChain: string | undefined
): SupportedChain[] {
  const chainSchema = z.enum(SUPPORTED_CHAINS);

  const normalize = (value: string | undefined): SupportedChain | null => {
    if (!value) return null;
    try {
      return chainSchema.parse(value.trim().toLowerCase());
    } catch {
      return null;
    }
  };

  if (rawChainSet && rawChainSet.trim().length > 0) {
    const unique = Array.from(
      new Set(
        rawChainSet
          .split(",")
          .map((entry) => normalize(entry))
          .filter((value): value is SupportedChain => value !== null)
      )
    );
    if (unique.length > 0) {
      return unique;
    }
  }

  const fallback = normalize(fallbackChain);
  if (fallback) {
    return [fallback];
  }

  return [...SUPPORTED_CHAINS];
}
