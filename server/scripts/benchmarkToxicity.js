process.env.HUGGINGFACE_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN || 'mock_token';
process.env.TOXICITY_CACHE_ENABLED = process.env.TOXICITY_CACHE_ENABLED || 'true';
process.env.TOXICITY_RATE_LIMIT_MAX = process.env.TOXICITY_RATE_LIMIT_MAX || '100000';

const axios = require('axios');
const {
  checkToxicity,
  getCacheStats,
  getApiMetrics,
  clearCache,
} = require('../utils/toxicityChecker');

const UNIQUE_MESSAGES = [
  'Hello, how are you?',
  'This is a great app!',
  'Thank you for your help',
  'Bonjour, comment ça va ?',
  'Gracias por tu ayuda',
  'You are an idiot',
  'I hate you',
  'Go kill yourself',
  'Je te hais',
  'Special chars 👋😊 #chat <>&',
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function mockHuggingFaceResponse(message) {
  const normalized = message.toLowerCase();
  const toxicLabels = [];

  if (normalized.includes('idiot')) toxicLabels.push('insult');
  if (normalized.includes('hate') || normalized.includes('hais')) toxicLabels.push('toxic');
  if (normalized.includes('kill')) toxicLabels.push('threat');

  if (toxicLabels.length > 0) {
    return [toxicLabels.map((label) => ({ label, score: 0.99 }))];
  }

  return [[
    { label: 'toxic', score: 0.01 },
    { label: 'severe_toxic', score: 0.01 },
    { label: 'obscene', score: 0.01 },
    { label: 'threat', score: 0.01 },
    { label: 'insult', score: 0.01 },
    { label: 'identity_hate', score: 0.01 },
  ]];
}

async function run() {
  const apiCalls = [];
  const originalPost = axios.post;

  axios.post = async (_url, payload) => {
    apiCalls.push({ message: payload.inputs, at: Date.now() });
    await delay(25);
    return { data: mockHuggingFaceResponse(payload.inputs) };
  };

  try {
    clearCache();

    const warmStart = Date.now();
    await Promise.all(UNIQUE_MESSAGES.map((message) => checkToxicity(message)));
    const warmElapsed = Date.now() - warmStart;
    const apiCallCountAfterWarmup = apiCalls.length;
    const averageApiCallTime = warmElapsed / Math.max(UNIQUE_MESSAGES.length, 1);

    const concurrentMessages = Array.from({ length: 50 }, (_unused, index) => UNIQUE_MESSAGES[index % UNIQUE_MESSAGES.length]);
    const concurrentStart = Date.now();
    const results = await Promise.all(concurrentMessages.map((message) => checkToxicity(message)));
    const concurrentElapsed = Date.now() - concurrentStart;
    const averageCachedCheckTime = concurrentElapsed / concurrentMessages.length;
    const cacheStats = getCacheStats();
    const apiMetrics = getApiMetrics();
    const apiCallsAfterConcurrent = apiCalls.length;
    const rateLimitErrors = results.filter((result) => result.errorType === 'rate_limit').length;
    const apiErrors = results.filter((result) => result.errorType && result.errorType !== 'rate_limit').length;
    const raceConditionDetected = apiCallsAfterConcurrent !== apiCallCountAfterWarmup;

    const summary = {
      concurrentMessages: concurrentMessages.length,
      uniqueMessages: UNIQUE_MESSAGES.length,
      averageCachedCheckTimeMs: Number(averageCachedCheckTime.toFixed(2)),
      averageApiCallTimeMs: Number(averageApiCallTime.toFixed(2)),
      cacheHitRate: cacheStats.hitRate,
      cacheHits: cacheStats.hits,
      cacheMisses: cacheStats.misses,
      apiCalls: apiCallsAfterConcurrent,
      rateLimitErrors,
      apiErrors,
      raceConditionDetected,
      rateLimitQueueLength: apiMetrics.rateLimitQueueLength,
      targets: {
        cachedCheckUnderMs: 2000,
        apiCallUnderMs: 5000,
        cacheHitRateOverPercent: 50,
      },
      passed:
        averageCachedCheckTime < 2000 &&
        averageApiCallTime < 5000 &&
        cacheStats.hitRate > 50 &&
        apiCallsAfterConcurrent === UNIQUE_MESSAGES.length &&
        rateLimitErrors === 0 &&
        apiErrors === 0 &&
        !raceConditionDetected,
    };

    console.log(JSON.stringify(summary, null, 2));

    if (!summary.passed) {
      process.exitCode = 1;
    }
  } finally {
    axios.post = originalPost;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
