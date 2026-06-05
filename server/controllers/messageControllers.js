const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const Chat = require("../models/chatModel");
const RoomParticipant = require("../models/roomParticipantModel");
const AnonymousRoom = require("../models/anonymousRoomModel");

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "_id")
      .populate("chat", "_id");
    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, roomId } = req.body;

  if (!content) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  if (!chatId && !roomId) {
    return res.status(400).json({ message: "chatId or roomId required" });
  }

  if (roomId && !chatId) {
    const isParticipant = await RoomParticipant.findOne({
      room: roomId,
      user: req.user._id,
      isActive: true,
    });

    if (!isParticipant) {
      res.status(403);
      throw new Error("Not a participant of this room");
    }

    const room = await AnonymousRoom.findById(roomId);
    if (room && room.status === "inactive") {
      res.status(400);
      throw new Error("Room has expired");
    }
    if (room && room.expiresAt && new Date() > room.expiresAt) {
      res.status(400);
      throw new Error("Room has expired");
    }
  }

  var newMessage = {
    sender: req.user._id,
    content: content,
  };

  if (chatId) {
    newMessage.chat = chatId;
  }
  if (roomId) {
    newMessage.room = roomId;
  }

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "_id").execPopulate();

    if (chatId) {
      message = await message.populate("chat", "_id").execPopulate();
      await Chat.findByIdAndUpdate(chatId, { latestMessage: message });
    }
    if (roomId) {
      message = await message.populate({
        path: "room",
        select: "_id roomName topic createdAt",
      }).execPopulate();
      message = await message.populate({
        path: "sender",
        populate: { path: "anonymousName", select: "name" },
      }).execPopulate();
    }

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = { allMessages, sendMessage };
