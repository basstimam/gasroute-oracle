import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { recommendRouteEntrypoint } from "../src/agent";
import type { SupportedChain } from "../src/types";

type Json = Record<string, any>;

type FetchStub = {
  match: (url: string) => boolean;
  response: Json;
};

const TIMESTAMP = 1_760_000_000_000;

const baseStub: FetchStub = {
  match: (url) => url.includes("gas.api.base.org"),
  response: {
    data: {
      timestamp: TIMESTAMP,
      gasPrice: {
        instant: { price: 0.25 },
      },
    },
  },
};

const fetchStubs: FetchStub[] = [
  {
    match: (url) => url.includes("blocknative"),
    response: {
      blockPrices: [
        {
          estimatedTimestamp: TIMESTAMP,
          estimatedPrices: [{ price: 40 }],
        },
      ],
    },
  },
  baseStub,
  {
    match: (url) => url.includes("gas.arbitrum.io"),
    response: {
      gasPrice: 0.9,
      timestamp: TIMESTAMP,
    },
  },
  {
    match: (url) => url.includes("bscscan.com"),
    response: {
      result: {
        ProposeGasPrice: "3",
        timestamp: TIMESTAMP,
      },
    },
  },
  {
    match: () => true,
    response: {
      result: "0x3b9aca00", // fallback 1 gwei
    },
  },
];

const originalFetch = globalThis.fetch;
const baseStubSnapshot = structuredClone(baseStub.response);

beforeEach(() => {
  process.env.BLOCKNATIVE_API_KEY = "test";
  process.env.BSCSCAN_API_KEY = "test";
  baseStub.response = structuredClone(baseStubSnapshot);
  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.href
        : input.url;
    const stub = fetchStubs.find((candidate) => candidate.match(url));
    if (!stub) {
      throw new Error(`No stub configured for ${url}`);
    }
    return new Response(JSON.stringify(stub.response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.BLOCKNATIVE_API_KEY;
  delete process.env.BSCSCAN_API_KEY;
});

describe("recommendRoute entrypoint", () => {
  it("chooses the cheapest chain and returns structured output", async () => {
    const result = await recommendRouteEntrypoint.handler!({
      key: "recommendRoute",
      input: {
        chain_set: ["ethereum", "base"] as SupportedChain[],
        calldata_size_bytes: 128,
        gas_units_est: 80_000,
      },
      headers: new Headers(),
      signal: new AbortController().signal,
      runId: "test-run",
    });

    expect(result.output.chain).toBe("base");
    expect(result.output.fee_native).toBeGreaterThan(0);
    expect(result.output.fee_usd).toBeGreaterThan(0);
    expect(["low", "moderate", "high"]).toContain(result.output.busy_level);
    expect(result.output.tip_hint.length).toBeGreaterThan(10);
    expect(result.output.evaluated_at).toBe(TIMESTAMP);
    expect(result.output.alternatives?.[0]?.chain).toBe("ethereum");
  });

  it("emits high busy level guidance when gas spikes", async () => {
    baseStub.response = {
      data: {
        timestamp: TIMESTAMP,
        gasPrice: {
          instant: { price: 5 },
        },
      },
    };

    const result = await recommendRouteEntrypoint.handler!({
      key: "recommendRoute",
      input: {
        chain_set: ["base"] as SupportedChain[],
        calldata_size_bytes: 0,
        gas_units_est: 100_000,
      },
      headers: new Headers(),
      signal: new AbortController().signal,
      runId: "test-run",
    });

    expect(result.output.chain).toBe("base");
    expect(result.output.busy_level).toBe("high");
    expect(result.output.tip_hint.toLowerCase()).toContain("high");
  });
});
