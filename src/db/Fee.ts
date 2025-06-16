import { MongoBulkWriteError } from "mongodb";
import {
  getModelForClass,
  prop,
  modelOptions,
  index,
} from "@typegoose/typegoose";

import { ParsedFeesCollectedEvent } from "../types.js";
import { logger } from "../logger.js";
import { makeFuncRetriable } from "../retry.js";
import config from "../config.js";

const DUPLICATE_KEY_ERROR = 11000;

/*
 * Represents a `FeesCollected` event, from the contact `FeeCollector`.
 *
 * Technical notes:
 * - blockNb, txHash and logIdx are here for reliability and provide extra context
 * - No validation performed as EVM events are high-level deterministic, highly constrained
 * - Amounts are stored as strings as mongodb doesn't offer integers above 64 bytes
 */
@index({ txHash: 1, logIdx: 1 }, { unique: true })
@modelOptions({ schemaOptions: { collection: "fees" } })
class Fee {
  @prop({ required: true, type: Number })
  public blockNb!: number;

  @prop({ required: true, type: String })
  public txHash!: string;

  @prop({ required: true, type: Number })
  public logIdx!: number;

  @prop({ required: true, type: String })
  public token!: string;

  @prop({ required: true, index: true, type: String })
  public integrator!: string;

  @prop({ required: true, type: String })
  public integratorFee!: string;

  @prop({ required: true, type: String })
  public lifiFee!: string;
}

const FeeModel = getModelForClass(Fee);

/**
 * Save fee collected events into the DB.
 * @param parsedFees - Parsed FeesCollected events.
 *
 * @remarks
 * Inserts are idempotent. No replication of previously saved events and
 * no failure in case of multiple attempts.
 */
const saveFeesCollectedInDb = async (
  parsedFees: ParsedFeesCollectedEvent[]
): Promise<void> => {
  try {
    await FeeModel.insertMany(parsedFees, { ordered: false });
  } catch (err) {
    if (
      err instanceof MongoBulkWriteError &&
      err.code === DUPLICATE_KEY_ERROR
    ) {
      logger.debug(
        `Inserted ${err.result.insertedCount} documents over ${parsedFees.length}`
      );
    } else {
      throw err;
    }
  }
};

/**
 * Retriable version of saveFeesCollectedInDb, for use in cron-like services.
 */
const retriableSaveFeesCollectedInDb = makeFuncRetriable(saveFeesCollectedInDb);

/**
 * Get fees by integrator, paginated function
 * @param integrator - Integrator to get FeesCollected from
 * @param page - What page to receive
 * @returns - Paged result of Fees for this integrator
 */
const getFeesByIntegrator = async (
  integrator: string,
  page: number
): Promise<Fee[]> => {
  const actualPage = page - 1;

  return await FeeModel.find({ integrator })
    .sort({ _id: 1 }) // reflect creation time
    .limit(config.pageSize)
    .skip(actualPage * config.pageSize);
};

export {
  saveFeesCollectedInDb,
  retriableSaveFeesCollectedInDb,
  getFeesByIntegrator,
  FeeModel, // for tests else no direct operation with the model
};
