import { BigNumber, type Event } from "ethers";

import { type ParsedFeesCollectedEvent } from "../types.js";
import {
  retriableLoadFeesCollectedEvents as loadFeesCollectedEvents,
  retriableGetLatestBlockNumber as getLatestBlockNumber,
} from "../rpc.js";
import { retriableSaveFeesCollectedInDb as saveFeesCollectedInDb } from "../db/Fee.js";
import {
  retriableGetLastBlockInDb as getLastBlockInDb,
  retriableSetLastBlockInDb as setLastBlockInDb,
} from "../db/LastBlock.js";
import { logger } from "../logger.js";
import config from "../config.js";

/**
 * Takes a list of raw events and parses them into `ParsedFeesCollectedEvent`.
 * @param events - Array of raw `FeesCollected` events to be parsed.
 * @returns Array of parsed fee collected events with some metadata.
 *
 * @remarks
 * Parsing isn't defensive (no validation) as EVM events are highly
 * deterministic.
 */
const parseFeeCollectorEvents = (
  events: Event[]
): ParsedFeesCollectedEvent[] => {
  return events.map((event) => {
    const feesCollected: ParsedFeesCollectedEvent = {
      blockNb: event.blockNumber,
      txHash: event.transactionHash,
      logIdx: event.logIndex,
      token: event.args?._token as string,
      integrator: event.args?._integrator as string,
      integratorFee: (event.args?._integratorFee as BigNumber).toString(),
      lifiFee: (event.args?._lifiFee as BigNumber).toString(),
    };
    return feesCollected;
  });
};

/**
 * Scrap (fetch, parse and store in DB) `FeesCollected` events from the `FeeCollector`
 * contract. Job proceeds where the last valid block it left of.
 *
 * @remarks
 * Could be made parallel to increase speed, but reliability preferred.
 */
const scrapFeesCollected = async (): Promise<void> => {
  const dbLastestBlock =
    (await getLastBlockInDb()) || Math.max(config.startBlock - 1, 0);

  // We might be missing a few blocks because of this by the time the job is done but okay, as not a real-time service
  // alternatively, we can fetch the latest block number in every loop pass
  const blockchainLatestBlock = await getLatestBlockNumber();

  const BATCH_SIZE = config.batchSize - 1; // minus 1 because inclusive on both side would mean a batch size of N+1
  let fromBlock = dbLastestBlock + 1;

  while (fromBlock <= blockchainLatestBlock) {
    const toBlock = Math.min(fromBlock + BATCH_SIZE - 1, blockchainLatestBlock);

    try {
      // follow ETL pattern
      const events = await loadFeesCollectedEvents(fromBlock, toBlock);
      if (events) {
        const parsedEvents = parseFeeCollectorEvents(events);
        await saveFeesCollectedInDb(parsedEvents);
      }

      fromBlock = toBlock + 1;
    } catch (err) {
      await setLastBlockInDb(Math.max(fromBlock - 1, config.startBlock));
      throw err;
    }
  }

  await setLastBlockInDb(blockchainLatestBlock);

  logger.info(
    `Scrapped FeesCollected events from ${
      dbLastestBlock + 1
    } to ${blockchainLatestBlock}`
  );
};

export { scrapFeesCollected };
