const axios = require('axios');
const crypto = require('crypto');
const NodeCache = require('node-cache');
const { config, reloadWhitelist } = require('../config/toxicity.config');

const API_URL = `https://api-inference.huggingface.co/models/${config.model}`;
const REQUEST_TIMEOUT = 30000;
const MAX_RETRIES_503 = 2;
const MAX_RETRIES_NETWORK = 1;
const RETRY_DELAY_503_BASE = 10000;
const RETRY_DELAY_NETWORK = 2000;

const cache = new NodeCache({
  stdTTL: config.cacheTTL,
  maxKeys: config.cacheMaxSize,
  checkperiod: config.cacheTTL * 0.2,
  useClones: false,
});

let cacheHits = 0;
let cacheMisses = 0;
let totalRequests = 0;
let failedRequests = 0;
let consecutiveFailures = 0;
let lastFailureTime = null;

const circuitState = {
  state: 'closed',
  openedAt: null,
  lastAttempt: null,
};

const requestTimestamps = [];
const rateLimitQueue = [];
let isProcessingQueue = false;

if (config.cacheEnabled) {
  console.log(`[ToxicityChecker] Cache enabled with TTL: ${config.cacheTTL}s, max size: ${config.cacheMaxSize}`);
}

console.log(`[ToxicityChecker] Circuit breaker: threshold=${config.circuitBreakerThreshold}, timeout=${config.circuitBreakerTimeout}ms`);
console.log(`[ToxicityChecker] Local rate limit: ${config.localRateLimitMax}/${config.localRateLimitWindow}ms`);

function createCacheKey(messageText) {
  const normalized = messageText.trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function getRetryAfterMs(error) {
  const retryAfterHeader = error.response?.headers?.['retry-after'];
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }
  return null;
}

function categorizeError(error) {
  const status = error.response?.status;
  const code = error.code;

  if (status === 429) {
    return { type: 'rate_limit', retryable: false, userMessage: 'Service is busy. Please wait a moment and try again.' };
  }
  if (status === 503) {
    return { type: 'model_loading', retryable: true, userMessage: 'Service is starting up. Please try again in a few seconds.' };
  }
  if (status === 401) {
    return { type: 'auth', retryable: false, userMessage: 'Service configuration error. Please contact support.' };
  }
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
    return { type: 'network', retryable: true, userMessage: 'Connection issue. Please check your internet and try again.' };
  }
  if (!status && error.request) {
    return { type: 'network', retryable: true, userMessage: 'Connection issue. Please check your internet and try again.' };
  }
  return { type: 'unknown', retryable: false, userMessage: 'Unable to verify message. Please try again later.' };
}

function recordFailure() {
  failedRequests++;
  consecutiveFailures++;
  lastFailureTime = Date.now();

  const total = totalRequests;
  if (total > 0) {
    const errorRate = failedRequests / total;
    if (errorRate > config.errorRateThreshold && total >= 20) {
      console.warn(`[ToxicityChecker] High error rate detected: ${(errorRate * 100).toFixed(1)}% (${failedRequests}/${total} requests)`);
    }
  }

  if (consecutiveFailures >= config.circuitBreakerThreshold && circuitState.state === 'closed') {
    console.error(`[ToxicityChecker] Circuit breaker OPENED after ${consecutiveFailures} consecutive failures`);
    circuitState.state = 'open';
    circuitState.openedAt = Date.now();
  }
}

function recordSuccess() {
  consecutiveFailures = 0;

  if (circuitState.state === 'half-open') {
    console.log('[ToxicityChecker] Circuit breaker CLOSED - service recovered');
    circuitState.state = 'closed';
    circuitState.openedAt = null;
  }
}

function isCircuitOpen() {
  if (circuitState.state !== 'open') {
    return false;
  }

  const elapsed = Date.now() - circuitState.openedAt;
  if (elapsed >= config.circuitBreakerTimeout) {
    console.log('[ToxicityChecker] Circuit breaker transitioning to HALF-OPEN');
    circuitState.state = 'half-open';
    circuitState.lastAttempt = null;
    return false;
  }

  return true;
}

function checkLocalRateLimit() {
  const now = Date.now();
  const windowStart = now - config.localRateLimitWindow;

  while (requestTimestamps.length > 0 && requestTimestamps[0] < windowStart) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= config.localRateLimitMax) {
    return true;
  }

  requestTimestamps.push(now);
  return false;
}

async function processRateLimitQueue() {
  if (isProcessingQueue) {
    return;
  }

  isProcessingQueue = true;

  while (rateLimitQueue.length > 0) {
    const isLimited = checkLocalRateLimit();
    if (isLimited) {
      const waitTime = config.localRateLimitWindow - (Date.now() - requestTimestamps[0]);
      console.log(`[ToxicityChecker] Rate limit queue: waiting ${Math.ceil(waitTime / 1000)}s before processing next`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      continue;
    }

    const { messageText, resolve, reject } = rateLimitQueue.shift();
    try {
      const result = await executeWithResilience(messageText);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }

  isProcessingQueue = false;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function makeApiRequest(messageText, retries = 0) {
  totalRequests++;

  const isLimited = checkLocalRateLimit();
  if (isLimited) {
    const error = new Error('Local rate limit exceeded');
    error.isRateLimit = true;
    error.retryAfter = Math.ceil(config.localRateLimitWindow / 1000);
    throw error;
  }

  try {
    const response = await axios.post(
      API_URL,
      { inputs: messageText },
      {
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json',
        },
        timeout: REQUEST_TIMEOUT,
      }
    );
    recordSuccess();
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const categorized = categorizeError(error);

    if (categorized.type === 'rate_limit') {
      const retryAfter = getRetryAfterMs(error);
      if (retryAfter) {
        console.warn(`[ToxicityChecker] Rate limited (429). Retry-After: ${retryAfter}ms`);
        await sleep(retryAfter);
        return makeApiRequest(messageText, retries);
      }
      console.warn(`[ToxicityChecker] Rate limited (429). No Retry-After header, waiting 60s`);
      await sleep(60000);
      return makeApiRequest(messageText, retries);
    }

    if (categorized.type === 'model_loading' && retries < MAX_RETRIES_503) {
      const delay = RETRY_DELAY_503_BASE * Math.pow(2, retries);
      console.log(`[ToxicityChecker] Model loading (503), retrying after ${delay / 1000}s (attempt ${retries + 1}/${MAX_RETRIES_503})`);
      await sleep(delay);
      return makeApiRequest(messageText, retries + 1);
    }

    if (categorized.type === 'network' && retries < MAX_RETRIES_NETWORK) {
      console.log(`[ToxicityChecker] Network error, retrying once after ${RETRY_DELAY_NETWORK / 1000}s`);
      await sleep(RETRY_DELAY_NETWORK);
      return makeApiRequest(messageText, retries + 1);
    }

    recordFailure();
    throw error;
  }
}

async function executeWithResilience(messageText) {
  if (isCircuitOpen()) {
    console.warn('[ToxicityChecker] Circuit is OPEN - skipping API call');
    const error = new Error('Circuit breaker open');
    error.isCircuitOpen = true;
    throw error;
  }

  if (circuitState.state === 'half-open') {
    console.log('[ToxicityChecker] Circuit is HALF-OPEN - allowing probe request');
    circuitState.lastAttempt = Date.now();
  }

  try {
    const apiResponse = await makeApiRequest(messageText);
    return processApiResponse(apiResponse, messageText);
  } catch (error) {
    if (circuitState.state === 'half-open' && !error.isRateLimit) {
      console.error('[ToxicityChecker] Probe request failed - reopening circuit');
      circuitState.state = 'open';
      circuitState.openedAt = Date.now();
      const reopenError = new Error('Circuit breaker reopened');
      reopenError.isCircuitOpen = true;
      throw reopenError;
    }
    throw error;
  }
}

function processApiResponse(apiResponse, originalMessage) {
  const predictions = Array.isArray(apiResponse)
    ? apiResponse[0]
    : Array.isArray(apiResponse?.predictions)
      ? apiResponse.predictions
      : [];

  if (!Array.isArray(predictions)) {
    throw new Error('Unexpected API response format');
  }

  const scores = {};
  predictions.forEach((item) => {
    if (item.label && typeof item.score === 'number') {
      scores[item.label] = item.score;
    }
  });

  const matchedCategories = Object.entries(scores)
    .filter(([label, score]) => score >= config.threshold)
    .map(([label]) => label);

  const toxicCategories = matchedCategories.filter((category) => config.categories.includes(category));
  const isToxic = toxicCategories.length > 0;
  const confidence = Math.max(...Object.values(scores), 0);

  console.log(`[ToxicityChecker] Checked message: "${originalMessage.substring(0, 50)}..." - Toxic: ${isToxic}, Categories: ${toxicCategories.join(', ') || 'none'}`);

  return {
    isToxic,
    categories: toxicCategories,
    scores,
    confidence,
  };
}

async function checkToxicity(messageText) {
  if (!config.apiToken) {
    console.error('[ToxicityChecker] HUGGINGFACE_API_TOKEN not configured');
    return {
      isToxic: config.failMode === 'closed',
      categories: [],
      scores: {},
      confidence: 0,
      errorType: 'config',
      userMessage: 'Service configuration error. Please contact support.',
    };
  }

  if (!messageText || typeof messageText !== 'string' || messageText.trim() === '') {
    return {
      isToxic: false,
      categories: [],
      scores: {},
      confidence: 0,
    };
  }

  const normalizedMessage = messageText.trim().toLowerCase();
  const whitelistMatch = config.whitelist.find((phrase) => normalizedMessage.includes(phrase));
  if (whitelistMatch) {
    console.log(`[ToxicityChecker] Message matched whitelist phrase "${whitelistMatch}", skipping API check`);
    return {
      isToxic: false,
      categories: [],
      scores: {},
      confidence: 0,
    };
  }

  if (config.cacheEnabled) {
    const cacheKey = createCacheKey(messageText);
    const cachedResult = cache.get(cacheKey);

    if (cachedResult) {
      cacheHits++;
      console.log(`[ToxicityChecker] Cache HIT for key: ${cacheKey.substring(0, 16)}...`);
      return cachedResult;
    }
    cacheMisses++;
  }

  try {
    const result = await executeWithResilience(messageText);

    if (config.cacheEnabled) {
      const cacheKey = createCacheKey(messageText);
      cache.set(cacheKey, result);
      console.log(`[ToxicityChecker] Cache MISS - stored result for key: ${cacheKey.substring(0, 16)}...`);
    }

    return result;
  } catch (error) {
    console.error(`[ToxicityChecker] Error checking toxicity: ${error.message}`);
    const categorized = categorizeError(error);
    const circuitOpen = error.isCircuitOpen || isCircuitOpen();

    let isToxic = false;
    if (circuitOpen || categorized.type === 'auth') {
      isToxic = config.failMode === 'closed';
    }

    return {
      isToxic,
      categories: [],
      scores: {},
      confidence: 0,
      errorType: categorized.type,
      userMessage: categorized.userMessage,
      isCircuitOpen,
    };
  }
}

function getCacheStats() {
  const total = cacheHits + cacheMisses;
  const hitRate = total > 0 ? (cacheHits / total) * 100 : 0;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: parseFloat(hitRate.toFixed(2)),
    keys: cache.getStats().keys,
  };
}

function getApiMetrics() {
  const total = totalRequests;
  const errorRate = total > 0 ? failedRequests / total : 0;
  return {
    totalRequests: total,
    failedRequests,
    consecutiveFailures,
    errorRate: parseFloat((errorRate * 100).toFixed(2)),
    circuitState: circuitState.state,
    circuitOpenedAt: circuitState.openedAt ? new Date(circuitState.openedAt).toISOString() : null,
    rateLimitQueueLength: rateLimitQueue.length,
  };
}

function clearCache() {
  cache.flushAll();
  cacheHits = 0;
  cacheMisses = 0;
  console.log('[ToxicityChecker] Cache cleared');
}

function removeCacheEntry(messageText) {
  const cacheKey = createCacheKey(messageText);
  const removed = cache.del(cacheKey);
  if (removed) {
    console.log(`[ToxicityChecker] Removed cache entry for key: ${cacheKey.substring(0, 16)}...`);
  }
}

function getCacheTTL() {
  return config.cacheTTL;
}

function resetCircuitBreaker() {
  console.log('[ToxicityChecker] Circuit breaker manually reset');
  circuitState.state = 'closed';
  circuitState.openedAt = null;
  consecutiveFailures = 0;
  lastFailureTime = null;
}

module.exports = {
  checkToxicity,
  getCacheStats,
  getApiMetrics,
  clearCache,
  removeCacheEntry,
  getCacheTTL: () => config.cacheTTL,
  getConfig: () => config,
  reloadWhitelist,
  resetCircuitBreaker,
  checkHealth: async () => {
    const start = Date.now();
    try {
      await makeApiRequest('Hello world');
      return {
        status: 'healthy',
        responseTime: `${Date.now() - start}ms`,
      };
    } catch (error) {
      const categorized = categorizeError(error);
      const statusLabel = categorized.type === 'model_loading' ? 'degraded' : 'down';
      return {
        status: statusLabel,
        responseTime: `${Date.now() - start}ms`,
        error: error.message,
        errorType: categorized.type,
      };
    }
  },
  checkToxicityDetailed: async (messageText) => {
    const result = await checkToxicity(messageText);
    return {
      message: messageText,
      isToxic: result.isToxic,
      categories: result.categories,
      scores: result.scores,
      threshold: config.threshold,
      wouldBlock: result.isToxic,
      confidence: result.confidence,
      errorType: result.errorType,
      userMessage: result.userMessage,
      isCircuitOpen: result.isCircuitOpen,
    };
  },
  categorizeError,
};
