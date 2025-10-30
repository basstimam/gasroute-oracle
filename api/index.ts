import { handle } from "hono/vercel";
import app from "../src/index";

export const config = {
  runtime: "nodejs18.x",
};

export default handle(app as any);
