# GasRoute Oracle

Predict the cheapest execution route across Ethereum, Base, Arbitrum, and BNB Smart Chain—complete with fee projections, congestion signals, and priority fee guidance.

## Quick Start

### 1. Install dependencies
```bash
bun install
```

### 2. Configure environment
Copy `.env.example` then fill in the keys (Blocknative, Etherscan API v2, payment wallet, facilitator, etc.). Minimal local set:
```bash
cp .env.example .env
```

### 3. Generate manifest (after every config change)
```bash
bun run manifest
```

### 4. Run the development server
```bash
bun run dev
```
`http://localhost:8787/.well-known/agent.json` now serves the agent manifest.

## Invoke Locally

### Without payment (inspect 402)
```bash
curl -X POST http://localhost:8787/entrypoints/recommendRoute/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":{"chain_set":["base","ethereum"],"calldata_size_bytes":128,"gas_units_est":80000}}'
```
You receive a 402 response describing the mandate.

### With payment (helper script)
```bash
bun run pay
```
The script reads `.env`, signs an x402 payment, retries the request, and prints the recommendation plus decoded receipt.
By default the helper evaluates all supported chains; set `CHAIN_SET`, `GAS_UNITS`, `CALLDATA_BYTES`, etc. to override:
```bash
CHAIN_SET=base,arbitrum GAS_UNITS=120000 CALLDATA_BYTES=256 bun run pay
```

## Endpoint Specification

| Field | Details |
| --- | --- |
| **Path** | `/entrypoints/recommendRoute/invoke` |
| **Method** | POST (x402 exact payment, invoke price `0.02 USDC`) |
| **Input** | `{ chain_set, calldata_size_bytes, gas_units_est }` |
| **Output** | `{ chain, fee_native, fee_usd, busy_level, tip_hint, evaluated_at, alternatives }` |
| **Chains** | `ethereum`, `base`, `arbitrum`, `bsc` |

Example success payload:
```json
{
  "chain": "base",
  "fee_native": 0.0000012,
  "fee_usd": 0.0039,
  "busy_level": "moderate",
  "tip_hint": "Add ~0.007 gwei priority (busy: moderate) for ~4s confirmation on Base.",
  "evaluated_at": 1761803513772,
  "alternatives": [
    { "chain": "arbitrum", "fee_native": 0.0000051, "fee_usd": 0.018, "busy_level": "low", "tip_hint": "Add ~0.004 gwei priority (busy: low) for ~12s confirmation on Arbitrum One." }
  ]
}
```

## Supported Networks

- Ethereum mainnet
- Base mainnet
- Arbitrum One
- BNB Smart Chain (BSC)

## Environment Variables

| Variable | Required | Notes |
| --- | --- | --- |
| `PRIVATE_KEY` | Yes | Wallet that signs x402 requests (and receives payments if `PAY_TO` points to same address). |
| `FACILITATOR_URL` | Yes | Usually `https://facilitator.daydreams.systems`. |
| `PAY_TO` | Yes | Recipient wallet for the invoke payment. |
| `NETWORK` | Yes | Payment network (e.g. `base`, `base-sepolia`). |
| `BLOCKNATIVE_API_KEY` | Yes | Ethereum gas source. |
| `ETHERSCAN_API_KEY` | Yes | Etherscan API v2 key (used for BNB gas oracle; also works for other Etherscan-supported chains). |
| `BASE_GAS_API_URL`, `ARBITRUM_GAS_API_URL` | Optional | Override default gas feeds. |
| `BASE_RPC_URL`, `ARBITRUM_RPC_URL`, `BSC_RPC_URL` | Optional | RPC fallbacks when public APIs fail (`eth_gasPrice`). |
| `ETH_USD_PRICE`, `BASE_USD_PRICE`, `ARBITRUM_USD_PRICE`, `BSC_USD_PRICE`, `BNB_USD_PRICE` | Optional | Override native token USD price hints (otherwise default heuristics). |
| `DEFAULT_PRICE` | Optional | Default x402 price when an entrypoint omits `price`. |
| `API_BASE_URL`, `PORT` | Optional | Use when deploying (manifest generation + server port). |

## Testing & QA

```bash
bun test          # unit tests (recommendation logic)
bunx tsc --noEmit # type checking
```

## Deployment Checklist

- [ ] Update `.env` with production values (API base URL, facilitators, payment wallet).
- [ ] `bun run manifest` with `API_BASE_URL` pointing to deployed domain.
- [ ] Deploy (e.g., Vercel) and confirm `/.well-known/agent.json` is reachable.
- [ ] Run `bun run pay` against production URL to verify x402 flow.
- [ ] Update this README with the live endpoint URL.

Happy routing!
