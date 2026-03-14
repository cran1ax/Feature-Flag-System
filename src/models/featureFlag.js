const pool = require("../config/db");

const FeatureFlag = {
  async create({ flag_name, description, is_enabled = false }) {
    const result = await pool.query(
      `INSERT INTO feature_flags (flag_name, description, is_enabled)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [flag_name, description, is_enabled]
    );
    return result.rows[0];
  },

  async findAll() {
    const result = await pool.query(
      "SELECT * FROM feature_flags ORDER BY created_at DESC"
    );
    return result.rows;
  },

  async findByName(flag_name) {
    const result = await pool.query(
      "SELECT * FROM feature_flags WHERE flag_name = $1",
      [flag_name]
    );
    return result.rows[0] || null;
  },

  async update(flag_name, fields) {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(fields)) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(flag_name);

    const result = await pool.query(
      `UPDATE feature_flags
       SET ${setClauses.join(", ")}
       WHERE flag_name = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(flag_name) {
    const result = await pool.query(
      "DELETE FROM feature_flags WHERE flag_name = $1 RETURNING *",
      [flag_name]
    );
    return result.rows[0] || null;
  },
};

module.exports = FeatureFlag;
