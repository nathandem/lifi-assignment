import { fileURLToPath } from "node:url";

import {
  connect as dbConnect,
  disconnect as dbDisconnect,
} from "./db/connection.js";
import { logger, generateAndAttachRequestId } from "./logger.js";
import scrapFeeCollected from "./handlers/scrap.js";

const main = async (): Promise<void> => {
  try {
    generateAndAttachRequestId();
    logger.info("Beginning scrapFeeCollected job");
    await dbConnect();

    await scrapFeeCollected();

    await dbDisconnect();
    logger.info("Completed scrapFeeCollected successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Cron job failed:", error);
    process.exit(1);
  }
};

// handle kubernetes signals gracefully
process.on("SIGTERM", () => {
  logger.info("Cron job received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("Cron job received SIGINT, shutting down gracefully");
  process.exit(0);
});

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}
