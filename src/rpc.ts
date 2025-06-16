import { ethers } from "ethers";
import { FeeCollector__factory } from "lifi-contract-typings";
import { BlockTag } from "@ethersproject/abstract-provider";

import config from "./config.js";
import { makeFuncRetriable } from "./retry.js";

const provider = new ethers.providers.JsonRpcProvider({
  url: config.rpcUrl,
  timeout: 10_000, // 10s
});
const feeCollector = new ethers.Contract(
  config.feeCollectorContractAddress,
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
 * Just like its underlying `eth_getLogs` RPC method, queryFilter is inclusive of
 * both fromBlock and toBlock.
 */
const loadFeesCollectedEvents = async (
  fromBlock: BlockTag,
  toBlock: BlockTag
): Promise<ethers.Event[]> => {
  const filter = feeCollector.filters.FeesCollected();
  return await feeCollector.queryFilter(filter, fromBlock, toBlock);
};

const getLatestBlockNumber = async (): Promise<number> => {
  return await provider.getBlockNumber();
};

// retriable versions of RPC calls
const retriableLoadFeesCollectedEvents = makeFuncRetriable(
  loadFeesCollectedEvents
);
const retriableGetLatestBlockNumber = makeFuncRetriable(getLatestBlockNumber);

export {
  loadFeesCollectedEvents,
  retriableLoadFeesCollectedEvents,
  getLatestBlockNumber,
  retriableGetLatestBlockNumber,
};
