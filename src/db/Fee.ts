import { getModelForClass, prop, modelOptions } from "@typegoose/typegoose";

import { ParsedFeeCollectedEvent } from "../types.js";

/*
 * Represents a FeeCollection event, from the contact `FeeCollector`.
 *
 * Technical notes:
 * - txHash and blockNb are here for reliability and provide extra context about events ordering
 * - No validation performed as EVM events are high-level deterministic, highly constrained
 */
@modelOptions({ schemaOptions: { collection: "fees" } })
class Fee {
  @prop({ required: true, unique: true, type: String })
  public txHash!: string;

  @prop({ required: true, type: Number })
  public blockNb!: number;

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
 * @param parsedFees - Parsed FeeCollected events.
 *
 * @remarks
 * Inserts are idempotent. No replication of previously saved events and
 * no failure in case of multiple attempts.
 */
const saveFeeCollectedInDb = async (
  parsedFees: ParsedFeeCollectedEvent[]
): Promise<void> => {
  // TODO: put retry logic and error handling (log proper error)
  await FeeModel.insertMany(parsedFees, { ordered: false });
};

export { saveFeeCollectedInDb };
