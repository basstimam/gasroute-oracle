import { Hono } from "hono";
import { app as agentApp } from "./agent";

const app = new Hono();

app.all("*", (c) => agentApp.fetch(c.req.raw));

export default app;
