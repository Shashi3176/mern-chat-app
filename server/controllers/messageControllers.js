const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const Chat = require("../models/chatModel");
const RoomParticipant = require("../models/roomParticipantModel");
const AnonymousRoom = require("../models/anonymousRoomModel");
const ToxicityLog = require("../models/toxicityLogModel");
const { isExpired } = require("../utils/roomExpiration");
const { checkToxicity } = require("../utils/toxicityChecker");
const { config } = require("../config/toxicity.config");

/**
 * Logs a blocked toxic message for admin review.
 * @param {string} userId - User ID
 * @param {string} roomId - Room ID (optional)
 * @param {string} chatId - Chat ID (optional)
 * @param {string} messageContent - The blocked message
 * @param {string[]} categories - Toxic categories detected
 * @param {Object} scores - Confidence scores by category
 * @param {number} confidence - Overall confidence
 */
async function logToxicMessage(userId, roomId, chatId, messageContent, categories, scores, confidence) {
  try {
    await ToxicityLog.create({
      userId,
      roomId: roomId || undefined,
      chatId: chatId || undefined,
      messageContent: messageContent.substring(0, 100),
      detectedCategories: categories,
      confidenceScores: scores,
      confidence,
    });
  } catch (error) {
    console.error("[ToxicityChecker] Failed to log toxic message:", error.message);
  }
}

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { limit = 100, before } = req.query;

  if (!chatId || !/^[0-9a-fA-F]{24}$/.test(chatId)) {
    res.status(400);
    throw new Error("Invalid chat ID format");
  }

  let query = { chat: chatId };
  
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .populate("sender", "_id name")
    .populate("chat", "_id")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  res.json(messages.reverse());
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, roomId } = req.body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400);
    throw new Error("Message content is required and cannot be empty");
  }

  if (content.length > 5000) {
    res.status(400);
    throw new Error("Message content exceeds maximum length of 5000 characters");
  }

  if (!chatId && !roomId) {
    res.status(400);
    throw new Error("chatId or roomId is required");
  }

  var newMessage = {
    sender: req.user._id,
    content: content.trim(),
  };

  if (roomId) {
    newMessage.room = roomId;

    if (!/^[0-9a-fA-F]{24}$/.test(roomId)) {
      res.status(400);
      throw new Error("Invalid room ID format");
    }

    const isParticipant = await RoomParticipant.findOne({
      room: roomId,
      user: req.user._id,
      isActive: true,
    });

    if (!isParticipant) {
      res.status(403);
      throw new Error("You are not a participant of this room");
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
  }

  if (chatId) {
    if (!/^[0-9a-fA-F]{24}$/.test(chatId)) {
      res.status(400);
      throw new Error("Invalid chat ID format");
    }

    newMessage.chat = chatId;
  }

  // Toxicity check for messages longer than 3 characters
  if (content.trim().length > 3) {
    try {
      const result = await checkToxicity(content);

      if (result.isToxic) {
        await logToxicMessage(
          req.user._id,
          roomId || undefined,
          chatId || undefined,
          content,
          result.categories,
          result.scores,
          result.confidence
        );

        return res.status(400).json({
          success: false,
          error: "This message violates our community guidelines and cannot be sent.",
          blocked: true,
        });
      }
    } catch (toxicityError) {
      console.error("[ToxicityChecker] Error during toxicity check:", toxicityError.message);
      const isCircuitOpen = toxicityError.isCircuitOpen || false;

      if (config.failMode === "closed" || isCircuitOpen) {
        const userMessage = toxicityError.userMessage || "Unable to verify message. Please try again.";
        return res.status(503).json({
          success: false,
          error: userMessage,
          blocked: true,
          retryable: true,
        });
      }
      console.warn(`[ToxicityChecker] Allow message due to API error (fail mode: open, error: ${toxicityError.message})`);
    }
  }

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "_id name").execPopulate();

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

    res.status(201).json(message);
  } catch (error) {
    if (error.name === "MongoError" && error.code === 11000) {
      res.status(409);
      throw new Error("Duplicate message detected");
    }
    res.status(500);
    throw new Error("Failed to send message");
  }
});

module.exports = { allMessages, sendMessage };