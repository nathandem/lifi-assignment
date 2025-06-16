import express from "express";
import Joi from "joi";

import { getFeesByIntegrator } from "../db/Fee.js";
import { logger } from "../logger.js";

interface IFeesQuery {
  page: number;
  address: string;
}
const feesQuerySchema = Joi.object<IFeesQuery>({
  page: Joi.number().integer().min(1).required(),
  address: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required(), // Ethereum address format
});

const setupRoutes = (app: express.Express) => {
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      service: "FeesCollectedApi",
      timestamp: new Date().toISOString(),
    });
  });

  // Potential improvements:
  // - logic of some rest api endpoints could be moved under services/ as logic grows
  // - authentication
  // - rate limit, but maybe preferrable outside the app itself
  // - requestId of some sort
  // - more robust, integrated error handling -> specific error per queryparam, error code
  // - depending on execution environment, health check
  app.get("/fees", async (req: express.Request, res: express.Response) => {
    try {
      const { error, value } = feesQuerySchema.validate(req.query);
      if (error) {
        res.status(400).json({
          error: "Invalid query parameters",
        });
        return;
      }

      const integratorFeesDocs = await getFeesByIntegrator(
        value.address,
        value.page
      );

      const integratorFees = integratorFeesDocs.map((feeDoc) => ({
        token: feeDoc.token,
        integrator: feeDoc.integrator,
        integratorFee: feeDoc.integratorFee,
        lifiFee: feeDoc.lifiFee,
      }));

      res.json({ success: true, data: integratorFees });
    } catch (err) {
      logger.error("Error in /fees:", err.message);
      res.status(500).json({ success: false, error: "Please retry later" });
    }
  });
};

export { setupRoutes };
