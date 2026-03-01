/**
 * Request Deduplicator and Rate Limit Handler
 * 
 * Prevents duplicate in-flight requests and handles rate limiting gracefully
 */

interface InFlightRequest {
  promise: Promise<any>;
  timestamp: number;
}

interface RateLimitState {
  isRateLimited: boolean;
  retryAfter: number;
  limitedAt: number;
}

class RequestDeduplicator {
  private inFlightRequests = new Map<string, InFlightRequest>();
  private rateLimitState: RateLimitState = {
    isRateLimited: false,
    retryAfter: 0,
    limitedAt: 0,
  };
  
  // Circuit breaker state
  private failureCount = 0;
  private lastFailureTime = 0;
  private circuitOpen = false;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  /**
   * Execute a request with deduplication
   * Same request (same key) while in-flight will return the same promise
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      dedupWindow?: number;
      retryCount?: number;
      retryDelay?: number;
    } = {}
  ): Promise<T> {
    const { dedupWindow = 5000, retryCount = 3, retryDelay = 1000 } = options;

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      throw new Error('Circuit breaker is open - too many failures');
    }

    // Check if we're currently rate limited
    if (this.isRateLimited()) {
      const waitTime = this.getRateLimitWaitTime();
      console.log(`⏳ Rate limited, waiting ${waitTime}ms before request: ${key}`);
      await this.delay(waitTime);
    }

    // Check for existing in-flight request
    const existing = this.inFlightRequests.get(key);
    if (existing && Date.now() - existing.timestamp < dedupWindow) {
      console.log(`🔄 Deduplicating request: ${key}`);
      return existing.promise as Promise<T>;
    }

    // Create new request promise
    const promise = this.executeWithRetry(requestFn, retryCount, retryDelay, key);
    
    // Store in-flight request
    this.inFlightRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    // Clean up after completion
    promise
      .then(() => {
        setTimeout(() => {
          this.inFlightRequests.delete(key);
        }, dedupWindow);
      })
      .catch(() => {
        setTimeout(() => {
          this.inFlightRequests.delete(key);
        }, dedupWindow);
      });

    return promise;
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    retryCount: number,
    retryDelay: number,
    key: string
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await requestFn();
        
        // Success - reset failure count
        this.failureCount = 0;
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          const retryAfter = this.extractRetryAfter(error) || (retryDelay * Math.pow(2, attempt)) / 1000;
          
          this.setRateLimited(retryAfter);
          
          console.warn(`⏳ Rate limit hit for ${key}, waiting ${retryAfter}s before retry ${attempt + 1}/${retryCount}`);
          
          // Wait longer for rate limits
          await this.delay(retryAfter * 1000);
          continue; // Retry immediately after waiting
        }
        
        // Don't retry on client errors (4xx except 429)
        if (this.isClientError(error)) {
          throw error;
        }
        
        // Record failure for circuit breaker
        this.recordFailure();
        
        // Calculate exponential backoff delay
        const backoffDelay = retryDelay * Math.pow(2, attempt);
        
        if (attempt < retryCount) {
          console.log(`⏳ Retrying ${key} in ${backoffDelay}ms (attempt ${attempt + 1}/${retryCount})`);
          await this.delay(backoffDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message?.toLowerCase() || '';
    const status = error.status || error.response?.status;
    
    return (
      status === 429 ||
      message.includes('too many requests') ||
      message.includes('rate limit') ||
      message.includes('rate_limit') ||
      message.includes('rateLimit')
    );
  }

  /**
   * Extract retry-after from error
   */
  private extractRetryAfter(error: any): number | null {
    // Check error message for RATE_LIMIT_RETRY:seconds format
    const message = error.message || '';
    const match = message.match(/RATE_LIMIT_RETRY:(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    
    // Check response headers or body
    return error.retryAfter || error.response?.headers?.['retry-after'] || null;
  }

  /**
   * Check if error is a client error (4xx)
   */
  private isClientError(error: any): boolean {
    const status = error.status || error.response?.status;
    return status >= 400 && status < 500 && status !== 429;
  }

  /**
   * Set rate limited state
   */
  private setRateLimited(retryAfter: number): void {
    this.rateLimitState = {
      isRateLimited: true,
      retryAfter: retryAfter * 1000, // Convert to ms
      limitedAt: Date.now(),
    };
  }

  /**
   * Check if currently rate limited
   */
  private isRateLimited(): boolean {
    if (!this.rateLimitState.isRateLimited) return false;
    
    const elapsed = Date.now() - this.rateLimitState.limitedAt;
    return elapsed < this.rateLimitState.retryAfter;
  }

  /**
   * Get remaining wait time for rate limit
   */
  private getRateLimitWaitTime(): number {
    const elapsed = Date.now() - this.rateLimitState.limitedAt;
    return Math.max(0, this.rateLimitState.retryAfter - elapsed);
  }

  /**
   * Record a failure for circuit breaker
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitOpen = true;
      console.warn(`🔴 Circuit breaker opened after ${this.failureCount} failures`);
      
      // Auto-reset circuit after timeout
      setTimeout(() => {
        this.circuitOpen = false;
        this.failureCount = 0;
        console.log('🟢 Circuit breaker reset');
      }, this.CIRCUIT_BREAKER_TIMEOUT);
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(): boolean {
    if (!this.circuitOpen) return false;
    
    // Check if circuit should be reset
    const elapsed = Date.now() - this.lastFailureTime;
    if (elapsed > this.CIRCUIT_BREAKER_TIMEOUT) {
      this.circuitOpen = false;
      this.failureCount = 0;
      return false;
    }
    
    return true;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all in-flight requests (useful for logout)
   */
  clear(): void {
    this.inFlightRequests.clear();
    this.failureCount = 0;
    this.circuitOpen = false;
    this.rateLimitState = {
      isRateLimited: false,
      retryAfter: 0,
      limitedAt: 0,
    };
  }

  /**
   * Get current stats for debugging
   */
  getStats(): {
    inFlightCount: number;
    failureCount: number;
    circuitOpen: boolean;
    isRateLimited: boolean;
  } {
    return {
      inFlightCount: this.inFlightRequests.size,
      failureCount: this.failureCount,
      circuitOpen: this.circuitOpen,
      isRateLimited: this.isRateLimited(),
    };
  }
}

// Export singleton
export const requestDeduplicator = new RequestDeduplicator();
export default requestDeduplicator;
