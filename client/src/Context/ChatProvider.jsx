import { useState, createContext, useContext, useEffect, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { io } from "socket.io-client";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState();
  const [user, setUser] = useState();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const history = useHistory();

  useEffect(() => {
    const userInfo = localStorage.getItem("userInfo");

    if (!userInfo) {
      history.push("/");
      return;
    }

    const parsedUser = JSON.parse(userInfo);
    setUser(parsedUser);

    const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
    const newSocket = io(backendUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to socket");
      newSocket.emit("setup", parsedUser);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      fetchNotificationsFallback(parsedUser._id);
    });

    newSocket.on("connected", () => {
      console.log("Socket setup complete");
    });

    newSocket.on("random-chat-matched", (data) => {
      setNotifications((prev) => [...prev, { type: "match", ...data }]);
    });

    newSocket.on("random-chat-partner-left", (data) => {
      setNotifications((prev) => [...prev, { type: "partner-left", ...data }]);
    });

    newSocket.on("room-expiration-warning", (data) => {
      setNotifications((prev) => [...prev, { type: "expiration-warning", ...data }]);
    });

    newSocket.on("room-expired", (data) => {
      setNotifications((prev) => [...prev, { type: "room-expired", ...data }]);
    });

    newSocket.on("room-participants-update", (data) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [data.roomId]: data.participantCount,
      }));
    });

    newSocket.on("user-typing", (data) => {
      setNotifications((prev) => [...prev, { type: "typing", ...data }]);
    });

    newSocket.on("user-stop-typing", (data) => {
      setNotifications((prev) => [...prev, { type: "stop-typing", ...data }]);
    });

    newSocket.on("message recieved", (newMessageRecieved) => {
      setNotifications((prev) => [...prev, { type: "message", ...newMessageRecieved }]);

      setMyRooms((prevRooms) => {
        const updatedRooms = [...prevRooms];
        const roomId = newMessageRecieved.chat || newMessageRecieved.room;
        const roomIndex = updatedRooms.findIndex((r) => r._id === roomId);

        if (roomIndex >= 0) {
          const room = { ...updatedRooms[roomIndex] };
          room.latestMessage = newMessageRecieved;
          room.lastMessageTime = newMessageRecieved.createdAt || new Date();
          room.unreadCount = newMessageRecieved.sender._id !== user._id ? room.unreadCount + 1 : 0;
          updatedRooms.splice(roomIndex, 1);
          updatedRooms.unshift(room);
        }
        return updatedRooms;
      });
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [history]);

  const fetchNotificationsFallback = async (userId) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(`${backendUrl}/api/rooms/${userId}/my-rooms`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const rooms = await response.json();
        const expired = rooms.filter(
          (room) => !room.status || room.expiresAt < new Date().toISOString()
        );
        setNotifications((prev) => [...prev, ...expired.map((r) => ({ type: "room-expired", roomId: r._id }))]);
      }
    } catch (error) {
      console.error("Fallback fetch failed:", error);
    }
  };

  const fetchActiveRooms = async () => {
    if (!user) return;
    setLoadingRooms(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(`${backendUrl}/api/chat/my-chats`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      if (response.ok) {
        const rooms = await response.json();
        setMyRooms(rooms);
      }
    } catch (error) {
      console.error("Failed to fetch active rooms:", error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const markRoomAsRead = async (roomId) => {
    if (!user) return;
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      await fetch(`${backendUrl}/api/chat/${roomId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setMyRooms((prev) =>
        prev.map((room) => (room._id === roomId ? { ...room, unreadCount: 0 } : room))
      );
    } catch (error) {
      console.error("Failed to mark room as read:", error);
    }
  };

  const joinRoom = useCallback(
    (roomId) => {
      if (socket) {
        socket.emit("join room", roomId);
      }
    },
    [socket]
  );

  const leaveRoom = useCallback(
    (roomId) => {
      if (socket) {
        socket.emit("leave room", roomId);
      }
    },
    [socket]
  );

  const sendTyping = useCallback(
    (roomId) => {
      if (socket) {
        socket.emit("typing-room", roomId);
      }
    },
    [socket]
  );

  const sendStopTyping = useCallback(
    (roomId) => {
      if (socket) {
        socket.emit("stop-typing-room", roomId);
      }
    },
    [socket]
  );

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        user,
        setUser,
        socket,
        onlineUsers,
        notifications,
        setNotifications,
        myRooms,
        loadingRooms,
        fetchActiveRooms,
        markRoomAsRead,
        joinRoom,
        leaveRoom,
        sendTyping,
        sendStopTyping,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => useContext(ChatContext);

export default ChatProvider;
