import { fileURLToPath } from "node:url";

import {
  connect as dbConnect,
  disconnect as dbDisconnect,
} from "./db/connection.js";
import { logger, generateAndAttachRequestId } from "./logger.js";
import { scrapFeesCollected } from "./services/scrap.js";

const main = async (): Promise<void> => {
  try {
    generateAndAttachRequestId();
    logger.info("Beginning scrapFeesCollected job");
    await dbConnect();

    await scrapFeesCollected();

    await dbDisconnect();
    logger.info("Completed scrapFeesCollected successfully");
    process.exit(0);
  } catch (error) {
    // note: generally speaking, to avoid doubling error notifications, I like to let
    // errors bubble up to the top and only logger.error with a notification from there.
    // Hence why there's not many try/catch, except when there's a functional reason to them,
    // e.g. logging last block parsed in the scrap handler.
    await logger.error("Cron job failed:", error);
    await dbDisconnect();
    process.exit(1);
  }
};

// handle kubernetes signals gracefully
process.on("SIGTERM", async () => {
  await logger.alarm("Job received SIGTERM, shutting down gracefully", {});
  await dbDisconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await logger.alarm("Job received SIGINT, shutting down gracefully", {});
  await dbDisconnect();
  process.exit(0);
});

process.on("uncaughtException", async (err) => {
  await logger.alarm("Process crashed because of an uncaughtException", err);
  return;
});

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}
