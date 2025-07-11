import assert from "node:assert";
import { describe, test, before, after, afterEach } from "node:test";

import esmock from "esmock";
import { MongoMemoryServer } from "mongodb-memory-server-core";
import { ethers as originalEthers } from "ethers";

import config from "../src/config.js";
import { FeeModel, retriableSaveFeesCollectedInDb } from "../src/db/Fee.js";
import {
  getLastBlockInDb,
  setLastBlockInDb,
  LastBlockModel,
} from "../src/db/LastBlock.js";
import { testConnect, disconnect } from "../src/db/connection.js";
import { type ParsedFeesCollectedEvent } from "../src/types.js";
type ScapModule = typeof import("../src/services/scrap.js");

import { feesCollectedEventsFixtures } from "./fixtures.js";

describe("Scrap FeesCollected events", { concurrency: 1 }, async () => {
  let scrap: ScapModule;
  let mongoUri: string;
  let mongoServer: MongoMemoryServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await testConnect(mongoUri);
  });

  after(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await FeeModel.deleteMany({});
    await LastBlockModel.deleteMany({});
  });

  test("First call to scrapFeesCollected should save FeesCollected events from startBlock till last current block number and store the last block number scrapped", async () => {
    // arrange
    const batchSize = 5;
    const lastBlockOnChain = config.startBlock + batchSize - 1; // just one round
    scrap = await esmock(
      "../src/services/scrap.js",
      {
        "../src/config.js": {
          batchSize,
        },
        "../src/rpc.js": {
          retriableLoadFeesCollectedEvents: async (
            fromBlock: number,
            toBlock: number
          ) =>
            feesCollectedEventsFixtures.filter(
              (event) =>
                event.blockNumber >= fromBlock && event.blockNumber <= toBlock
            ),
          retriableGetLatestBlockNumber: async () => lastBlockOnChain,
        },
      },
      {
        // turn off logging globally
        "../src/logger.js": {
          logger: {
            debug: () => {},
            info: () => {},
          },
        },
      }
    );

    // act
    await scrap.scrapFeesCollected();

    // assert
    // -> 1 FeesCollected event in the [70M;70M+5] range
    const fees = await FeeModel.find({});
    assert.strictEqual(fees.length, 1);
    assert.strictEqual(
      fees[0].txHash,
      feesCollectedEventsFixtures[0].transactionHash
    );
    assert.strictEqual(
      fees[0].blockNb,
      feesCollectedEventsFixtures[0].blockNumber
    );
    assert.strictEqual(
      fees[0].token,
      feesCollectedEventsFixtures[0].args._token
    );
    assert.strictEqual(
      fees[0].integrator,
      feesCollectedEventsFixtures[0].args._integrator
    );
    assert.strictEqual(
      fees[0].integratorFee,
      feesCollectedEventsFixtures[0].args._integratorFee.toString()
    );
    assert.strictEqual(
      fees[0].lifiFee,
      feesCollectedEventsFixtures[0].args._lifiFee.toString()
    );

    // -> check new block number in DB
    const lastBlockInDb = await getLastBlockInDb();
    assert.strictEqual(lastBlockInDb, lastBlockOnChain);
  });

  test("Subsequent call of scrapFeesCollected should start from the last block stored in the DB till the blockchain last current block number", async () => {
    // arrange
    // first run -> saves 1 FeesCollected and LastBlock.blockNb
    const batchSize = 5;
    const lastBlockOnChainFirstRun = config.startBlock + batchSize - 1;
    scrap = await esmock(
      "../src/services/scrap.js",
      {
        "../src/config.js": {
          batchSize,
        },
        "../src/rpc.js": {
          retriableLoadFeesCollectedEvents: async (
            fromBlock: number,
            toBlock: number
          ) =>
            feesCollectedEventsFixtures.filter(
              (event) =>
                event.blockNumber >= fromBlock && event.blockNumber <= toBlock
            ),
          retriableGetLatestBlockNumber: async () => lastBlockOnChainFirstRun,
        },
      },
      {
        "../src/logger.js": {
          logger: {
            debug: () => {},
            info: () => {},
          },
        },
      }
    );
    await scrap.scrapFeesCollected();
    const feesAfterFirstRun = await FeeModel.find({});
    assert.strictEqual(feesAfterFirstRun.length, 1);

    const lastBlockOnChainSecondRun = config.startBlock + 50;
    scrap = await esmock(
      "../src/services/scrap.js",
      {
        "../src/config.js": {
          batchSize,
        },
        "../src/rpc.js": {
          retriableLoadFeesCollectedEvents: async (
            fromBlock: number,
            toBlock: number
          ) =>
            feesCollectedEventsFixtures.filter(
              (event) =>
                event.blockNumber >= fromBlock && event.blockNumber <= toBlock
            ),
          retriableGetLatestBlockNumber: async () => lastBlockOnChainSecondRun,
        },
      },
      {
        // turn off logging globally
        "../src/logger.js": {
          logger: {
            debug: () => {},
            info: () => {},
          },
        },
      }
    );

    // act
    await scrap.scrapFeesCollected();

    // assert
    // -> 2 FeesCollected event in the [70M+6;70M+50] range, so total of 3 records now
    // Note: event on 70M+6 is included as 1 block after previous getLastBlockInDb
    //       and events on block 70M+51 is not included as after getLatestBlockNumber
    const feesAfterSecondRun = await FeeModel.find({});
    assert.strictEqual(feesAfterSecondRun.length, 3);

    assert.strictEqual(
      feesAfterSecondRun[0].txHash,
      feesCollectedEventsFixtures[0].transactionHash
    );
    assert.strictEqual(
      feesAfterSecondRun[1].txHash,
      feesCollectedEventsFixtures[1].transactionHash
    );
    assert.strictEqual(
      feesAfterSecondRun[2].txHash,
      feesCollectedEventsFixtures[2].transactionHash
    );

    // -> check new block number in DB
    const newLastBlockInDb = await getLastBlockInDb();
    assert.strictEqual(newLastBlockInDb, lastBlockOnChainSecondRun);
  });

  test("Call to scrapFeesCollected with an RPC failure should lead to the starting block of the current run being stored in the DB", async () => {
    // arrange
    const batchSize = 5;
    const initialLastBlockInDb = config.startBlock + 50;
    await setLastBlockInDb(initialLastBlockInDb);
    const lastBlockOnChain = config.startBlock + 100;
    const rpcFailingAfterBlock = config.startBlock + 72;

    scrap = await esmock(
      "../src/services/scrap.js",
      {
        "../src/config.js": {
          batchSize,
        },
        "../src/rpc.js": {
          retriableLoadFeesCollectedEvents: async (
            fromBlock: number,
            toBlock: number
          ) => {
            // succesfully fetch events at blocks config.startBlock + 51 and config.startBlock + 70
            // but throw after
            if (toBlock > rpcFailingAfterBlock) {
              throw new Error();
            }

            return feesCollectedEventsFixtures.filter(
              (event) =>
                event.blockNumber >= fromBlock && event.blockNumber <= toBlock
            );
          },
          retriableGetLatestBlockNumber: async () => lastBlockOnChain,
        },
      },
      {
        // turn off logging globally
        "../src/logger.js": {
          logger: {
            debug: () => {},
            info: () => {},
          },
        },
      }
    );

    // act
    await scrap.scrapFeesCollected().catch(() => {});

    // assert
    // -> 2 FeesCollected events stored
    const fees = await FeeModel.find({});
    assert.strictEqual(fees.length, 2); // events at block nb 51 and 70

    // -> LastBlock.blockNb updated to nb at beginning of the relevant batch run
    const lastBlockInDbAfterCrash = (await getLastBlockInDb()) as number;
    assert(lastBlockInDbAfterCrash < lastBlockOnChain);
    assert(lastBlockInDbAfterCrash < rpcFailingAfterBlock);

    const eFullBatchesRun = Math.trunc(
      (rpcFailingAfterBlock - initialLastBlockInDb) / batchSize
    );
    const eInitialFromBlock = initialLastBlockInDb + 1;
    const eFromBlock = eInitialFromBlock + eFullBatchesRun * batchSize;
    assert.strictEqual(lastBlockInDbAfterCrash, eFromBlock - 1);
  });

  test("Call to scrapFeesCollected with an DB connectivity failure should lead to the starting block of the overall run not being updated DB, meaning next run will start at same point", async () => {
    // arrange
    const batchSize = 5;
    const initialLastBlockInDb = config.startBlock + 50;
    await setLastBlockInDb(initialLastBlockInDb);
    const lastBlockOnChain = config.startBlock + 100;
    const dbFailingAfterBlock = config.startBlock + 55;

    scrap = await esmock(
      "../src/services/scrap.js",
      {
        "../src/config.js": {
          batchSize,
        },
        "../src/rpc.js": {
          retriableLoadFeesCollectedEvents: async (
            fromBlock: number,
            toBlock: number
          ) =>
            feesCollectedEventsFixtures.filter(
              (event) =>
                event.blockNumber >= fromBlock && event.blockNumber <= toBlock
            ),
          retriableGetLatestBlockNumber: async () => lastBlockOnChain,
        },
        "../src/db/Fee.js": {
          // correctly work to get lastBlockInDb and save events at config.startBlock + 51
          // and config.startBlock + 70 but fail after
          retriableSaveFeesCollectedInDb: async (
            parsedEvents: ParsedFeesCollectedEvent[]
          ) => {
            if (
              parsedEvents.length > 0 &&
              parsedEvents[0].blockNb > dbFailingAfterBlock
            ) {
              await disconnect();
            }
            await retriableSaveFeesCollectedInDb(parsedEvents);
          },
        },
      },
      {
        // turn off logging globally
        "../src/logger.js": {
          logger: {
            debug: () => {},
            info: () => {},
          },
        },
      }
    );

    // act
    await scrap.scrapFeesCollected().catch(() => {});

    // assert
    await testConnect(mongoUri); // reconnect first

    // -> 2 FeesCollected events stored
    const fees = await FeeModel.find({});
    assert.strictEqual(fees.length, 1); // events at block 51

    // -> LastBlock.blockNb same as beginning of the run
    const lastBlockInDbAfterCrash = (await getLastBlockInDb()) as number;
    assert.strictEqual(lastBlockInDbAfterCrash, initialLastBlockInDb);
  });

  test("Call to scrapFeesCollected on same block should not result in any DB change", async () => {
    // arrange
    // -> start at block startBlock+50 and with the event from block 50
    const batchSize = 5;
    const currentBlock = config.startBlock + 50; // both in DB and on-chain
    await setLastBlockInDb(currentBlock);

    const block50Event = feesCollectedEventsFixtures.find(
      (event) => event.blockNumber === config.startBlock + 50
    )!;
    await FeeModel.insertOne({
      txHash: block50Event.transactionHash,
      blockNb: block50Event.blockNumber,
      logIdx: block50Event.logIndex,
      token: block50Event.args._token,
      integrator: block50Event.args._integrator,
      integratorFee: block50Event.args._integratorFee,
      lifiFee: block50Event.args._lifiFee,
    });
    const feesEventsBeforeRun = await FeeModel.find({});
    assert.strictEqual(feesEventsBeforeRun.length, 1);

    scrap = await esmock(
      "../src/services/scrap.js",
      {
        "../src/config.js": {
          batchSize,
        },
        "../src/rpc.js": {
          retriableLoadFeesCollectedEvents: async (
            fromBlock: number,
            toBlock: number
          ) =>
            feesCollectedEventsFixtures.filter(
              (event) =>
                event.blockNumber >= fromBlock && event.blockNumber <= toBlock
            ),
          retriableGetLatestBlockNumber: async () => currentBlock,
        },
      },
      {
        // turn off logging globally
        "../src/logger.js": {
          logger: {
            debug: () => {},
            info: () => {},
          },
        },
      }
    );

    // act
    await scrap.scrapFeesCollected();

    // assert
    const feesEventsAfterRun = await FeeModel.find({});
    assert.strictEqual(feesEventsAfterRun.length, 1);

    // -> check new block number in DB
    const newLastBlockInDb = await getLastBlockInDb();
    assert.strictEqual(newLastBlockInDb, currentBlock);
  });

  test("Call to scrapFeesCollected on narrow gaps (one block after) should not missed events", async () => {
    // arrange
    // -> start at block startBlock+50 and with the event from block 50
    const batchSize = 5;
    const initialLastBlockInDb = config.startBlock + 50;
    await setLastBlockInDb(initialLastBlockInDb);
    const lastBlockOnChain = config.startBlock + 51;

    const block50Event = feesCollectedEventsFixtures.find(
      (event) => event.blockNumber === config.startBlock + 50
    )!;
    await FeeModel.insertOne({
      txHash: block50Event.transactionHash,
      blockNb: block50Event.blockNumber,
      logIdx: block50Event.logIndex,
      token: block50Event.args._token,
      integrator: block50Event.args._integrator,
      integratorFee: block50Event.args._integratorFee,
      lifiFee: block50Event.args._lifiFee,
    });
    const feesEventsBeforeRun = await FeeModel.find({});
    assert.strictEqual(feesEventsBeforeRun.length, 1);

    scrap = await esmock(
      "../src/services/scrap.js",
      {
        "../src/config.js": {
          batchSize,
        },
        "../src/rpc.js": {
          retriableLoadFeesCollectedEvents: async (
            fromBlock: number,
            toBlock: number
          ) =>
            feesCollectedEventsFixtures.filter(
              (event) =>
                event.blockNumber >= fromBlock && event.blockNumber <= toBlock
            ),
          retriableGetLatestBlockNumber: async () => lastBlockOnChain,
        },
      },
      {
        // turn off logging globally
        "../src/logger.js": {
          logger: {
            debug: () => {},
            info: () => {},
          },
        },
      }
    );

    // act
    await scrap.scrapFeesCollected();

    // assert
    const feesEventsAfterRun = await FeeModel.find({});
    assert.strictEqual(feesEventsAfterRun.length, 2); // events from startBlock+50 and startBlock+51

    // -> check new block number in DB
    const newLastBlockInDb = await getLastBlockInDb();
    assert.strictEqual(newLastBlockInDb, lastBlockOnChain);
  });

  test("Call to scrapFeesCollected should not fail when exposed to FeesCollected events previously saved (because of previous failure)", async () => {
    // arrange
    // -> start at block startBlock+50 and with 1 event from block 51
    const batchSize = 5;
    const initialLastBlockInDb = config.startBlock + 50;
    await setLastBlockInDb(initialLastBlockInDb);

    const correctMockedFeesCollectedEvent = feesCollectedEventsFixtures.find(
      (event) => event.blockNumber === config.startBlock + 51
    )!;
    await FeeModel.insertOne({
      txHash: correctMockedFeesCollectedEvent.transactionHash,
      blockNb: correctMockedFeesCollectedEvent.blockNumber,
      logIdx: correctMockedFeesCollectedEvent.logIndex,
      token: correctMockedFeesCollectedEvent.args._token,
      integrator: correctMockedFeesCollectedEvent.args._integrator,
      integratorFee: correctMockedFeesCollectedEvent.args._integratorFee,
      lifiFee: correctMockedFeesCollectedEvent.args._lifiFee,
    });

    const lastBlockOnChain = config.startBlock + 100;

    scrap = await esmock(
      "../src/services/scrap.js",
      {
        "../src/config.js": {
          batchSize,
        },
        "../src/rpc.js": {
          retriableLoadFeesCollectedEvents: async (
            fromBlock: number,
            toBlock: number
          ) =>
            feesCollectedEventsFixtures.filter(
              (event) =>
                event.blockNumber >= fromBlock && event.blockNumber <= toBlock
            ),
          retriableGetLatestBlockNumber: async () => lastBlockOnChain,
        },
      },
      {
        // turn off logging globally
        "../src/logger.js": {
          logger: {
            debug: () => {},
            info: () => {},
          },
        },
      }
    );

    // act
    await scrap.scrapFeesCollected();

    // assert
    const feesEventsAfterRun = await FeeModel.find({});
    assert.strictEqual(feesEventsAfterRun.length, 2); // events at block startBlock+51 and startBlock+70

    // -> check new block number in DB
    const newLastBlockInDb = await getLastBlockInDb();
    assert.strictEqual(newLastBlockInDb, lastBlockOnChain);
  });

  // Could arguably be part of unit tests for the rpc operations (and the db operations) but given that rest of testable
  // behavior of these methods falls within responsibility of libraries used and effect on job is what matters, added here.
  test("Single RPC connectivity failure should just lead to repeat of the request, not failure", async () => {
    // arrange
    const batchSize = 5;
    const initialLastBlockInDb = config.startBlock + 50;
    await setLastBlockInDb(initialLastBlockInDb);
    const lastBlockOnChain = config.startBlock + 100;

    let rpcErrorOccurred = false;

    const mockedRpcModule = await esmock("../src/rpc.js", {
      ethers: {
        ethers: {
          ...originalEthers,
          providers: {
            ...originalEthers.providers,
            JsonRpcProvider: class MockJsonRpcProvider {
              constructor(config: any) {
                // Mock constructor - don't call super() to avoid network calls
              }

              async getBlockNumber() {
                return lastBlockOnChain;
              }
              async getNetwork() {
                return { name: "mock", chainId: 1 };
              }
            },
          },
          Contract: function MockContract(
            address: any,
            abi: any,
            provider: any
          ) {
            let callCount = 0;

            return {
              filters: {
                FeesCollected: () => ({}),
              },
              queryFilter: async (
                filter: any,
                fromBlock: any,
                toBlock: any
              ) => {
                callCount++;

                if (callCount < 3) {
                  rpcErrorOccurred = true;
                  throw new Error("Simulated RPC failure");
                }

                return feesCollectedEventsFixtures.filter(
                  (event) =>
                    event.blockNumber >= fromBlock &&
                    event.blockNumber <= toBlock
                );
              },
            };
          },
        },
      },
    });

    scrap = await esmock(
      "../src/services/scrap.js",
      {
        "../src/config.js": {
          batchSize,
        },
        "../src/rpc.js": {
          ...mockedRpcModule,
          retriableGetLatestBlockNumber: async () => lastBlockOnChain,
        },
      },
      {
        // turn off logging globally
        "../src/logger.js": {
          logger: {
            debug: () => {},
            info: () => {},
          },
        },
      }
    );

    // act
    await scrap.scrapFeesCollected();

    // assert
    // -> ensure rpc error occurred (and job completed regardless)
    assert.strictEqual(rpcErrorOccurred, true);

    // -> 2 FeesCollected events stored
    const fees = await FeeModel.find({});
    assert.strictEqual(fees.length, 2); // events at block nb 51 and 70

    // -> LastBlock.blockNb updated to nb at beginning of the relevant batch run
    const lastBlockInDbAfterRun = (await getLastBlockInDb()) as number;
    assert.strictEqual(lastBlockInDbAfterRun, lastBlockOnChain);
  });
});
