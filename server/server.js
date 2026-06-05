const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const roomRoutes = require("./routes/roomRoutes");
const matchmakingRoutes = require("./routes/matchmakingRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");

dotenv.config();
connectDB();
const app = express();

app.use(express.json()); // to accept json data

// app.get("/", (req, res) => {
//   res.send("API Running!");
// });

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/matchmaking", matchmakingRoutes);

// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------------deployment------------------------------

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;

const server = app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`.yellow.bold)
);

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
  },
});

app.set("io", io);

const { startExpirationJob, getRoomOnlineCount } = require("./utils/roomExpirationJob");
startExpirationJob(io);

const matchmakingController = require("./controllers/matchmakingController");

const roomOnlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.userId = userData._id;
    matchmakingController.registerSocket(socket.id, userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });

  socket.on("join room", async (roomId) => {
    socket.join(roomId);
    console.log("User Joined Anonymous Room: " + roomId);

    const roomKey = roomId.toString();
    const currentCount = roomOnlineUsers.get(roomKey) || 0;
    roomOnlineUsers.set(roomKey, currentCount + 1);

    const actualCount = await getRoomOnlineCount(roomId);
    io.in(roomId).emit("room-participants-update", {
      roomId,
      participantCount: actualCount,
    });
  });

  socket.on("leave room", async (roomId) => {
    socket.leave(roomId);
    console.log("User Left Anonymous Room: " + roomId);

    const roomKey = roomId.toString();
    const currentCount = roomOnlineUsers.get(roomKey) || 0;
    roomOnlineUsers.set(roomKey, Math.max(0, currentCount - 1));

    const actualCount = await getRoomOnlineCount(roomId);
    io.in(roomId).emit("room-participants-update", {
      roomId,
      participantCount: actualCount,
    });
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("typing-room", (roomId) => {
    socket.to(roomId).emit("user-typing", {
      roomId,
      userId: socket.userId,
    });
  });

  socket.on("stop-typing-room", (roomId) => {
    socket.to(roomId).emit("user-stop-typing", {
      roomId,
      userId: socket.userId,
    });
  });

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (chat && chat.users) {
      chat.users.forEach((user) => {
        if (user._id == newMessageRecieved.sender._id) return;
        socket.in(user._id).emit("message recieved", newMessageRecieved);
      });
    }

    var room = newMessageRecieved.room;
    if (room && room._id) {
      socket.in(room._id).emit("message recieved", newMessageRecieved);
    }
  });

  socket.on("disconnect", () => {
    console.log("USER DISCONNECTED");
    matchmakingController.unregisterSocket(socket.id, socket.userId);
  });
});
