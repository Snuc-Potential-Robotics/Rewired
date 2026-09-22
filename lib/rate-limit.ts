// In-memory rate limiting map for team submission cooldowns
// Key: teamId, Value: last timestamp in milliseconds
const teamSubmissionTimes = new Map<number, number>();

// Clean up old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [teamId, timestamp] of teamSubmissionTimes.entries()) {
    if (now - timestamp > 60000) {
      teamSubmissionTimes.delete(teamId);
    }
  }
}, 60000);

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Checks if a team is submitting flags too quickly.
 * Enforces a strict 4-second cooldown between submission attempts per team.
 */
export function checkSubmissionRateLimit(teamId: number, cooldownSeconds = 4): RateLimitResult {
  const now = Date.now();
  const lastTime = teamSubmissionTimes.get(teamId);

  if (!lastTime) {
    teamSubmissionTimes.set(teamId, now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const elapsedSeconds = (now - lastTime) / 1000;
  if (elapsedSeconds < cooldownSeconds) {
    const remaining = Math.ceil(cooldownSeconds - elapsedSeconds);
    return {
      allowed: false,
      retryAfterSeconds: remaining,
    };
  }

  teamSubmissionTimes.set(teamId, now);
  return { allowed: true, retryAfterSeconds: 0 };
}
