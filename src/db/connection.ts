import mongoose from "mongoose";

import config from "../config.js";

const connect = async (): Promise<void> => {
  const connectionParams = {
    host: config.dbHost,
    port: config.dbPort,
    dbName: config.dbName,
    user: config.dbUser,
    pass: config.dbPwd,
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
    // use TLS in prod system
  });
};

// for testing purposes
const testConnect = async (uri: string): Promise<void> => {
  await mongoose.connect(uri, {
    maxPoolSize: 10,
    minPoolSize: 1,
    timeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    maxIdleTimeMS: 10 * 60 * 1000,
  });
};

const disconnect = async (): Promise<void> => {
  await mongoose.disconnect();
};

export { connect, disconnect, testConnect };
