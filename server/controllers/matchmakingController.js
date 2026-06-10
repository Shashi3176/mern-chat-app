const asyncHandler = require("express-async-handler");
const AnonymousRoom = require("../models/anonymousRoomModel");
const RoomParticipant = require("../models/roomParticipantModel");
const { calculateExpiration } = require("../utils/roomExpiration");

const randomChatQueue = [];
const socketIdToUserId = new Map();
const userIdToSocketId = new Map();
const recentlyLeftRooms = new Map();
const userActiveRooms = new Map();

const createRandomChatRoom = async (user1Id, user2Id, io = null, socket1Id = null, socket2Id = null) => {
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

  userActiveRooms.set(user1Id.toString(), room._id.toString());
  userActiveRooms.set(user2Id.toString(), room._id.toString());

  return room;
};

const cleanupStaleQueueEntriesLocal = () => {
  const staleThreshold = Date.now() - 5 * 60 * 1000;
  for (let i = randomChatQueue.length - 1; i >= 0; i--) {
    const entry = randomChatQueue[i];
    if (entry.timestamp.getTime() < staleThreshold) {
      const staleUserId = entry.userId;
      randomChatQueue.splice(i, 1);
      userActiveRooms.delete(staleUserId.toString());
    }
  }
};

const requestRandomChat = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const io = req.app.get("io");

  cleanupStaleQueueEntriesLocal();

  const existingActiveRandomRoom = await RoomParticipant.findOne({
    user: userId,
    isActive: true,
  }).populate({
    path: "room",
    match: { roomType: "direct" },
  });

  if (existingActiveRandomRoom && existingActiveRandomRoom.room) {
    userActiveRooms.set(userId.toString(), existingActiveRandomRoom.room._id.toString());
    return res.status(409).json({
      message: "You already have an active random chat",
      roomId: existingActiveRandomRoom.room._id,
      errorCode: "ACTIVE_RANDOM_CHAT_EXISTS",
    });
  }

  const waitingIndex = randomChatQueue.findIndex(
    (item) => item.userId.toString() === userId.toString()
  );
  if (waitingIndex !== -1) {
    userActiveRooms.set(userId.toString(), "queue");
    return res.status(200).json({
      message: "Already in queue, waiting for match...",
      queuePosition: waitingIndex + 1,
    });
  }

  if (randomChatQueue.length > 0) {
    const waitingUser = randomChatQueue.shift();

    if (waitingUser.userId.toString() === userId.toString()) {
      randomChatQueue.unshift(waitingUser);
      userActiveRooms.set(userId.toString(), "queue");
      return res.status(200).json({
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
      userActiveRooms.delete(waitingUser.userId.toString());

      const currentUserSocketId = userIdToSocketId.get(userId.toString());
      randomChatQueue.push({
        userId: userId,
        socketId: currentUserSocketId || null,
        timestamp: new Date(),
      });
      userActiveRooms.set(userId.toString(), "queue");
      return res.status(200).json({
        message: "Added to queue (skipping recent partner)",
      });
    }

    const room = await createRandomChatRoom(
      userId,
      waitingUser.userId,
      io,
      userIdToSocketId.get(userId.toString()),
      waitingUser.socketId
    );

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

    return res.status(200).json({
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
  userActiveRooms.set(userId.toString(), "queue");

  res.status(200).json({
    message: "Added to queue, waiting for match...",
    queuePosition: randomChatQueue.length,
  });
});

const cancelRandomChat = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const io = req.app.get("io");

  const index = randomChatQueue.findIndex(
    (item) => item.userId.toString() === userId.toString()
  );

  if (index !== -1) {
    const removed = randomChatQueue.splice(index, 1)[0];

    if (removed.socketId && io) {
      io.to(removed.socketId).emit("random-chat-cancelled", {
        message: "Removed from matchmaking queue",
      });
    }

    userActiveRooms.delete(userId.toString());

    return res.status(200).json({ message: "Removed from queue" });
  }

  const activeRoom = await RoomParticipant.findOne({
    user: userId,
    isActive: true,
  }).populate({
    path: "room",
    match: { roomType: "direct" },
  });

  if (activeRoom && activeRoom.room) {
    const roomId = activeRoom.room._id;

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
        () => recentlyLeftRooms.delete(`${userId.toString()}-${participant.user._id.toString()}`),
        300000
      );

      const otherSocketId = userIdToSocketId.get(participant.user._id.toString());
      if (otherSocketId && io) {
        io.to(otherSocketId).emit("random-chat-partner-left", {
          roomId: roomId.toString(),
          message: "Your partner left the chat",
        });
      }
      userActiveRooms.delete(participant.user._id.toString());
    }

    await RoomParticipant.updateMany(
      { room: roomId },
      { isActive: false, leftAt: new Date() }
    );

    await AnonymousRoom.findByIdAndUpdate(roomId, {
      status: "expired",
      participantCount: 0,
    });

    userActiveRooms.delete(userId.toString());

    return res.status(200).json({ message: "Left random chat" });
  }

  userActiveRooms.delete(userId.toString());
  res.status(200).json({ message: "Not in queue" });
});

const getRandomChatStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const queueEntry = randomChatQueue.find(
    (item) => item.userId.toString() === userId.toString()
  );

  if (queueEntry) {
    const position = randomChatQueue.findIndex(
      (item) => item.userId.toString() === userId.toString()
    ) + 1;
    return res.status(200).json({ 
      status: "waiting", 
      queuePosition: position,
      waitingSince: queueEntry.timestamp 
    });
  }

  const activeRandomRoom = await RoomParticipant.findOne({
    user: userId,
    isActive: true,
  }).populate({
    path: "room",
    match: { roomType: "direct" },
  });

  if (activeRandomRoom && activeRandomRoom.room) {
    const room = activeRandomRoom.room;
    const timeRemaining = room.expiresAt ? Math.max(0, room.expiresAt - Date.now()) : 0;
    
    return res.status(200).json({
      status: "matched",
      roomId: room._id,
      expiresIn: timeRemaining,
    });
  }

  res.status(200).json({ status: "available" });
});

const registerSocket = (socketId, userId) => {
  const previousSocketId = userIdToSocketId.get(userId.toString());
  
  if (previousSocketId && previousSocketId !== socketId) {
    socketIdToUserId.delete(previousSocketId);
  }
  
  socketIdToUserId.set(socketId, userId);
  userIdToSocketId.set(userId.toString(), socketId);
};

const unregisterSocket = (socketId, userId) => {
  socketIdToUserId.delete(socketId);
  if (userId) {
    userIdToSocketId.delete(userId.toString());
    
    const roomId = userActiveRooms.get(userId.toString());
    if (roomId && roomId !== "queue") {
      const io = require("../server");
    }
  }
};

const handleSocketDisconnect = (io, socket) => {
  const userId = socketIdToUserId.get(socket.id);
  if (!userId) return;

  unregisterSocket(socket.id, userId);

  const queueIndex = randomChatQueue.findIndex(
    (item) => item.userId.toString() === userId.toString()
  );
  if (queueIndex !== -1) {
    randomChatQueue.splice(queueIndex, 1);
    return;
  }

  const roomIdStr = userActiveRooms.get(userId.toString());
  if (roomIdStr && roomIdStr !== "queue") {
    handleUserLeftRoom(io, roomIdStr, userId);
  }
};

const handleUserLeftRoom = async (io, roomId, userId) => {
  try {
    const participant = await RoomParticipant.findOne({
      room: roomId,
      user: userId,
      isActive: true,
    });

    if (!participant) return;

    participant.isActive = false;
    participant.leftAt = new Date();
    await participant.save();

    const otherParticipants = await RoomParticipant.find({
      room: roomId,
      isActive: true,
    });

    if (otherParticipants.length === 0) {
      await AnonymousRoom.findByIdAndUpdate(roomId, {
        status: "expired",
        participantCount: 0,
      });
      userActiveRooms.delete(userId.toString());

      const roomParticipants = await RoomParticipant.find({
        room: roomId,
        isActive: false,
      }).populate("user", "_id");

      for (const p of roomParticipants) {
        if (p.user && p.user._id) {
          io.to(p.user._id.toString()).emit("room-expired", {
            roomId: roomId.toString(),
            message: "Chat room has expired",
          });
        }
      }
    } else {
      for (const p of otherParticipants) {
        const otherSocketId = userIdToSocketId.get(p.user._id.toString());
        if (otherSocketId) {
          io.to(otherSocketId).emit("random-chat-partner-left", {
            roomId: roomId.toString(),
            message: "Your partner left the chat",
          });
        }
      }
    }
  } catch (error) {
    console.error("Error handling user left room:", error);
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
      userActiveRooms.set(userId.toString(), "queue");

      if (io && currentUserSocketId) {
        io.to(currentUserSocketId).emit("random-chat-queued", {
          message: "Looking for a new partner...",
        });
      }

      return res.status(200).json({
        message: "No active random chat, joined queue for new partner",
        queuePosition: randomChatQueue.length,
      });
    }

    return res.status(200).json({
      message: "Already in queue waiting for a partner",
      queuePosition: waitingIndex + 1,
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
    status: "expired",
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
    userActiveRooms.delete(participant.user._id.toString());
  }

  userActiveRooms.delete(userId.toString());

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

  res.status(200).json({
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
  handleSocketDisconnect,
  nextRandomChat,
};