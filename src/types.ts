/**
 * Represents a parsed `FeesCollected` event from the FeeCollector contract.
 * @interface
 */
interface ParsedFeeCollectedEvent {
  /** Transaction hash of the event */
  txHash: string;
  /** Block number of the event */
  blockNb: number;
  /** Token address involved in the fee collection */
  token: string;
  /** Integrator address receiving the fee */
  integrator: string;
  /** Fee amount allocated to the integrator */
  integratorFee: string;
  /** Fee amount allocated to LI.FI */
  lifiFee: string;
}

export { type ParsedFeeCollectedEvent };
