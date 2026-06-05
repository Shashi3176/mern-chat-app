const mongoose = require("mongoose");
const connectDB = require("../config/db");
const AnonymousRoom = require("../models/anonymousRoomModel");
const RoomParticipant = require("../models/roomParticipantModel");

const setupAnonymousRoomIndices = async () => {
  try {
    await connectDB();

    console.log("Creating indexes for AnonymousRoom collection...");
    await AnonymousRoom.syncIndexes();
    console.log("AnonymousRoom indexes created successfully.");

    console.log("Creating indexes for RoomParticipant collection...");
    await RoomParticipant.syncIndexes();
    console.log("RoomParticipant indexes created successfully.");

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  }
};

setupAnonymousRoomIndices();