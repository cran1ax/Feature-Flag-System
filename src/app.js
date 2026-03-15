const express = require("express");
require("dotenv").config();

const featureFlagRoutes = require("./routes/featureFlagRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use("/api/flags", featureFlagRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Feature Flag Middleware Usage Example ───────────────────────
//
// const featureFlagMiddleware = require("./middlewares/featureFlagMiddleware");
//
// // Apply to specific routes or globally:
// app.use("/dashboard", featureFlagMiddleware({
//   flags: ["dark_mode", "beta_feature"],
//   getUserId: (req) => req.headers["x-user-id"],
// }));
//
// // Then in your route handler, access evaluated flags:
// app.get("/dashboard", (req, res) => {
//   res.json({
//     darkMode: req.featureFlags.dark_mode,    // true or false
//     betaFeature: req.featureFlags.beta_feature // true or false
//   });
// });
// ─────────────────────────────────────────────────────────────────

// Start server
app.listen(PORT, () => {
  console.log(`Feature Flag Service running on http://localhost:${PORT}`);
});
