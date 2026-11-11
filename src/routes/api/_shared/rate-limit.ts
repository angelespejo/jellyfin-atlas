/**
 * Configuration options for initializing a rate limiter instance.
 */
export interface RateLimiterOptions {
  /**
   * Time window duration in milliseconds.
   * @default 60000 (1 minute)
   */
  windowMs?: number

  /**
   * Maximum number of allowed requests per IP within the time window.
   * @default 30
   */
  maxRequests?: number

  /**
   * Custom Map instance to store request counts per IP.
   * If omitted, an internal Map is created specifically for this instance.
   */
  stores?: Map<string, { count: number; resetAt: number }>
}

/**
 * Result of evaluating a rate limit check for an IP address.
 */
export interface RateLimitResult {
  /** Whether the current request is allowed under configured limits. */
  allowed: boolean

  /** Remaining allowed requests within the current time window. */
  remaining: number

  /** Unix timestamp in milliseconds when the request counter resets. */
  resetAt: number
}

/**
 * Result containing standard rate limit HTTP headers ready to be set on responses.
 */
export interface RateLimitHeadersResult {
  /** Whether the current request is allowed under configured limits. */
  allowed: boolean

  /** Key-value object containing standard `X-RateLimit-*` HTTP headers. */
  headers: Record<string, string>
}

/**
 * Interface representing a Rate Limiter instance created by the factory.
 */
export interface RateLimiter {
  /**
   * Checks whether an IP address has exceeded the request limit.
   *
   * @param ip - The client's IP address to evaluate.
   * @returns A {@link RateLimitResult} object containing the status, remaining requests, and reset timestamp.
   */
  get(ip: string): RateLimitResult

  /**
   * Generates `X-RateLimit-*` HTTP response headers corresponding to the given IP address.
   *
   * @param ip - The client's IP address to evaluate.
   * @returns A {@link RateLimitHeadersResult} object with permission status and response headers.
   */
  getHeaders(ip: string): RateLimitHeadersResult

  /**
   * Stops the internal cleanup timer to prevent resource leaks when disposing of the limiter.
   */
  stop(): void
}

/**
 * Creates an isolated Rate Limiter instance with its own configuration and state store.
 *
 * @param options - Optional configuration options for the rate limiter.
 * @returns An object implementing the {@link RateLimiter} interface.
 *
 * @example
 * ```ts
 * const loginLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });
 *
 * const { allowed, headers } = loginLimiter.getRateLimitHeaders(clientIp);
 * if (!allowed) {
 *   return new Response('Too many attempts', { status: 429, headers });
 * }
 * ```
 */
export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const windowMs = options.windowMs ?? 60_000
  const maxRequests = options.maxRequests ?? 30
  const stores = options.stores ?? new Map<string, { count: number; resetAt: number }>()

  // Periodic cleanup task to prevent memory leaks in the instance store
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [ip, entry] of stores) {
      if (now >= entry.resetAt) stores.delete(ip)
    }
  }, windowMs)

  function checkRateLimit(ip: string): RateLimitResult {
    const now = Date.now()
    let entry = stores.get(ip)

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs }
      stores.set(ip, entry)
    }

    entry.count++
    const allowed = entry.count <= maxRequests

    return {
      allowed,
      remaining: Math.max(0, maxRequests - entry.count),
      resetAt: entry.resetAt,
    }
  }

  function getRateLimitHeaders(ip: string): RateLimitHeadersResult {
    const result = checkRateLimit(ip)

    return {
      allowed: result.allowed,
      headers: {
        'X-RateLimit-Limit': String(maxRequests),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    }
  }

  function stop(): void {
    clearInterval(cleanupInterval)
    stores.clear()
  }

  return {
    get: checkRateLimit,
    getHeaders: getRateLimitHeaders,
    stop,
  }
}
