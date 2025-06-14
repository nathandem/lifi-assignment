import { BigNumber, type Event } from "ethers";

import { type ParsedFeeCollectedEvent } from "../types.js";
import { loadFeeCollectorEvents, getLatestBlockNumber } from "../rpc.js";
import { saveFeeCollectedInDb } from "../db/Fee.js";
import { getLastBlockInDb, setLastBlockInDb } from "../db/LastBlock.js";
import { logger } from "../logger.js";

const OLDEST_BLOCK = 70000000;

/**
 * Takes a list of raw events and parses them into `ParsedFeeCollectedEvent`.
 * @param events - Array of raw `FeesCollected` events to be parsed.
 * @returns Array of parsed fee collected events with some metadata.
 *
 * @remarks
 * Parsing isn't defensive (no validation) as EVM events are highly
 * constrained, deterministic.
 */
const parseFeeCollectorEvents = (
  events: Event[]
): ParsedFeeCollectedEvent[] => {
  return events.map((event) => {
    const feesCollected: ParsedFeeCollectedEvent = {
      txHash: event.transactionHash,
      blockNb: event.blockNumber,
      token: event.args?._token,
      integrator: event.args?._integrator,
      integratorFee: BigNumber.from(event.args?._integratorFee).toString(),
      lifiFee: BigNumber.from(event.args?._lifiFee).toString(),
    };
    return feesCollected;
  });
};

// Could be made parallel to increase speed, but reliability preferred
const scrapFeeCollected = async (): Promise<void> => {
  const dbLastestBlock = (await getLastBlockInDb()) || OLDEST_BLOCK - 1;

  // we might be missing a few blocks because of this by the time the job is done but okay, as not a real-time service
  // alternatively, we can fetch the latest block number in every loop pass
  const blockchainLatestBlock = await getLatestBlockNumber();

  const BATCH_SIZE = 1000; // avg. 2.1 sec per block (so close to 1h worth of progress w/ 1000 blocks)
  let fromBlock = Math.min(dbLastestBlock + 1, blockchainLatestBlock);
  let toBlock = Math.min(fromBlock + BATCH_SIZE, blockchainLatestBlock);

  // TODO: ensure not missing any block
  while (fromBlock < blockchainLatestBlock) {
    // TMP
    logger.debug(`fromBlock: ${fromBlock}`);
    logger.debug(`toBlock: ${toBlock}`);

    try {
      // note: follow ETL pattern, though these 3 simple operations could be fused into one
      const events = await loadFeeCollectorEvents(fromBlock, toBlock);
      console.log(events);
      const parsedEvents = parseFeeCollectorEvents(events);
      console.log(parsedEvents);
      await saveFeeCollectedInDb(parsedEvents);
      console.log("after saving feeCollected events in DB");

      fromBlock = Math.min(toBlock + 1, blockchainLatestBlock);
      toBlock = Math.min(fromBlock + BATCH_SIZE, blockchainLatestBlock);
    } catch (err) {
      // TMP
      await setLastBlockInDb(fromBlock);
      throw err;
    }
  }

  // TMP
  logger.debug(`blockchainLatestBlock: ${blockchainLatestBlock}`);

  await setLastBlockInDb(blockchainLatestBlock);

  logger.debug(
    `Scrapped FeeCollected events from ${dbLastestBlock} to ${blockchainLatestBlock}`
  );
};

export default scrapFeeCollected;
