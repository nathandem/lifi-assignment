import { ethers } from "ethers";
import { FeeCollector__factory } from "lifi-contract-typings";
import { BlockTag } from "@ethersproject/abstract-provider";

import env from "./env.js";

const provider = new ethers.providers.JsonRpcProvider({
  url: env.rpcUrl,
  timeout: 10_000, // 10s
});
const feeCollector = new ethers.Contract(
  env.feeCollectorContractAddress,
  FeeCollector__factory.createInterface(),
  provider
);

/**
 * For a given block range all `FeesCollected` events are loaded from the `FeeCollector` contract.
 * @param fromBlock - Starting block to query events from, inclusive.
 * @param toBlock - End block to query events to, inclusive. No error is beyond head.
 * @returns A promise resolving into an array of `FeesCollected` events within the specified block range.
 *
 * @remarks
 * Just like its underlying eth_getLogs RPC method, queryFilter is inclusive of
 * both fromBlock and toBlock.
 */
const loadFeeCollectorEvents = (
  fromBlock: BlockTag,
  toBlock: BlockTag
): Promise<ethers.Event[]> => {
  // TODO: put retry logic and error handling (log proper error)
  const filter = feeCollector.filters.FeesCollected();
  return feeCollector.queryFilter(filter, fromBlock, toBlock);
};

const getLatestBlockNumber = async (): Promise<number> => {
  return await provider.getBlockNumber();
};

export { loadFeeCollectorEvents, getLatestBlockNumber };
