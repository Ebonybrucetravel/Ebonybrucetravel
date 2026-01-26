/**
 * Retry utility with exponential backoff
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: (error: any) => {
    // Retry on network errors, timeouts, and 5xx errors
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
      return true;
    }
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    return false;
  },
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!opts.retryableErrors(error)) {
        throw error; // Don't retry non-retryable errors
      }

      // If this is the last attempt, throw the error
      if (attempt === opts.maxAttempts) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Retry a function with exponential backoff and custom error handling
 */
export async function retryWithBackoffAndLogging<T>(
  fn: () => Promise<T>,
  options: RetryOptions & { logger?: any; context?: string } = {},
): Promise<T> {
  const { logger, context, ...retryOptions } = options;
  const opts = { ...DEFAULT_OPTIONS, ...retryOptions };
  let lastError: any;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (logger && context) {
        logger.warn(
          `${context} - Attempt ${attempt}/${opts.maxAttempts} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Check if error is retryable
      if (!opts.retryableErrors(error)) {
        if (logger && context) {
          logger.error(`${context} - Non-retryable error:`, error);
        }
        throw error;
      }

      // If this is the last attempt, throw the error
      if (attempt === opts.maxAttempts) {
        if (logger && context) {
          logger.error(`${context} - All retry attempts exhausted:`, error);
        }
        throw error;
      }

      if (logger && context) {
        logger.log(`${context} - Retrying in ${delay}ms...`);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increase delay for next attempt
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
}

