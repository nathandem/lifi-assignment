import { getModelForClass, prop, modelOptions } from "@typegoose/typegoose";

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
  // `upsert: true` to handle creation in first call
  await LastBlockModel.updateOne({}, { blockNb: newBlockNb }, { upsert: true });
};

export { getLastBlockInDb, setLastBlockInDb };
