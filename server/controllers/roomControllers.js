const asyncHandler = require("express-async-handler");
const AnonymousRoom = require("../models/anonymousRoomModel");
const RoomParticipant = require("../models/roomParticipantModel");
const Message = require("../models/messageModel");
const { calculateExpiration, isExpired } = require("../utils/roomExpiration");
const { getRoomOnlineCount } = require("../utils/roomExpirationJob");

const createPublicRoom = asyncHandler(async (req, res) => {
  const { roomName, topic, maxParticipants } = req.body;

  if (maxParticipants && (maxParticipants < 2 || maxParticipants > 100)) {
    res.status(400);
    throw new Error("Max participants must be between 2 and 100");
  }

  const room = await AnonymousRoom.create({
    roomName: roomName || undefined,
    roomType: "group",
    status: "active",
    createdBy: req.user._id,
    topic,
    maxParticipants: maxParticipants || 50,
    expiresAt: calculateExpiration(),
  });

  await RoomParticipant.create({
    room: room._id,
    user: req.user._id,
    role: "admin",
    isActive: true,
  });

  await AnonymousRoom.findByIdAndUpdate(room._id, { $inc: { participantCount: 1 } });

  const populatedRoom = await AnonymousRoom.findById(room._id)
    .populate("createdBy", "_id");

  res.status(201).json({
    ...populatedRoom.toObject(),
    participantCount: 1,
  });
});

const listPublicRooms = asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, search } = req.query;

  const now = new Date();
  const query = { roomType: "group", status: "active", expiresAt: { $gt: now } };

  if (search) {
    query.$or = [
      { roomName: { $regex: search, $options: "i" } },
      { topic: { $regex: search, $options: "i" } },
    ];
  }

  const rooms = await AnonymousRoom.find(query)
    .sort({ createdAt: -1 })
    .skip(parseInt(offset))
    .limit(parseInt(limit));

  const roomsWithOnlineCount = await Promise.all(
    rooms.map(async (room) => {
      const onlineCount = await getRoomOnlineCount(room._id);
      return {
        ...room.toObject(),
        onlineCount,
      };
    })
  );

  res.json(roomsWithOnlineCount);
});

const joinRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.body;
  const io = req.app.get("io");
  const userId = req.user._id;

  if (!roomId) {
    res.status(400);
    throw new Error("Room ID is required");
  }

  if (!/^[0-9a-fA-F]{24}$/.test(roomId)) {
    res.status(400);
    throw new Error("Invalid room ID format");
  }

  const room = await AnonymousRoom.findById(roomId);

  if (!room) {
    res.status(404);
    throw new Error("Room not found");
  }

  if (room.status !== "active") {
    res.status(410);
    throw new Error("Room is no longer active");
  }

  if (isExpired(room.expiresAt)) {
    res.status(410);
    throw new Error("Room has expired");
  }

  if (room.participantCount >= room.maxParticipants) {
    res.status(403);
    throw new Error("Room is at maximum capacity");
  }

  const existingParticipant = await RoomParticipant.findOne({
    room: roomId,
    user: userId,
    isActive: true,
  });

  if (existingParticipant) {
    return res.status(200).json({ 
      message: "Already joined this room", 
      room,
      participantCount: room.participantCount 
    });
  }

  const prevParticipation = await RoomParticipant.findOne({
    room: roomId,
    user: userId,
    isActive: false,
  });

  if (prevParticipation) {
    prevParticipation.isActive = true;
    prevParticipation.leftAt = null;
    prevParticipation.role = "member";
    await prevParticipation.save();
  } else {
    await RoomParticipant.create({
      room: room._id,
      user: userId,
      role: "member",
      isActive: true,
    });
  }

  const updatedRoom = await AnonymousRoom.findByIdAndUpdate(
    roomId,
    { $inc: { participantCount: 1 } },
    { new: true }
  );

  if (io) {
    io.in(roomId).emit("room-participants-update", {
      roomId,
      participantCount: updatedRoom.participantCount,
    });
  }

  res.status(200).json(updatedRoom);
});

const leaveRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.body;
  const io = req.app.get("io");
  const userId = req.user._id;

  if (!roomId) {
    res.status(400);
    throw new Error("Room ID is required");
  }

  if (!/^[0-9a-fA-F]{24}$/.test(roomId)) {
    res.status(400);
    throw new Error("Invalid room ID format");
  }

  const participant = await RoomParticipant.findOne({
    room: roomId,
    user: userId,
    isActive: true,
  });

  if (!participant) {
    res.status(404);
    throw new Error("You are not a participant of this room");
  }

  participant.isActive = false;
  participant.leftAt = new Date();
  await participant.save();

  const actualCount = await getRoomOnlineCount(roomId);
  
  const updatedRoom = await AnonymousRoom.findByIdAndUpdate(
    roomId,
    { $inc: { participantCount: -1 } },
    { new: true }
  );

  if (io && actualCount === 0) {
    await AnonymousRoom.findByIdAndUpdate(roomId, {
      status: "inactive",
      participantCount: 0,
    });

    const roomParticipants = await RoomParticipant.find({
      room: roomId,
    }).populate("user", "_id");

    for (const p of roomParticipants) {
      if (p.user && p.user._id) {
        io.to(p.user._id.toString()).emit("room-expired", {
          roomId: roomId.toString(),
          message: "Chat room has expired due to inactivity",
        });
      }
    }
  } else if (io) {
    io.in(roomId).emit("room-participants-update", {
      roomId,
      participantCount: actualCount,
    });
  }

  res.status(200).json({
    message: "Left room successfully",
    room: updatedRoom,
  });
});

const getRoomParticipants = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  if (!/^[0-9a-fA-F]{24}$/.test(roomId)) {
    res.status(400);
    throw new Error("Invalid room ID format");
  }

  const room = await AnonymousRoom.findById(roomId);
  if (!room) {
    res.status(404);
    throw new Error("Room not found");
  }

  const participants = await RoomParticipant.find({
    room: roomId,
    isActive: true,
  })
    .populate({
      path: "user",
      populate: { path: "anonymousName", select: "name" },
    })
    .select("user role joinedAt")
    .sort({ joinedAt: 1 });

  res.json(participants);
});

const getRoomMessages = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { limit = 100, before } = req.query;

  if (!/^[0-9a-fA-F]{24}$/.test(roomId)) {
    res.status(400);
    throw new Error("Invalid room ID format");
  }

  const room = await AnonymousRoom.findById(roomId);
  if (!room) {
    res.status(404);
    throw new Error("Room not found");
  }

  if (isExpired(room.expiresAt)) {
    res.status(410);
    throw new Error("Room has expired");
  }

  let query = { room: roomId };
  
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .populate({
      path: "sender",
      populate: { path: "anonymousName", select: "name" },
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  res.json(messages.reverse());
});

module.exports = {
  createPublicRoom,
  listPublicRooms,
  joinRoom,
  leaveRoom,
  getRoomParticipants,
  getRoomMessages,
};