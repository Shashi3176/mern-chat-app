/**
 * Migration script to create toxicity_logs collection
 * Run with: node scripts/migrateToxicityLogs.js
 */

const mongoose = require("mongoose");
const ToxicityLog = require("../models/toxicityLogModel");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/chatapp";

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("[Migration] Connected to MongoDB");

    // Create indexes for efficient querying
    await ToxicityLog.createIndexes([
      { key: { userId: 1, createdAt: -1 } },
      { key: { roomId: 1, createdAt: -1 } },
      { key: { createdAt: -1 } },
    ]);

    console.log("[Migration] Created indexes for toxicity_logs collection");
    console.log("[Migration] Migration completed successfully");

    process.exit(0);
  } catch (error) {
    console.error("[Migration] Error:", error.message);
    process.exit(1);
  }
}

migrate();