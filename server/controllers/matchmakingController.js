const asyncHandler = require("express-async-handler");
const AnonymousRoom = require("../models/anonymousRoomModel");
const RoomParticipant = require("../models/roomParticipantModel");
const { calculateExpiration } = require("../utils/roomExpiration");

const randomChatQueue = [];
const socketIdToUserId = new Map();
const userIdToSocketId = new Map();
const recentlyLeftRooms = new Map();

const createRandomChatRoom = async (user1Id, user2Id) => {
  const room = await AnonymousRoom.create({
    roomType: "direct",
    status: "active",
    createdBy: user1Id,
    expiresAt: calculateExpiration(),
  });

  await RoomParticipant.create([
    {
      room: room._id,
      user: user1Id,
      role: "member",
      isActive: true,
    },
    {
      room: room._id,
      user: user2Id,
      role: "member",
      isActive: true,
    },
  ]);

  await AnonymousRoom.findByIdAndUpdate(room._id, { $inc: { participantCount: 2 } });

  return room;
};

const requestRandomChat = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const existingActiveRandomRoom = await RoomParticipant.findOne({
    user: userId,
    isActive: true,
  }).populate({
    path: "room",
    match: { roomType: "direct" },
  });

  if (existingActiveRandomRoom && existingActiveRandomRoom.room) {
    return res.json({
      message: "You already have an active random chat",
      roomId: existingActiveRandomRoom.room._id,
    });
  }

  const waitingIndex = randomChatQueue.findIndex(
    (item) => item.userId.toString() === userId.toString()
  );
  if (waitingIndex !== -1) {
    return res.json({
      message: "Already in queue, waiting for match...",
    });
  }

  const io = req.app.get("io");

  if (randomChatQueue.length > 0) {
    const waitingUser = randomChatQueue.shift();

    if (waitingUser.userId.toString() === userId.toString()) {
      randomChatQueue.unshift(waitingUser);
      return res.json({
        message: "Waiting for a match...",
      });
    }

    const recentlyLeftKey = `${userId.toString()}-${waitingUser.userId.toString()}`;
    const recentlyLeftReverse = `${waitingUser.userId.toString()}-${userId.toString()}`;

    if (
      recentlyLeftRooms.has(recentlyLeftKey) ||
      recentlyLeftRooms.has(recentlyLeftReverse)
    ) {
      randomChatQueue.push(waitingUser);
      const currentUserSocketId = userIdToSocketId.get(userId.toString());
      randomChatQueue.push({
        userId: userId,
        socketId: currentUserSocketId || null,
        timestamp: new Date(),
      });
      return res.json({
        message: "Added to queue (skipping recent partner)",
      });
    }

    const room = await createRandomChatRoom(userId, waitingUser.userId);

    recentlyLeftRooms.set(
      `${userId.toString()}-${waitingUser.userId.toString()}`,
      Date.now()
    );
    setTimeout(
      () => recentlyLeftRooms.delete(`${userId.toString()}-${waitingUser.userId.toString()}`),
      300000
    );

    const waitingUserSocketId = waitingUser.socketId;
    const currentUserSocketId = userIdToSocketId.get(userId.toString());

    if (waitingUserSocketId && io) {
      io.to(waitingUserSocketId).emit("random-chat-matched", {
        roomId: room._id.toString(),
        message: "Matched with a stranger!",
      });
    }

    if (currentUserSocketId && io) {
      io.to(currentUserSocketId).emit("random-chat-matched", {
        roomId: room._id.toString(),
        message: "Matched with a stranger!",
      });
    }

    return res.json({
      roomId: room._id,
      message: "Matched with a stranger!",
    });
  }

  const socketId = userIdToSocketId.get(userId.toString());
  randomChatQueue.push({
    userId: userId,
    socketId: socketId || null,
    timestamp: new Date(),
  });

  res.json({
    message: "Added to queue, waiting for match...",
  });
});

const cancelRandomChat = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const index = randomChatQueue.findIndex(
    (item) => item.userId.toString() === userId.toString()
  );

  if (index !== -1) {
    const removed = randomChatQueue.splice(index, 1)[0];

    const io = req.app.get("io");
    if (removed.socketId && io) {
      io.to(removed.socketId).emit("random-chat-cancelled", {
        message: "Removed from matchmaking queue",
      });
    }

    return res.json({ message: "Removed from queue" });
  }

  res.json({ message: "Not in queue" });
});

const getRandomChatStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const inQueue = randomChatQueue.some(
    (item) => item.userId.toString() === userId.toString()
  );

  if (inQueue) {
    return res.json({ status: "waiting", position: randomChatQueue.length });
  }

  const activeRandomRoom = await RoomParticipant.findOne({
    user: userId,
    isActive: true,
  }).populate({
    path: "room",
    match: { roomType: "direct" },
  });

  if (activeRandomRoom && activeRandomRoom.room) {
    return res.json({
      status: "matched",
      roomId: activeRandomRoom.room._id,
    });
  }

  res.json({ status: "available" });
});

const registerSocket = (socketId, userId) => {
  socketIdToUserId.set(socketId, userId);
  userIdToSocketId.set(userId.toString(), socketId);
};

const unregisterSocket = (socketId, userId) => {
  socketIdToUserId.delete(socketId);
  if (userId) {
    userIdToSocketId.delete(userId.toString());
  }
};

const nextRandomChat = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const io = req.app.get("io");

  const currentRoom = await RoomParticipant.findOne({
    user: userId,
    isActive: true,
  }).populate({
    path: "room",
    match: { roomType: "direct" },
  });

  if (!currentRoom || !currentRoom.room) {
    const waitingIndex = randomChatQueue.findIndex(
      (item) => item.userId.toString() === userId.toString()
    );
    if (waitingIndex === -1) {
      const currentUserSocketId = userIdToSocketId.get(userId.toString());
      randomChatQueue.push({
        userId: userId,
        socketId: currentUserSocketId || null,
        timestamp: new Date(),
      });

      if (io && currentUserSocketId) {
        io.to(currentUserSocketId).emit("random-chat-queued", {
          message: "Looking for a new partner...",
        });
      }

      return res.json({
        message: "No active random chat, joined queue for new partner",
      });
    }

    return res.json({
      message: "Already in queue waiting for a partner",
    });
  }

  const roomId = currentRoom.room._id;

  const otherParticipants = await RoomParticipant.find({
    room: roomId,
    user: { $ne: userId },
    isActive: true,
  });

  for (const participant of otherParticipants) {
    recentlyLeftRooms.set(
      `${userId.toString()}-${participant.user._id.toString()}`,
      Date.now()
    );
    setTimeout(
      () =>
        recentlyLeftRooms.delete(
          `${userId.toString()}-${participant.user._id.toString()}`
        ),
      300000
    );
  }

  await RoomParticipant.updateMany(
    { room: roomId },
    { isActive: false, leftAt: new Date() }
  );

  await AnonymousRoom.findByIdAndUpdate(roomId, {
    status: "inactive",
    participantCount: 0,
  });

  for (const participant of otherParticipants) {
    const otherSocketId = userIdToSocketId.get(participant.user._id.toString());
    if (otherSocketId && io) {
      io.to(otherSocketId).emit("random-chat-partner-left", {
        roomId: roomId.toString(),
        message: "Your partner left the chat",
      });
    }
  }

  const waitingIndex = randomChatQueue.findIndex(
    (item) => item.userId.toString() === userId.toString()
  );
  if (waitingIndex === -1) {
    const currentUserSocketId = userIdToSocketId.get(userId.toString());
    randomChatQueue.push({
      userId: userId,
      socketId: currentUserSocketId || null,
      timestamp: new Date(),
    });

    if (io && currentUserSocketId) {
      io.to(currentUserSocketId).emit("random-chat-queued", {
        message: "Looking for a new partner...",
      });
    }
  }

  res.json({
    message: "Left current chat and joined queue for a new partner",
    previousRoomId: roomId,
  });
});

module.exports = {
  requestRandomChat,
  cancelRandomChat,
  getRandomChatStatus,
  registerSocket,
  unregisterSocket,
  nextRandomChat,
};