const express = require('express');
const { adminAuth } = require('../middleware/adminMiddleware');
const { checkToxicity, getCacheStats, checkHealth, checkToxicityDetailed } = require('../utils/toxicityChecker');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const health = await checkHealth();
    const cacheStats = getCacheStats();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({
      status: health.status,
      model: process.env.TOXICITY_MODEL || 'unitary/toxic-bert',
      responseTime: health.responseTime,
      cacheEnabled: process.env.TOXICITY_CACHE_ENABLED !== 'false',
      cacheStats: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
      },
      ...(health.error && { error: health.error }),
    });
  } catch (error) {
    res.status(503).json({
      status: 'down',
      error: error.message,
    });
  }
});

router.post('/test-toxicity', adminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await checkToxicityDetailed(message);
    res.json(result);
  } catch (error) {
    console.error(`[ToxicityRoutes] Error in test-toxicity endpoint: ${error.message}`);
    res.status(500).json({ error: 'Failed to check toxicity', message: error.message });
  }
});

module.exports = router;
