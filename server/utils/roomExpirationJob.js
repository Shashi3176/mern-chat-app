const AnonymousRoom = require("../models/anonymousRoomModel");
const RoomParticipant = require("../models/roomParticipantModel");

const EXPIRATION_CHECK_INTERVAL = 60 * 1000;

const WARNING_TIME_MS = 5 * 60 * 1000;

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
      }
    }

    const expiredRooms = await AnonymousRoom.find({
      status: "active",
      expiresAt: { $lte: now },
    });

    for (const room of expiredRooms) {
      await RoomParticipant.updateMany(
        { room: room._id, isActive: true },
        { isActive: false, leftAt: now }
      );

      await AnonymousRoom.findByIdAndUpdate(room._id, {
        status: "inactive",
        participantCount: 0,
      });

      if (io) {
        const participants = await RoomParticipant.find({
          room: room._id,
        }).populate("user", "_id");

        for (const participant of participants) {
          if (participant.user && participant.user._id) {
            io.to(participant.user._id.toString()).emit("room-expired", {
              roomId: room._id.toString(),
              roomType: room.roomType,
              message: "Chat room has expired",
            });
          }
        }
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
  const count = await RoomParticipant.countDocuments({
    room: roomId,
    isActive: true,
  });
  return count;
};

const startExpirationJob = (io) => {
  closeExpiredRooms(io);
  setInterval(() => closeExpiredRooms(io), EXPIRATION_CHECK_INTERVAL);
};

module.exports = {
  closeExpiredRooms,
  startExpirationJob,
  getRoomOnlineCount,
  EXPIRATION_CHECK_INTERVAL,
};