import { createSigner, decodeXPaymentResponse } from "x402-fetch";
import {
  createPaymentHeader,
  selectPaymentRequirements,
} from "x402/client";
import { PaymentRequirementsSchema } from "x402/types";
import type { PayScriptConfig } from "./env";

export interface PaymentResult {
  status: number;
  responseBody: unknown;
  paymentResponse?: ReturnType<typeof decodeXPaymentResponse>;
  paymentError?: string | null;
}

interface X402Response {
  x402Version: number;
  accepts: unknown[];
}

export async function executePaidRequest(
  config: PayScriptConfig
): Promise<PaymentResult> {
  const network = config.network as any;
  const signer = await createSigner(network, config.privateKey);
  const url = `${config.baseUrl}/entrypoints/recommendRoute/invoke`;
  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: {
        chain_set: config.chainSet,
        calldata_size_bytes: config.calldataBytes,
        gas_units_est: config.gasUnits,
      },
    }),
  };

  const firstResponse = await fetch(url, requestInit);
  const firstBody = await safeJson(firstResponse);

  if (firstResponse.status !== 402) {
    return {
      status: firstResponse.status,
      responseBody: firstBody,
      paymentResponse: extractPaymentHeader(firstResponse),
      paymentError: firstResponse.headers.get("x-payment-error"),
    };
  }

  const { x402Version, accepts } = validateX402Response(firstBody);
  const requirements = accepts.map((entry) =>
    PaymentRequirementsSchema.parse(entry)
  );
  const selected = selectPaymentRequirements(requirements, network, "exact");

  const paymentHeader = await createPaymentHeader(
    signer,
    x402Version,
    selected
  );

  const secondResponse = await fetch(url, {
    ...requestInit,
    headers: {
      ...(requestInit.headers || {}),
      "X-PAYMENT": paymentHeader,
    },
  });
  const secondBody = await safeJson(secondResponse);

  return {
    status: secondResponse.status,
    responseBody: secondBody,
    paymentResponse: extractPaymentHeader(secondResponse),
    paymentError: secondResponse.headers.get("x-payment-error"),
  };
}

function validateX402Response(body: unknown): X402Response {
  if (
    !body ||
    typeof body !== "object" ||
    !("x402Version" in body) ||
    !("accepts" in body)
  ) {
    throw new Error("Invalid x402 response: missing fields.");
  }
  const x402Version = Number((body as any).x402Version);
  if (!Number.isInteger(x402Version)) {
    throw new Error("Invalid x402Version field.");
  }
  const accepts = Array.isArray((body as any).accepts)
    ? ((body as any).accepts as unknown[])
    : [];
  if (!accepts.length) {
    throw new Error("No payment requirements returned by agent.");
  }
  return { x402Version, accepts };
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractPaymentHeader(response: Response) {
  const header = response.headers.get("x-payment-response");
  return header ? decodeXPaymentResponse(header) : undefined;
}
