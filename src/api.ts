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

  if (_server) {
    _server.close(() => {
      logger.info("API server closed");
      process.exit(0);
    });
  } else {
    logger.info("No server instance to close");
    process.exit(0);
  }
};

process.on("SIGTERM", async () => {
  logger.info("API received SIGTERM, shutting down gracefully", {});
  await shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("API received SIGINT, shutting down gracefully", {});
  await shutdown();
  process.exit(0);
});

process.on("uncaughtException", async (err) => {
  await logger.alarm("Process crashed because of an uncaughtException", err);
  await shutdown(); // might be too late for a clean up, but let's try
  process.exit(0);
});

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  await dbConnect();
  _server = app.listen(config.apiPort, "0.0.0.0", () => {
    logger.info(`API server started on port ${config.apiPort}`);
  });
}

export {
  app, // for testing purposes
};
