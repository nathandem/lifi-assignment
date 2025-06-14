import mongoose from "mongoose";

import env from "../env.js";
import { logger } from "../logger.js";

const connect = async (): Promise<void> => {
  try {
    const connectionParams = {
      host: env.dbHost,
      port: env.dbPort,
      dbName: env.dbName,
      user: env.dbUser,
      pass: env.dbPwd,
    };

    const uri = `mongodb://${connectionParams.user}:${encodeURIComponent(
      connectionParams.pass
    )}@${connectionParams.host}:${connectionParams.port}/${
      connectionParams.dbName
    }`;

    await mongoose.connect(uri, {
      maxPoolSize: 10,
      minPoolSize: 1,
      timeoutMS: 10_000,
      connectTimeoutMS: 10_000,
      maxIdleTimeMS: 10 * 60 * 1000,
      // TODO: use tls
    });
  } catch (err) {
    logger.error("Failed to connect to MongoDB:", err);
    throw err;
  }
};

const disconnect = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
  } catch (err) {
    logger.error("Error disconnecting from MongoDB:", err);
    throw err;
  }
};

// // TMP
// await connect();

// await FeeModel.create({
//   token: "0x1234567890abcdef1234567890abcdef12345678",
//   integrator: "jupiter",
//   integratorFee: 1000000000000000000n.toString(),
//   lifiFee: 500000000000000000n.toString(),
// });

// const allFees = await FeeModel.find();
// console.log("All fees:", allFees);

// await disconnect();

// Graceful shutdown handlers:
//
// process.on("SIGINT", async () => {
//   console.log("Received SIGINT, shutting down gracefully...");
//   await disconnectFromDatabase();
//   process.exit(0);
// });
//
// process.on("SIGTERM", async () => {
//   console.log("Received SIGTERM, shutting down gracefully...");
//   await disconnectFromDatabase();
//   process.exit(0);
// });

export { connect, disconnect };
