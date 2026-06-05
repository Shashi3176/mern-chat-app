const asyncHandler = require("express-async-handler");
const AnonymousRoom = require("../models/anonymousRoomModel");
const RoomParticipant = require("../models/roomParticipantModel");

const randomChatQueue = [];
const socketIdToUserId = new Map();
const userIdToSocketId = new Map();

const createRandomChatRoom = async (user1Id, user2Id) => {
  const room = await AnonymousRoom.create({
    roomType: "direct",
    status: "active",
    createdBy: user1Id,
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

    const room = await createRandomChatRoom(userId, waitingUser.userId);

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

module.exports = {
  requestRandomChat,
  cancelRandomChat,
  getRandomChatStatus,
  registerSocket,
  unregisterSocket,
};