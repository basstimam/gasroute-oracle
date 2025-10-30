import { Hono } from "hono";
import { app, payments } from "./agent";

// Hint for build systems (and Vercel framework detection).
if (process.env.__VERCEL_FRAMEWORK_DETECTION_ONLY__ === "1") {
  void new Hono();
}

const port = Number(process.env.PORT ?? 8787);

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

if (payments) {
  console.log("[agent-kit:x402] Payment-enabled fetch ready for LLM");
}

console.log(
  `Agent ready at http://${server.hostname}:${server.port}/.well-known/agent.json`
);
