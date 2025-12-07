// server/src/utils/rateLimiter.ts

/**
 * Simple rate limiter using token bucket algorithm
 * Ensures we don't exceed API rate limits
 */
export class RateLimiter {
    private tokens: number;
    private maxTokens: number;
    private refillRate: number; // tokens per second
    private lastRefill: number;
    private queue: Array<() => void> = [];

    constructor(maxTokens: number, refillRate: number) {
        this.maxTokens = maxTokens;
        this.tokens = maxTokens;
        this.refillRate = refillRate;
        this.lastRefill = Date.now();
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refill(): void {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000; // Convert to seconds
        const tokensToAdd = elapsed * this.refillRate;
        
        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }

    /**
     * Wait until a token is available
     */
    async acquire(): Promise<void> {
        return new Promise((resolve) => {
            this.refill();

            if (this.tokens >= 1) {
                this.tokens -= 1;
                resolve();
            } else {
                // Calculate wait time needed
                const tokensNeeded = 1 - this.tokens;
                const waitTime = (tokensNeeded / this.refillRate) * 1000; // Convert to milliseconds
                
                setTimeout(() => {
                    this.refill();
                    this.tokens -= 1;
                    resolve();
                }, Math.ceil(waitTime));
            }
        });
    }
}

/**
 * Default rate limiter for AI API calls
 * Conservative defaults: 10 requests per minute (1 request per 6 seconds)
 * This can be adjusted based on provider limits
 */
let defaultRateLimiter: RateLimiter | null = null;

/**
 * Get or create the default rate limiter
 */
export function getDefaultRateLimiter(): RateLimiter {
    if (!defaultRateLimiter) {
        // 10 requests per minute = 1 request per 6 seconds
        // But we'll be more conservative: 1 request per 3 seconds (20 per minute)
        defaultRateLimiter = new RateLimiter(5, 1 / 3); // 5 tokens, refill 1 token every 3 seconds
    }
    return defaultRateLimiter;
}

/**
 * Wait for rate limiter before making an API call
 */
export async function waitForRateLimit(): Promise<void> {
    const limiter = getDefaultRateLimiter();
    await limiter.acquire();
}

