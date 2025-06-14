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

const _getLastBlockInDb = async (): Promise<number | undefined> => {
  return (await LastBlockModel.findOne({}))?.blockNb;
};

const _setLastBlockInDb = async (newBlockNb: number): Promise<void> => {
  // `upsert: true` to handle creation at the first call
  await LastBlockModel.updateOne({}, { blockNb: newBlockNb }, { upsert: true });
};

const getLastBlockInDb = makeFuncRetriable(_getLastBlockInDb);
const setLastBlockInDb = makeFuncRetriable(_setLastBlockInDb);

export {
  getLastBlockInDb,
  setLastBlockInDb,
  LastBlockModel, // for tests else no direct operation with the model
};
