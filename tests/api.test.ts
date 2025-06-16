import assert from "node:assert";
import { describe, it, before, after } from "node:test";

import { MongoMemoryServer } from "mongodb-memory-server-core";
import request from "supertest";

import config from "../src/config.js";
import { FeeModel } from "../src/db/Fee.js";
import { testConnect, disconnect } from "../src/db/connection.js";
import { app } from "../src/api.ts";

import { feesCollectedEventsFixtures } from "./fixtures.js";

describe("REST API for FeesCollected /fees", () => {
  let mongoUri: string;
  let mongoServer: MongoMemoryServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await testConnect(mongoUri);

    const events = feesCollectedEventsFixtures.map((event) => ({
      txHash: event.transactionHash,
      blockNb: event.blockNumber,
      logIdx: event.logIndex,
      token: event.args._token,
      integrator: event.args._integrator,
      integratorFee: event.args._integratorFee,
      lifiFee: event.args._lifiFee,
    }));
    await FeeModel.insertMany(events);
  });

  after(async () => {
    await FeeModel.deleteMany({});
    await disconnect();
    await mongoServer.stop();
  });

  it("Should only return events of the integrator", async () => {
    const integrator = "0x1Bcc58D165e5374D7B492B21c0a572Fd61C0C2a0";
    const integratorEventNb = (await FeeModel.find({ integrator })).length;

    const response = await request(app).get(
      `/fees?address=${integrator}&page=1`
    );

    assert.strictEqual(response.status, 200);
    assert(response.headers["content-type"].includes("application/json"));
    assert.strictEqual(response.body.data.length, integratorEventNb);
  });

  it("Should return events in pages", async () => {
    const integrator = "0x1Bcc58D165e5374D7B492B21c0a572Fd61C0C2a0";
    const integratorEventNb = (await FeeModel.find({ integrator })).length;
    assert(integratorEventNb < config.pageSize);
    const page = 2;

    const response = await request(app).get(
      `/fees?address=${integrator}&page=${page}`
    );

    // no events on page for this integrator, as its total nb of events fits on page 1
    assert.strictEqual(response.status, 200);
    assert(response.headers["content-type"].includes("application/json"));
    assert.strictEqual(response.body.data.length, 0);
  });

  it("Should validate the integrator address as an Ethereum address", async () => {
    const incorrectIntegratorAddress = "foobar";

    const response = await request(app).get(
      `/fees?address=${incorrectIntegratorAddress}&page=1`
    );

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.error, "Invalid query parameters");
  });

  it("Should fail without the required queryparams", async () => {
    const integrator = "0x1Bcc58D165e5374D7B492B21c0a572Fd61C0C2a0";
    const responseMissingPage = await request(app).get(
      `/fees?address=${integrator}`
    );
    assert.strictEqual(responseMissingPage.status, 400);

    const responseMissingAddress = await request(app).get(`/fees?page=1`);
    assert.strictEqual(responseMissingAddress.status, 400);
  });
});
