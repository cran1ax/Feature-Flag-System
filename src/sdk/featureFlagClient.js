/**
 * Lightweight Feature Flag SDK Client
 *
 * Wraps the Feature Flag API's /evaluate endpoint.
 * Designed for use by client applications or middleware
 * to check if a flag is enabled for a given user.
 *
 * Usage:
 *   const client = new FeatureFlagClient("http://localhost:3000/api/flags");
 *   const result = await client.evaluate("dark_mode", "user_123");
 *   // result → { flag: "dark_mode", user_id: "user_123", enabled: true }
 */

class FeatureFlagClient {
  constructor(baseUrl = "http://localhost:3000/api/flags") {
    this.baseUrl = baseUrl;
  }

  /**
   * Evaluate whether a flag is enabled for a specific user.
   * @param {string} flagName - The flag to evaluate
   * @param {string} userId  - The user ID to evaluate against
   * @returns {Promise<{ flag: string, user_id: string, enabled: boolean }>}
   */
  async evaluate(flagName, userId) {
    const url = `${this.baseUrl}/evaluate?flag=${encodeURIComponent(flagName)}&user_id=${encodeURIComponent(userId)}`;

    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Evaluate failed with status ${response.status}`);
    }

    return response.json();
  }
}

module.exports = FeatureFlagClient;
