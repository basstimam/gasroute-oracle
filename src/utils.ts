export function parseUsd(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const lower = value.trim().toLowerCase();
    const parsed =
      lower.startsWith("0x") ? Number.parseInt(lower, 16) : Number.parseFloat(lower);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function toUnixMs(value: unknown): number | undefined {
  if (typeof value === "number") {
    if (value > 1e12) {
      return Math.floor(value);
    }
    return Math.floor(value * 1000);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

export function weiToGwei(wei: bigint): number {
  const divisor = 1_000_000_000n;
  const whole = wei / divisor;
  const remainder = wei % divisor;
  return Number(whole) + Number(remainder) / 1_000_000_000;
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
