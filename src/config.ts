const getString = (variable: any): string => {
  // don't throw for empty strings, e.g. might be the case for db passwords
  if (process.env[variable] === undefined)
    throw new Error(`${variable} must be defined in the env variables`);
  return process.env[variable];
};

const getNumber = (variable: any): number => {
  return parseInt(getString(variable), 10);
};

const getBoolean = (variable: any): boolean => {
  const parsedBoolValue = getString(variable);

  if (parsedBoolValue === "true") {
    return true;
  } else if (parsedBoolValue === "false") {
    return false;
  } else {
    throw new Error(
      `${variable} cannot be parsed as a boolean. Only 'true' and 'false' accepted`
    );
  }
};

export default {
  rpcUrl: getString("RPC_URL"),
  feeCollectorContractAddress: getString("FEE_COLLECTOR_CONTRACT_ADDRESS"),
  // db
  dbHost: getString("DB_HOST"),
  dbPort: getNumber("DB_PORT"),
  dbName: getString("DB_NAME"),
  dbUser: getString("DB_USER"),
  dbPwd: getString("DB_PWD"),
  // service
  batchSize: 1000,
  startBlock: 70_000_000,
  // api
  apiPort: 3000,
  pageSize: 1000,
};
