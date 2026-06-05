const config = require("../config/anonymousRoomConfig");

const rateLimitMap = new Map();

const rateLimit = (maxRequests = 60, windowMs = 60000) => {
  return (req, res, next) => {
    const key = req.user?._id?.toString() || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }
    
    const requests = rateLimitMap.get(key);
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please slow down.",
        timestamp: new Date().toISOString(),
        retryAfter: Math.ceil((windowStart - now + windowMs) / 1000),
      });
    }
    
    validRequests.push(now);
    rateLimitMap.set(key, validRequests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      for (const [k, v] of rateLimitMap.entries()) {
        rateLimitMap.set(k, v.filter(time => time > windowStart));
      }
    }
    
    next();
  };
};

const roomCreationRateLimit = rateLimit(20, 60000);
const messageRateLimit = rateLimit(30, 60000);
const matchmakingRateLimit = rateLimit(20, 60000);

const getRateLimitStats = () => {
  const totalKeys = rateLimitMap.size;
  let totalRequests = 0;
  
  for (const requests of rateLimitMap.values()) {
    totalRequests += requests.length;
  }
  
  return {
    totalTrackedUsers: totalKeys,
    totalPendingRequests: totalRequests,
  };
};

module.exports = {
  rateLimit,
  roomCreationRateLimit,
  messageRateLimit,
  matchmakingRateLimit,
  getRateLimitStats,
};