const dotenv = require("dotenv");

dotenv.config();

const config = {
  room: {
    expirationHours: parseInt(process.env.ROOM_EXPIRATION_HOURS) || 2,
    warningMinutes: parseInt(process.env.ROOM_WARNING_MINUTES) || 5,
    maxParticipants: parseInt(process.env.ROOM_MAX_PARTICIPANTS) || 50,
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    maxRequests: {
      anonymous: parseInt(process.env.RATE_LIMIT_ANONYMOUS) || 30,
      rooms: parseInt(process.env.RATE_LIMIT_ROOMS) || 60,
      messages: parseInt(process.env.RATE_LIMIT_MESSAGES) || 60,
      user: parseInt(process.env.RATE_LIMIT_USER) || 100,
    },
  },
  
  queue: {
    staleThresholdMinutes: parseInt(process.env.QUEUE_STALE_THRESHOLD_MINUTES) || 5,
    recentlyLeftCooldownMs: parseInt(process.env.RECENTLY_LEFT_COOLDOWN_MS) || 300000,
  },
  
  cleanup: {
    expiredRoomsRetentionDays: parseInt(process.env.EXPIRED_ROOMS_RETENTION_DAYS) || 30,
    cleanupIntervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES) || 1440,
  },
  
  logging: {
    enabled: process.env.LOGGING_ENABLED !== "false",
    level: process.env.LOG_LEVEL || "info",
  },
  
  security: {
    preventNameSpoofing: process.env.PREVENT_NAME_SPOOFING !== "false",
    strictRoomPrivacy: process.env.STRICT_ROOM_PRIVACY !== "false",
  },
};

config.getRoomExpirationHours = () => config.room.expirationHours;
config.getRoomWarningMs = () => config.room.warningMinutes * 60 * 1000;
config.getMaxParticipants = () => config.room.maxParticipants;

module.exports = config;