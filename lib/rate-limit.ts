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
    const res = await query<{
      is_allowed: boolean;
      retry_after: number;
    }>(
      `WITH current_record AS (
         SELECT key, last_attempt_at, attempt_count
         FROM rate_limits
         WHERE key = $1
       ),
       computed AS (
         SELECT
           CASE
             WHEN last_attempt_at IS NULL OR last_attempt_at < NOW() - ($3 || ' seconds')::INTERVAL THEN 1
             ELSE attempt_count + 1
           END AS new_count,
           CASE
             WHEN last_attempt_at IS NULL OR last_attempt_at < NOW() - ($3 || ' seconds')::INTERVAL THEN NOW()
             ELSE last_attempt_at
           END AS start_time
         FROM (SELECT 1) dummy
         LEFT JOIN current_record ON true
       ),
       upsert AS (
         INSERT INTO rate_limits (key, last_attempt_at, attempt_count)
         SELECT $1, start_time, new_count FROM computed
         ON CONFLICT (key) DO UPDATE
         SET attempt_count = EXCLUDED.attempt_count,
             last_attempt_at = EXCLUDED.last_attempt_at
         RETURNING attempt_count, last_attempt_at
       )
       SELECT 
         (attempt_count <= $2) AS is_allowed,
         GREATEST(0, CEIL(EXTRACT(EPOCH FROM (last_attempt_at + ($3 || ' seconds')::INTERVAL - NOW()))))::INT AS retry_after
       FROM upsert;`,
      [key, limitCount, windowSeconds]
    );

    const row = res.rows[0];
    if (!row) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    return {
      allowed: row.is_allowed,
      retryAfterSeconds: row.is_allowed ? 0 : Number(row.retry_after) || 1,
    };
  } catch (err) {
    console.error("Distributed rate limiter error:", err);
    // Fallback gracefully so an isolated DB issue does not permanently wedge submissions
    return { allowed: true, retryAfterSeconds: 0 };
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
