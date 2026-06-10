const AnonymousRoom = require("../models/anonymousRoomModel");
const RoomParticipant = require("../models/roomParticipantModel");
const Message = require("../models/messageModel");
const config = require("../config/anonymousRoomConfig");
const cron = require("node-cron");

const EXPIRATION_CHECK_INTERVAL = 60 * 1000;
const PURGE_CHECK_INTERVAL_CRON = process.env.PURGE_CHECK_INTERVAL_CRON || "0 */30 * * * *";

const WARNING_TIME_MS = config.getRoomWarningMs();
const DELETION_BUFFER_HOURS = process.env.DELETION_BUFFER_HOURS ? parseFloat(process.env.DELETION_BUFFER_HOURS) : 0.5;

const getDeletionCutoff = () => {
  const expirationHours = config.getRoomExpirationHours();
  const bufferMs = DELETION_BUFFER_HOURS * 60 * 60 * 1000;
  return new Date(Date.now() - (expirationHours * 60 * 60 * 1000 + bufferMs));
};

const closeExpiredRooms = async (io = null) => {
  try {
    const now = new Date();

    const warningRooms = await AnonymousRoom.find({
      status: "active",
      expiresAt: {
        $lte: new Date(now.getTime() + WARNING_TIME_MS),
        $gt: now,
      },
    });

    for (const room of warningRooms) {
      if (io) {
        try {
          const participants = await RoomParticipant.find({
            room: room._id,
            isActive: true,
          }).populate("user", "_id");

          for (const participant of participants) {
            if (participant.user && participant.user._id) {
              io.to(participant.user._id.toString()).emit("room-expiration-warning", {
                roomId: room._id.toString(),
                roomType: room.roomType,
                message: "Room expires in 5 minutes",
                expiresAt: room.expiresAt,
              });
            }
          }
        } catch (err) {
          console.error(`Failed to send expiration warning for room ${room._id}:`, err.message);
        }
      }
    }

    const expiredRooms = await AnonymousRoom.find({
      status: "active",
      expiresAt: { $lte: now },
    });

    for (const room of expiredRooms) {
      try {
        await RoomParticipant.updateMany(
          { room: room._id, isActive: true },
          { isActive: false, leftAt: now }
        );

        await AnonymousRoom.findByIdAndUpdate(room._id, {
          status: "expired",
          participantCount: 0,
        });

        if (io) {
          const participants = await RoomParticipant.find({
            room: room._id,
          }).populate("user", "_id");

          const notifications = participants
            .filter(p => p.user && p.user._id)
            .map(p => ({
              userId: p.user._id.toString(),
              payload: {
                roomId: room._id.toString(),
                roomType: room.roomType,
                message: "Chat room has expired",
              }
            }));

          notifications.forEach(({ userId, payload }) => {
            try {
              io.to(userId).emit("room-expired", payload);
            } catch (emitErr) {
              console.error(`Failed to notify user ${userId} about room expiration:`, emitErr.message);
            }
          });
        }
      } catch (err) {
        console.error(`Failed to expire room ${room._id}:`, err.message);
      }
    }

    if (expiredRooms.length > 0) {
      console.log(`Expired ${expiredRooms.length} rooms`);
    }
  } catch (error) {
    console.error("Error during room expiration check:", error);
  }
};

const getRoomOnlineCount = async (roomId) => {
  try {
    const count = await RoomParticipant.countDocuments({
      room: roomId,
      isActive: true,
    });
    return count;
  } catch (error) {
    console.error(`Failed to get online count for room ${roomId}:`, error.message);
    return 0;
  }
};

const startExpirationJob = (io) => {
  closeExpiredRooms(io);
  setInterval(() => closeExpiredRooms(io), EXPIRATION_CHECK_INTERVAL);
};

const STALE_QUEUE_THRESHOLD_MS = config.queue.staleThresholdMinutes * 60 * 1000;

const cleanupStaleQueueEntries = (queue, userIdToSocketId, userActiveRooms) => {
  try {
    const staleThreshold = Date.now() - STALE_QUEUE_THRESHOLD_MS;
    const staleEntries = [];

    for (const [index, entry] of queue.entries()) {
      if (entry.timestamp.getTime() < staleThreshold) {
        staleEntries.push({ index, userId: entry.userId });
      }
    }

    staleEntries.reverse().forEach(({ index, userId }) => {
      queue.splice(index, 1);
      if (userActiveRooms) {
        userActiveRooms.delete(userId.toString());
      }
    });

    return staleEntries.length;
  } catch (error) {
    console.error("Error cleaning stale queue entries:", error.message);
    return 0;
  }
};

const getQueueStats = (queue) => ({
  totalWaiting: queue.length,
  oldestEntry: queue.length > 0 ? queue[0].timestamp : null,
  averageWaitTime: queue.length > 0 
    ? (Date.now() - queue.reduce((sum, e) => sum + e.timestamp.getTime(), 0) / queue.length)
    : 0,
});

const purgeExpiredRooms = async (io = null) => {
  try {
    const cutoff = getDeletionCutoff();
    const now = new Date();

    const roomsToDelete = await AnonymousRoom.find({
      status: { $in: ["expired", "inactive"] },
      createdAt: { $lt: cutoff },
    }).select("_id");

    const roomIds = roomsToDelete.map(r => r._id);

    if (roomIds.length === 0) {
      return { deletedRooms: 0, deletedParticipants: 0, deletedMessages: 0 };
    }

    let deletedParticipants = 0;
    let deletedMessages = 0;

    if (io) {
      for (const roomId of roomIds) {
        try {
          const participants = await RoomParticipant.find({ room: roomId }).populate("user", "_id");
          for (const p of participants) {
            if (p.user && p.user._id) {
              try {
                io.to(p.user._id.toString()).emit("room-deleted", {
                  roomId: roomId.toString(),
                  message: "Chat room has been deleted",
                });
              } catch (emitErr) {
                console.error(`Failed to notify user ${p.user._id} about room deletion:`, emitErr.message);
              }
            }
          }
        } catch (notifyErr) {
          console.error(`Error notifying participants for room ${roomId}:`, notifyErr.message);
        }
      }
    }

    try {
      const participantResult = await RoomParticipant.deleteMany({ room: { $in: roomIds } });
      deletedParticipants = participantResult.deletedCount;
    } catch (err) {
      console.error("Error deleting participants:", err.message);
    }

    try {
      const messageResult = await Message.deleteMany({ room: { $in: roomIds } });
      deletedMessages = messageResult.deletedCount;
    } catch (err) {
      console.error("Error deleting messages:", err.message);
    }

    try {
      const roomResult = await AnonymousRoom.deleteMany({ _id: { $in: roomIds } });
      console.log(`Purged ${roomResult.deletedCount} expired rooms, ${deletedParticipants} participants, ${deletedMessages} messages`);
      return { deletedRooms: roomResult.deletedCount, deletedParticipants, deletedMessages };
    } catch (err) {
      console.error("Error deleting rooms:", err.message);
      return { deletedRooms: 0, deletedParticipants, deletedMessages };
    }
  } catch (error) {
    console.error("Error during expired rooms purge:", error);
    return { deletedRooms: 0, deletedParticipants: 0, deletedMessages: 0 };
  }
};

const startPurgeJob = (io) => {
  purgeExpiredRooms(io);
  const cronJob = cron.schedule(PURGE_CHECK_INTERVAL_CRON, () => purgeExpiredRooms(io));
  console.log(`Room purge cron job started with schedule: ${PURGE_CHECK_INTERVAL_CRON}`);
  return cronJob;
};

module.exports = {
  closeExpiredRooms,
  startExpirationJob,
  getRoomOnlineCount,
  EXPIRATION_CHECK_INTERVAL,
  cleanupStaleQueueEntries,
  getQueueStats,
  STALE_QUEUE_THRESHOLD_MS,
  purgeExpiredRooms,
  startPurgeJob,
  PURGE_CHECK_INTERVAL_CRON,
  DELETION_BUFFER_HOURS,
};