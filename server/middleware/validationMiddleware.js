const { isExpired } = require("../utils/roomExpiration");

const validateRoomId = (req, res, next) => {
  const roomId = req.params.roomId || req.body.roomId;
  
  if (!roomId) {
    res.status(400);
    throw new Error("Room ID is required");
  }

  if (!/^[0-9a-fA-F]{24}$/.test(roomId)) {
    res.status(400);
    throw new Error("Invalid room ID format");
  }

  next();
};

const validateActiveRoom = async (req, res, next) => {
  const { roomId } = req.params;

  const AnonymousRoom = require("../models/anonymousRoomModel");
  
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

  req.room = room;
  next();
};

const validateParticipant = async (req, res, next) => {
  const RoomParticipant = require("../models/roomParticipantModel");
  const { roomId } = req.params;
  const userId = req.user._id;

  const participant = await RoomParticipant.findOne({
    room: roomId,
    user: userId,
    isActive: true,
  });

  if (!participant) {
    res.status(403);
    throw new Error("You are not a participant of this room");
  }

  req.participant = participant;
  next();
};

const validateMessageContent = (req, res, next) => {
  const { content } = req.body;

  if (!content || typeof content !== "string") {
    res.status(400);
    throw new Error("Message content is required");
  }

  if (content.trim().length === 0) {
    res.status(400);
    throw new Error("Message content cannot be empty");
  }

  if (content.length > 5000) {
    res.status(400);
    throw new Error("Message content exceeds maximum length of 5000 characters");
  }

  next();
};

module.exports = {
  validateRoomId,
  validateActiveRoom,
  validateParticipant,
  validateMessageContent,
};