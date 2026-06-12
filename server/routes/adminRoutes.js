const express = require("express");
const { adminAuth } = require("../middleware/adminMiddleware");
const { getToxicityLogs, getToxicityStats, getToxicityCharts } = require("../controllers/adminControllers");
const { checkToxicity, checkToxicityDetailed } = require("../utils/toxicityChecker");

const router = express.Router();

router.get("/toxicity-logs", adminAuth, getToxicityLogs);
router.get("/toxicity-stats", adminAuth, getToxicityStats);
router.get("/toxicity-charts", adminAuth, getToxicityCharts);

router.post("/test-toxicity", adminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await checkToxicityDetailed(message);
    res.json(result);
  } catch (error) {
    console.error(`[AdminRoutes] Error in test-toxicity endpoint: ${error.message}`);
    res.status(500).json({ error: 'Failed to check toxicity', message: error.message });
  }
});

module.exports = router;