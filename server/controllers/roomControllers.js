const asyncHandler = require("express-async-handler");
const AnonymousRoom = require("../models/anonymousRoomModel");
const RoomParticipant = require("../models/roomParticipantModel");
const Message = require("../models/messageModel");
const { calculateExpiration } = require("../utils/roomExpiration");
const { getRoomOnlineCount } = require("../utils/roomExpirationJob");

const createPublicRoom = asyncHandler(async (req, res) => {
  const { roomName, topic } = req.body;

  const room = await AnonymousRoom.create({
    roomName: roomName || undefined,
    roomType: "group",
    status: "active",
    createdBy: req.user._id,
    topic,
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

  res.status(201).json(populatedRoom);
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

  res.json(rooms);
});

const joinRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.body;
  const io = req.app.get("io");

  if (!roomId) {
    res.status(400);
    throw new Error("Room ID is required");
  }

  const room = await AnonymousRoom.findById(roomId);

  if (!room) {
    res.status(404);
    throw new Error("Room not found");
  }

  if (room.status !== "active") {
    res.status(400);
    throw new Error("Room is not active");
  }

  if (room.expiresAt && new Date() > room.expiresAt) {
    res.status(400);
    throw new Error("Room has expired");
  }

  const existingParticipant = await RoomParticipant.findOne({
    room: roomId,
    user: req.user._id,
    isActive: true,
  });

  if (existingParticipant) {
    return res.json({ message: "Already joined this room", room });
  }

  const prevParticipation = await RoomParticipant.findOne({
    room: roomId,
    user: req.user._id,
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
      user: req.user._id,
      role: "member",
      isActive: true,
    });
  }

  const actualCount = await getRoomOnlineCount(roomId);
  if (io) {
    io.in(roomId).emit("room-participants-update", {
      roomId,
      participantCount: actualCount,
    });
  }

  const updatedRoom = await AnonymousRoom.findByIdAndUpdate(
    roomId,
    { $inc: { participantCount: 1 } },
    { new: true }
  );
  res.json(updatedRoom);
});

const leaveRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.body;
  const io = req.app.get("io");

  if (!roomId) {
    res.status(400);
    throw new Error("Room ID is required");
  }

  const participant = await RoomParticipant.findOne({
    room: roomId,
    user: req.user._id,
    isActive: true,
  });

  if (!participant) {
    res.status(404);
    throw new Error("Not a participant of this room");
  }

  participant.isActive = false;
  participant.leftAt = new Date();
  await participant.save();

  const actualCount = await getRoomOnlineCount(roomId);
  if (io) {
    io.in(roomId).emit("room-participants-update", {
      roomId,
      participantCount: actualCount,
    });
  }

  const updatedRoom = await AnonymousRoom.findByIdAndUpdate(
    roomId,
    { $inc: { participantCount: -1 } },
    { new: true }
  );

  res.json(updatedRoom);
});

const getRoomParticipants = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const participants = await RoomParticipant.find({
    room: roomId,
    isActive: true,
  })
    .populate({
      path: "user",
      populate: { path: "anonymousName", select: "name" },
    })
    .select("user role joinedAt");

  res.json(participants);
});

const getRoomMessages = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const messages = await Message.find({ room: roomId })
    .populate({
      path: "sender",
      populate: { path: "anonymousName", select: "name" },
    })
    .sort({ createdAt: -1 });

  res.json(messages);
});

module.exports = {
  createPublicRoom,
  listPublicRooms,
  joinRoom,
  leaveRoom,
  getRoomParticipants,
  getRoomMessages,
};