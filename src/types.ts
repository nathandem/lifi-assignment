/**
 * Represents a parsed `FeesCollected` event from the FeeCollector contract.
 * @interface
 */
interface ParsedFeesCollectedEvent {
  /** Block number of the event */
  blockNb: number;
  /** Transaction hash of the event */
  txHash: string;
  /** Log index of the event in the tx */
  logIdx: number;
  /** Token address involved in the fee collection */
  token: string;
  /** Integrator address receiving the fee */
  integrator: string;
  /** Fee amount allocated to the integrator */
  integratorFee: string;
  /** Fee amount allocated to LI.FI */
  lifiFee: string;
}

export { type ParsedFeesCollectedEvent };
