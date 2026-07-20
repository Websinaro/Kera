const SESSION_LIMIT_MS = (Number(process.env.SESSION_LIMIT_MINUTES) || 120) * 60 * 1000;
const WINDOW_LIMIT_MS = (Number(process.env.WINDOW_LIMIT_MINUTES) || 30) * 60 * 1000;
const WINDOW_LIMIT_MESSAGES = Number(process.env.WINDOW_LIMIT_MESSAGES) || 25;

/**
 * Rules:
 *  - A user's "session" starts the moment they send their first message.
 *  - A session lasts SESSION_LIMIT_MS (default 2h). Once it lapses, a brand
 *    new session starts automatically on the next message (rolling quota,
 *    not a permanent lockout).
 *  - Inside a session, at most WINDOW_LIMIT_MESSAGES messages are allowed
 *    per rolling WINDOW_LIMIT_MS window (default 25 / 30 min).
 */
function computeUsage(user) {
  const now = Date.now();
  const sessionStart = user.sessionStart ? user.sessionStart.getTime() : null;
  const windowStart = user.windowStart ? user.windowStart.getTime() : null;

  const sessionExpired = !sessionStart || now - sessionStart > SESSION_LIMIT_MS;
  const windowExpired = !windowStart || now - windowStart > WINDOW_LIMIT_MS || sessionExpired;

  const effectiveWindowStart = windowExpired ? now : windowStart;
  const effectiveCount = windowExpired ? 0 : user.windowCount;
  const effectiveSessionStart = sessionExpired ? now : sessionStart;

  const remaining = Math.max(0, WINDOW_LIMIT_MESSAGES - effectiveCount);
  const windowResetAt = new Date(effectiveWindowStart + WINDOW_LIMIT_MS);
  const sessionResetAt = new Date(effectiveSessionStart + SESSION_LIMIT_MS);

  return {
    sessionExpired,
    windowExpired,
    effectiveSessionStart,
    effectiveWindowStart,
    effectiveCount,
    remaining,
    windowResetAt,
    sessionResetAt,
    limit: WINDOW_LIMIT_MESSAGES,
  };
}

async function rateLimit(req, res, next) {
  try {
    const user = req.user;
    const usage = computeUsage(user);

    if (usage.remaining <= 0) {
      return res.status(429).json({
        error: `Rate limit reached. You can send up to ${usage.limit} messages every ${
          WINDOW_LIMIT_MS / 60000
        } minutes.`,
        windowResetAt: usage.windowResetAt,
        sessionResetAt: usage.sessionResetAt,
      });
    }

    // Persist the (possibly reset) window/session and bump the count.
    user.sessionStart = new Date(usage.effectiveSessionStart);
    user.windowStart = new Date(usage.effectiveWindowStart);
    user.windowCount = usage.effectiveCount + 1;
    await user.save();

    req.usage = {
      remaining: usage.remaining - 1,
      windowResetAt: usage.windowResetAt,
      sessionResetAt: usage.sessionResetAt,
      limit: usage.limit,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { rateLimit, computeUsage, SESSION_LIMIT_MS, WINDOW_LIMIT_MS, WINDOW_LIMIT_MESSAGES };
