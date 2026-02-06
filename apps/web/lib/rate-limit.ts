// Simple rate limiter that spaces out API calls
// Returns cached results immediately, only delays actual API calls

type QueuedTask<T> = {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

class RateLimiter {
  private queue: QueuedTask<unknown>[] = [];
  private processing = false;
  private delayMs: number;

  constructor(delayMs: number) {
    this.delayMs = delayMs;
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      try {
        const result = await task.execute();
        task.resolve(result);
      } catch (error) {
        task.reject(error);
      }

      if (this.queue.length > 0) {
        await new Promise((r) => setTimeout(r, this.delayMs));
      }
    }

    this.processing = false;
  }
}

export const geocodeRateLimiter = new RateLimiter(100);
export const directionsRateLimiter = new RateLimiter(200);
