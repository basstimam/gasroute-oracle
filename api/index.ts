import { Hono } from "hono";
import { app } from "../src/agent";

const honoApp = new Hono();

honoApp.all("*", (c) => app.fetch(c.req.raw));

export default honoApp;
