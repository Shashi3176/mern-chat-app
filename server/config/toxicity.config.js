const fs = require('fs');
const path = require('path');

const WHITELIST_PATH = process.env.TOXICITY_WHITELIST_PATH
  ? path.resolve(process.env.TOXICITY_WHITELIST_PATH)
  : path.join(__dirname, 'toxicityWhitelist.json');

function parseWhitelistFromEnv() {
  const raw = process.env.TOXICITY_WHITELIST;
  if (!raw || raw.trim() === '') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('TOXICITY_WHITELIST must be a JSON array');
    }
    return parsed.filter((item) => typeof item === 'string');
  } catch (err) {
    console.warn(`[ToxicityConfig] Invalid TOXICITY_WHITELIST env value: ${err.message}`);
    return [];
  }
}

function loadWhitelistFile() {
  try {
    if (fs.existsSync(WHITELIST_PATH)) {
      const data = JSON.parse(fs.readFileSync(WHITELIST_PATH, 'utf8'));
      if (!Array.isArray(data)) {
        throw new Error('Whitelist file must contain a JSON array');
      }
      return data.filter((item) => typeof item === 'string');
    }
  } catch (err) {
    console.warn(`[ToxicityConfig] Failed to load whitelist from ${WHITELIST_PATH}: ${err.message}`);
  }
  return [];
}

let whitelist = [...loadWhitelistFile(), ...parseWhitelistFromEnv()];
whitelist = [...new Set(whitelist.map((item) => item.toLowerCase()))];

function reloadWhitelist() {
  const fileList = loadWhitelistFile();
  const envList = parseWhitelistFromEnv();
  whitelist = [...new Set([...fileList, ...envList].map((item) => item.toLowerCase()))];
}

const CATEGORIES = process.env.TOXICITY_CATEGORIES
  ? process.env.TOXICITY_CATEGORIES.split(',').map((cat) => cat.trim()).filter(Boolean)
  : ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate'];

const apiToken = process.env.HUGGINGFACE_API_TOKEN || null;
const model = process.env.TOXICITY_MODEL || 'unitary/toxic-bert';
const thresholdRaw = parseFloat(process.env.TOXICITY_THRESHOLD);
const threshold = Number.isNaN(thresholdRaw) ? 0.5 : thresholdRaw;
const failMode = process.env.TOXICITY_FAIL_MODE || 'open';
const cacheEnabled = process.env.TOXICITY_CACHE_ENABLED !== 'false';
const cacheTTL = parseInt(process.env.TOXICITY_CACHE_TTL, 10) || 3600;
const cacheMaxSize = parseInt(process.env.TOXICITY_CACHE_MAX_SIZE, 10) || 1000;

const circuitBreakerThreshold = parseInt(process.env.TOXICITY_CIRCUIT_BREAKER_THRESHOLD, 10) || 5;
const circuitBreakerTimeout = parseInt(process.env.TOXICITY_CIRCUIT_BREAKER_TIMEOUT, 10) || 300000;
const localRateLimitWindow = parseInt(process.env.TOXICITY_RATE_LIMIT_WINDOW, 10) || 60000;
const localRateLimitMax = parseInt(process.env.TOXICITY_RATE_LIMIT_MAX, 10) || 30;
const errorRateThreshold = parseFloat(process.env.TOXICITY_ERROR_RATE_THRESHOLD) || 0.1;

const config = {
  apiToken,
  model,
  threshold,
  failMode,
  cacheEnabled,
  cacheTTL,
  cacheMaxSize,
  categories: CATEGORIES,
  whitelist,
  whitelistPath: WHITELIST_PATH,
  circuitBreakerThreshold,
  circuitBreakerTimeout,
  localRateLimitWindow,
  localRateLimitMax,
  errorRateThreshold,
};

function validateConfig() {
  const errors = [];
  const warnings = [];

  if (!apiToken || apiToken.trim() === '') {
    warnings.push('HUGGINGFACE_API_TOKEN is not set. Toxicity checking will fail open.');
  }

  if (threshold < 0 || threshold > 1) {
    errors.push(`TOXICITY_THRESHOLD must be between 0 and 1. Current value: ${threshold}`);
  }

  if (!['open', 'closed'].includes(failMode)) {
    errors.push(`TOXICITY_FAIL_MODE must be "open" or "closed". Current value: ${failMode}`);
  }

  if (errors.length > 0) {
    throw new Error(`Toxicity configuration validation failed:\n${errors.join('\n')}`);
  }

  if (warnings.length > 0) {
    warnings.forEach((warning) => console.warn(`[ToxicityConfig] ${warning}`));
  }
}

function logConfig() {
  console.log('[ToxicityConfig] Configuration loaded:');
  console.log(`[ToxicityConfig]   Model: ${model}`);
  console.log(`[ToxicityConfig]   Threshold: ${threshold}`);
  console.log(`[ToxicityConfig]   Fail Mode: ${failMode}`);
  console.log(`[ToxicityConfig]   Cache Enabled: ${cacheEnabled}`);
  console.log(`[ToxicityConfig]   Cache TTL: ${cacheTTL}s`);
  console.log(`[ToxicityConfig]   Cache Max Size: ${cacheMaxSize}`);
  console.log(`[ToxicityConfig]   Categories: ${CATEGORIES.join(', ')}`);
  console.log(`[ToxicityConfig]   Whitelist entries: ${whitelist.length}`);
  console.log(`[ToxicityConfig]   API Token configured: ${!!apiToken}`);
  console.log(`[ToxicityConfig]   Circuit Breaker Threshold: ${circuitBreakerThreshold}`);
  console.log(`[ToxicityConfig]   Circuit Breaker Timeout: ${circuitBreakerTimeout}ms`);
  console.log(`[ToxicityConfig]   Local Rate Limit: ${localRateLimitMax}/${localRateLimitWindow}ms`);
  console.log(`[ToxicityConfig]   Error Rate Threshold: ${(errorRateThreshold * 100).toFixed(1)}%`);
}

logConfig();

module.exports = {
  config,
  validateConfig,
  reloadWhitelist,
  getWhitelist: () => [...whitelist],
  addToWhitelist: (phrase) => {
    const normalized = phrase.toLowerCase();
    if (!whitelist.includes(normalized)) {
      whitelist.push(normalized);
    }
  },
  removeFromWhitelist: (phrase) => {
    const normalized = phrase.toLowerCase();
    whitelist = whitelist.filter((item) => item !== normalized);
  },
};
