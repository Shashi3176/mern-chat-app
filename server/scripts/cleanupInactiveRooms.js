const mongoose = require("mongoose");
const connectDB = require("../config/db");
const AnonymousRoom = require("../models/anonymousRoomModel");
const RoomParticipant = require("../models/roomParticipantModel");
const Message = require("../models/messageModel");
const config = require("../config/anonymousRoomConfig");

const CLEANUP_RETENTION_DAYS = config.cleanup.expiredRoomsRetentionDays;

const cleanupOldRooms = async () => {
  try {
    await connectDB();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_RETENTION_DAYS);
    
    console.log(`Cleaning up inactive rooms older than ${cutoffDate.toISOString()}`);
    
    // Get room IDs to delete
    const roomsToDelete = await AnonymousRoom.find({
      status: { $in: ["expired", "inactive"] },
      updatedAt: { $lt: cutoffDate },
    }).select("_id");
    
    const roomIds = roomsToDelete.map(r => r._id);
    
    if (roomIds.length === 0) {
      console.log("No rooms to clean up");
      process.exit(0);
    }
    
    // Delete participants
    const participantResult = await RoomParticipant.deleteMany({
      room: { $in: roomIds },
    });
    console.log(`Deleted ${participantResult.deletedCount} participant records`);
    
    // Delete messages
    const messageResult = await Message.deleteMany({
      room: { $in: roomIds },
    });
    console.log(`Deleted ${messageResult.deletedCount} message records`);
    
    // Delete rooms
    const roomResult = await AnonymousRoom.deleteMany({
      _id: { $in: roomIds },
    });
    console.log(`Deleted ${roomResult.deletedCount} rooms`);
    
    console.log("Cleanup completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
};

cleanupOldRooms();