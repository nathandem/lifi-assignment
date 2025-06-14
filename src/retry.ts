async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
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
      if (attempt === retries) break;

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffFactor, attempt - 1),
        maxDelayMs
      );
      // Add jitter to prevent thundering herd
      // Adds a small random delay (10% of the calculated delay) to prevent simultaneous retries in distributed systems.
      const jitter = Math.random() * delay * 0.1;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

// Example usage with an API call
async function example() {
  const apiCall = async () => {
    // Simulate an API call that might fail
    if (Math.random() < 0.7) throw new Error("API call failed");
    return { data: "Success" };
  };

  try {
    const result = await retryWithBackoff(apiCall, {
      retries: 4,
      initialDelayMs: 200,
      maxDelayMs: 2000,
      backoffFactor: 2,
    });
    // console.log("Result:", result);
  } catch (error) {
    // console.error("All retries failed:", error);
  }
}

// example();

export { retryWithBackoff };
