import { query } from "./db";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Distributed, database-backed atomic rate limiter.
 * Operates across multiple serverless instances and survives restarts.
 *
 * @param key Unique key to rate limit (e.g. 'sub:12', 'login:192.168.1.1', 'login:teamname')
 * @param limitCount Maximum attempts allowed within the window
 * @param windowSeconds Window duration in seconds
 */
export async function checkRateLimit(
  key: string,
  limitCount: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    // Opportunistically prune expired rate-limit records (> 1 hour old) ~5% of requests
    if (Math.random() < 0.05) {
      query("DELETE FROM rate_limits WHERE last_attempt_at < NOW() - INTERVAL '1 hour'").catch(() => {});
    }

    const res = await query<{
      is_allowed: boolean;
      retry_after: number;
    }>(
      `INSERT INTO rate_limits (key, last_attempt_at, attempt_count)
       VALUES ($1, NOW(), 1)
       ON CONFLICT (key) DO UPDATE
       SET 
         attempt_count = CASE
           WHEN rate_limits.last_attempt_at < NOW() - ($3 || ' seconds')::INTERVAL THEN 1
           ELSE rate_limits.attempt_count + 1
         END,
         last_attempt_at = CASE
           WHEN rate_limits.last_attempt_at < NOW() - ($3 || ' seconds')::INTERVAL THEN NOW()
           ELSE rate_limits.last_attempt_at
         END
       RETURNING 
         (attempt_count <= $2) AS is_allowed,
         GREATEST(0, CEIL(EXTRACT(EPOCH FROM (last_attempt_at + ($3 || ' seconds')::INTERVAL - NOW()))))::INT AS retry_after;`,
      [key, limitCount, windowSeconds]
    );

    const row = res.rows[0];
    if (!row) {
      return { allowed: false, retryAfterSeconds: 5 };
    }
    return {
      allowed: row.is_allowed,
      retryAfterSeconds: row.is_allowed ? 0 : Math.max(1, Number(row.retry_after) || 1),
    };
  } catch (err) {
    console.error("Distributed rate limiter error:", err);
    // Fail closed so transient database errors cannot be leveraged to bypass rate limits
    return { allowed: false, retryAfterSeconds: 5 };
  }
}

/**
 * Checks if a team is submitting flags too quickly.
 * Enforces a strict 4-second cooldown between submission attempts per team.
 */
export async function checkSubmissionRateLimit(
  teamId: number,
  cooldownSeconds = 4
): Promise<RateLimitResult> {
  return checkRateLimit(`sub:${teamId}`, 1, cooldownSeconds);
}

/**
 * Throttles login attempts to prevent brute-forcing 6-character team access codes.
 * Allows at most 5 attempts per 60 seconds per target key (IP or team identifier).
 */
export async function checkLoginRateLimit(
  identifier: string,
  maxAttempts = 5,
  windowSeconds = 60
): Promise<RateLimitResult> {
  return checkRateLimit(`login:${identifier}`, maxAttempts, windowSeconds);
}
