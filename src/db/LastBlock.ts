import { getModelForClass, prop, modelOptions } from "@typegoose/typegoose";

import { makeFuncRetriable } from "../retry.js";

/*
 * Model intended to be created just once to store the most recent block parsed.
 */
@modelOptions({ schemaOptions: { collection: "lastBlocks" } })
class LastBlock {
  @prop({ required: true, type: Number })
  public blockNb!: number;
}

const LastBlockModel = getModelForClass(LastBlock);

const getLastBlockInDb = async (): Promise<number | undefined> => {
  return (await LastBlockModel.findOne({}))?.blockNb;
};

const setLastBlockInDb = async (newBlockNb: number): Promise<void> => {
  // `upsert: true` to handle creation at the first call
  await LastBlockModel.updateOne({}, { blockNb: newBlockNb }, { upsert: true });
};

const retriableGetLastBlockInDb = makeFuncRetriable(getLastBlockInDb);
const retriableSetLastBlockInDb = makeFuncRetriable(setLastBlockInDb);

export {
  getLastBlockInDb,
  setLastBlockInDb,
  retriableGetLastBlockInDb,
  retriableSetLastBlockInDb,
  LastBlockModel, // for tests else no direct operation with the model
};
