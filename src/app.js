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

// Start server
app.listen(PORT, () => {
  console.log(`Feature Flag Service running on http://localhost:${PORT}`);
});
