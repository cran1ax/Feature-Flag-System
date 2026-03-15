const crypto = require("crypto");
const FeatureFlag = require("../models/featureFlag");
const redisClient = require("../config/redis");

const CACHE_TTL = 60; // seconds

// POST /api/flags
exports.createFlag = async (req, res) => {
  try {
    const { flag_name, description, is_enabled, rollout_percentage, targeted_users } = req.body;

    if (!flag_name) {
      return res.status(400).json({ error: "flag_name is required" });
    }

    const flag = await FeatureFlag.create({ flag_name, description, is_enabled, rollout_percentage, targeted_users });
    res.status(201).json(flag);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: `Flag '${req.body.flag_name}' already exists` });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/flags
exports.getAllFlags = async (req, res) => {
  try {
    const flags = await FeatureFlag.findAll();
    res.json(flags);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/flags/:name  (cache-aside)
exports.getFlagByName = async (req, res) => {
  try {
    const cacheKey = `flag:${req.params.name}`;

    // 1. Check Redis cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // 2. Cache miss — query PostgreSQL
    const flag = await FeatureFlag.findByName(req.params.name);

    if (!flag) {
      return res.status(404).json({ error: `Flag '${req.params.name}' not found` });
    }

    // 3. Store in Redis with TTL
    await redisClient.set(cacheKey, JSON.stringify(flag), { EX: CACHE_TTL });

    res.json(flag);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/flags/:name  (update cache after write)
exports.updateFlag = async (req, res) => {
  try {
    const { description, is_enabled, rollout_percentage, targeted_users } = req.body;
    const fields = {};

    if (description !== undefined) fields.description = description;
    if (is_enabled !== undefined) fields.is_enabled = is_enabled;
    if (rollout_percentage !== undefined) fields.rollout_percentage = rollout_percentage;
    if (targeted_users !== undefined) fields.targeted_users = targeted_users;

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const flag = await FeatureFlag.update(req.params.name, fields);

    if (!flag) {
      return res.status(404).json({ error: `Flag '${req.params.name}' not found` });
    }

    // Update Redis cache with fresh data
    const cacheKey = `flag:${req.params.name}`;
    await redisClient.set(cacheKey, JSON.stringify(flag), { EX: CACHE_TTL });

    res.json(flag);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /api/flags/:name  (invalidate cache)
exports.deleteFlag = async (req, res) => {
  try {
    const flag = await FeatureFlag.delete(req.params.name);

    if (!flag) {
      return res.status(404).json({ error: `Flag '${req.params.name}' not found` });
    }

    // Remove from Redis cache
    await redisClient.del(`flag:${req.params.name}`);

    res.json({ message: `Flag '${req.params.name}' deleted`, flag });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/flags/evaluate?flag=name&user_id=123
exports.evaluateFlag = async (req, res) => {
  try {
    const { flag, user_id } = req.query;

    if (!flag || !user_id) {
      return res.status(400).json({ error: "Both 'flag' and 'user_id' query params are required" });
    }

    // Fetch flag (cache-aside)
    const cacheKey = `flag:${flag}`;
    let flagData;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      flagData = JSON.parse(cached);
    } else {
      flagData = await FeatureFlag.findByName(flag);

      if (!flagData) {
        return res.status(404).json({ error: `Flag '${flag}' not found` });
      }

      await redisClient.set(cacheKey, JSON.stringify(flagData), { EX: CACHE_TTL });
    }

    // 1. If flag is globally disabled, return false
    if (!flagData.is_enabled) {
      return res.json({ flag, user_id, enabled: false });
    }

    // 2. If user is in targeted_users, return true
    if (flagData.targeted_users && flagData.targeted_users.includes(String(user_id))) {
      return res.json({ flag, user_id, enabled: true });
    }

    // 3. Consistent hashing: SHA-256 of user_id → first 8 hex chars → mod 100
    const hash = crypto.createHash("sha256").update(String(user_id)).digest("hex");
    const hashInt = parseInt(hash.substring(0, 8), 16);
    const bucket = hashInt % 100;

    const enabled = bucket < flagData.rollout_percentage;

    res.json({ flag, user_id, enabled });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
