import { fileURLToPath } from "node:url";

import * as http from "node:http";
import express from "express";

import {
  connect as dbConnect,
  disconnect as dbDisconnect,
} from "./db/connection.js";
import { logger } from "./logger.js";
import { setupRoutes } from "./handlers/rest.js";
import config from "./config.js";

let _server: http.Server;

const app = express();
setupRoutes(app);

const shutdown = async () => {
  logger.info("API server shutting down...");
  await dbDisconnect();
  _server.close(() => {
    logger.info("API server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("uncaughtException", async (err) => {
  await logger.alarm("Process crashed because of an uncaughtException", err);
  await shutdown(); // might be too late for a clean up, but let's try
  return;
});

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  await dbConnect();
  _server = app.listen(config.apiPort, "0.0.0.0", () => {
    logger.info(`API server started on port ${config.apiPort}`);
  });
}

export { app };
