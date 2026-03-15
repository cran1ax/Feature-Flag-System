const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function runMigration() {
  const migrations = ["migration.sql", "add_rollout_fields.sql"];

  try {
    for (const file of migrations) {
      const sql = fs.readFileSync(path.join(__dirname, file), "utf-8");
      await pool.query(sql);
      console.log(`Migration '${file}' completed successfully`);
    }
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
