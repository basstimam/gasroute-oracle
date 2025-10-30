import { app, payments } from "./agent";

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
