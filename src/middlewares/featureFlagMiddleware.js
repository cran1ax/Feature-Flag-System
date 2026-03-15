const FeatureFlagClient = require("../sdk/featureFlagClient");

/**
 * Express middleware factory for feature flag evaluation.
 *
 * Evaluates the configured flags for the current user on every request
 * and attaches the results to `req.featureFlags`.
 *
 * Options:
 *   flags     - Array of flag names to evaluate, e.g. ["dark_mode", "beta_feature"]
 *   getUserId - Function (req) => string that extracts the user ID from the request
 *   baseUrl   - Optional API base URL (defaults to http://localhost:3000/api/flags)
 *
 * Usage:
 *   app.use(featureFlagMiddleware({
 *     flags: ["dark_mode", "beta_feature"],
 *     getUserId: (req) => req.headers["x-user-id"],
 *   }));
 *
 *   // In a route handler:
 *   app.get("/dashboard", (req, res) => {
 *     if (req.featureFlags.dark_mode) {
 *       // serve dark mode UI
 *     }
 *   });
 */
function featureFlagMiddleware({ flags = [], getUserId, baseUrl } = {}) {
  const client = new FeatureFlagClient(baseUrl);

  return async (req, res, next) => {
    // Initialize featureFlags — all default to false
    req.featureFlags = {};
    for (const flag of flags) {
      req.featureFlags[flag] = false;
    }

    // Extract user ID from request
    const userId = getUserId ? getUserId(req) : null;

    if (!userId || flags.length === 0) {
      return next();
    }

    try {
      // Evaluate all flags in parallel
      const results = await Promise.allSettled(
        flags.map((flag) => client.evaluate(flag, userId))
      );

      for (let i = 0; i < flags.length; i++) {
        if (results[i].status === "fulfilled") {
          req.featureFlags[flags[i]] = results[i].value.enabled;
        }
        // On failure, flag stays false (fail-safe)
      }
    } catch (err) {
      // Fail-safe: if something unexpected happens, proceed with all flags false
      console.error("Feature flag middleware error:", err.message);
    }

    next();
  };
}

module.exports = featureFlagMiddleware;
