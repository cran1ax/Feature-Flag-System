const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function runMigration() {
  const sql = fs.readFileSync(
    path.join(__dirname, "migration.sql"),
    "utf-8"
  );

  try {
    await pool.query(sql);
    console.log("Migration completed successfully");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
