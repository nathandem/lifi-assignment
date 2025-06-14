import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { getModelForClass } from "@typegoose/typegoose";
import { User } from "./user.model";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

it("should create a user", async () => {
  const UserModel = getModelForClass(User);
  const user = await UserModel.create({
    name: "Test",
    email: "test@example.com",
  });
  expect(user.name).toBe("Test");
});
