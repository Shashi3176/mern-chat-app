const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel");
const RoomParticipant = require("../models/roomParticipantModel");
const AnonymousRoom = require("../models/anonymousRoomModel");
const Message = require("../models/messageModel");

//@description     Create or fetch One to One Chat
//@route           POST /api/chat/
//@access          Protected
const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    console.log("UserId param not sent with request");
    return res.sendStatus(400);
  }

  var isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "_id")
    .populate("latestMessage");

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate("users", "_id");
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }
});

//@description     Fetch all chats for a user
//@route           GET /api/chat/
//@access          Protected
const fetchChats = asyncHandler(async (req, res) => {
  try {
    Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate("users", "_id")
      .populate("groupAdmin", "_id")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await results.populate({
          path: "latestMessage.sender",
          select: "_id",
        });
        res.status(200).send(results);
      });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Group Chat
//@route           POST /api/chat/group
//@access          Protected
const createGroupChat = asyncHandler(async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: "Please Fill all the feilds" });
  }

  var users = JSON.parse(req.body.users);

  if (users.length < 2) {
    return res
      .status(400)
      .send("More than 2 users are required to form a group chat");
  }

  users.push(req.user);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "_id")
      .populate("groupAdmin", "_id");

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    Rename Group
// @route   PUT /api/chat/rename
// @access  Protected
const renameGroup = asyncHandler(async (req, res) => {
  const { chatId, chatName } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      chatName: chatName,
    },
    {
      new: true,
    }
  )
    .populate("users", "_id")
    .populate("groupAdmin", "_id");

  if (!updatedChat) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(updatedChat);
  }
});

// @desc    Remove user from Group
// @route   PUT /api/chat/groupremove
// @access  Protected
const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  // check if the requester is admin

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "_id")
    .populate("groupAdmin", "_id");

  if (!removed) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(removed);
  }
});

// @desc    Add user to Group / Leave
// @route   PUT /api/chat/groupadd
// @access  Protected
const addToGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  // check if the requester is admin

  const added = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "_id")
    .populate("groupAdmin", "_id");

  if (!added) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(added);
  }
});

//@description Fetch user's active rooms with last message info and unread count
//@route GET /api/chat/my-chats
//@access Protected
const getMyActiveRooms = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [chatResults, roomResults] = await Promise.all([
    Chat.find({ users: { $elemMatch: { $eq: userId } } })
      .populate("users", "_id")
      .populate("groupAdmin", "_id")
      .populate("latestMessage")
      .sort({ updatedAt: -1 }),
    RoomParticipant.find({ user: userId, isActive: true })
      .populate({
        path: "room",
        match: { status: "active", expiresAt: { $gt: new Date() } },
      }),
  ]);

  const populatedChats = await Promise.all(
    chatResults.map(async (chat) => {
      const unreadCount = await Message.countDocuments({
        chat: chat._id,
        readBy: { $ne: userId },
      });
      return {
        _id: chat._id,
        isGroupChat: true,
        chatName: chat.chatName,
        users: chat.users,
        latestMessage: chat.latestMessage,
        lastMessageTime: chat.updatedAt,
        unreadCount,
        isAnonymousRoom: false,
      };
    })
  );

  const populatedRooms = await Promise.all(
    roomResults
      .filter((r) => r.room)
      .map(async (participation) => {
        const room = participation.room;
        const latestMessage = await Message.findOne({ room: room._id }).sort({ createdAt: -1 });
        const unreadCount = await Message.countDocuments({
          room: room._id,
          readBy: { $ne: userId },
        });
        return {
          _id: room._id,
          isGroupChat: false,
          chatName: room.roomName || "Random Chat",
          roomType: room.roomType,
          users: [{ _id: userId }],
          latestMessage,
          lastMessageTime: latestMessage ? latestMessage.createdAt : room.updatedAt,
          unreadCount,
          isAnonymousRoom: true,
        };
      })
  );

  const combined = [...populatedChats, ...populatedRooms];
  combined.sort((a, b) => {
    const timeA = new Date(a.lastMessageTime || a.updatedAt || 0);
    const timeB = new Date(b.lastMessageTime || b.updatedAt || 0);
    return timeB - timeA;
  });

  res.json(combined);
});

const markRoomAsRead = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user._id;

  if (/^[0-9a-fA-F]{24}$/.test(roomId)) {
    const chat = await Chat.findById(roomId);
    if (chat && chat.users.some((u) => u._id.toString() === userId.toString())) {
      const result = await Message.updateMany(
        { chat: roomId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );
      return res.json({ success: true, modifiedCount: result.modifiedCount });
    }
  }

  const participant = await RoomParticipant.findOne({ room: roomId, user: userId, isActive: true });
  if (!participant) {
    res.status(404);
    throw new Error("Room not found or you are not a participant");
  }

  const result = await Message.updateMany(
    { room: roomId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

  res.json({ success: true, modifiedCount: result.modifiedCount });
});

module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  getMyActiveRooms,
  markRoomAsRead,
};
