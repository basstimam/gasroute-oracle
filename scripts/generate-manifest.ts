import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildManifest } from "@lucid-dreams/agent-kit";
import { agentMeta, recommendRouteEntrypoint, payments } from "../src/agent";

async function main(): Promise<void> {
  const origin =
    process.env.API_BASE_URL ??
    `http://localhost:${process.env.PORT ?? "8787"}`;

  const manifest = buildManifest({
    meta: agentMeta,
    registry: [recommendRouteEntrypoint],
    origin,
    payments,
  });

  const outputDir = path.resolve(process.cwd(), ".well-known");
  await mkdir(outputDir, { recursive: true });

  const filePath = path.join(outputDir, "agent.json");
  await writeFile(filePath, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`Manifest written to ${filePath}`);
}

main().catch((error) => {
  console.error("Failed to generate manifest:", error);
  process.exitCode = 1;
});
