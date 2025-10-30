import { handle } from "hono/vercel";
import app from "../src/index";

export const runtime = "edge";

export default handle(app as any);
