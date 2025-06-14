type RetryOptions = {
  retries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
};

/**
 * Retry a function `fn` with an exponential backoff+jitter
 * based on different options.
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> => {
  const {
    retries = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    backoffFactor = 2,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // add delay with exponential backoff and jitter
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffFactor, attempt - 1),
        maxDelayMs
      );
      const jitter = Math.random() * 0.1 * delay;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
};

/**
 * Function wrapper to make said function retriable. Suitable for IO calls, such as
 * RPC requests, API calls or DB queries.
 * @param fn - Function to retry
 * @param options - Optional retry parameters
 * @returns - Promise resolving to the return value of the function
 */
function makeFuncRetriable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: any[]) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}

export { retryWithBackoff, makeFuncRetriable, type RetryOptions };
