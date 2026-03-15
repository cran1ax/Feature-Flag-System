const express = require("express");
const router = express.Router();
const controller = require("../controllers/featureFlagController");

router.get("/evaluate", controller.evaluateFlag);
router.post("/", controller.createFlag);
router.get("/", controller.getAllFlags);
router.get("/:name", controller.getFlagByName);
router.put("/:name", controller.updateFlag);
router.delete("/:name", controller.deleteFlag);

module.exports = router;
