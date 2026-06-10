const mongoose = require("mongoose");
const connectDB = require("../config/db");
const AnonymousRoom = require("../models/anonymousRoomModel");
const config = require("../config/anonymousRoomConfig");

const EXPIRATION_HOURS = config.getRoomExpirationHours();
const BUFFER_HOURS = 0.5;
const cutoff = new Date(Date.now() - (EXPIRATION_HOURS + BUFFER_HOURS) * 60 * 60 * 1000);

const migrateExpiredStatus = async () => {
  try {
    await connectDB();
    console.log("Connected to database");

    const result = await AnonymousRoom.updateMany(
      {
        status: "inactive",
        expiresAt: { $lte: cutoff },
      },
      { $set: { status: "expired" } }
    );

    console.log(`Migration complete: updated ${result.modifiedCount} rooms from "inactive" to "expired"`);
    console.log(`Cutoff time: ${cutoff.toISOString()}`);

    const activeExpired = await AnonymousRoom.countDocuments({
      status: "active",
      expiresAt: { $lte: new Date() },
    });
    console.log(`Rooms currently active but expired (will be handled by expiration job): ${activeExpired}`);

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrateExpiredStatus();
