import { useState, createContext, useContext, useEffect, useCallback, useRef } from "react";
import { useHistory } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import { requestNotificationPermission, notifyMessage, notifyMatch, notifyPartnerLeft, notifyRoomExpiryWarning, notifyRoomExpired } from "../utils/notifications.js";

const ChatContext = createContext();

const getInitialTheme = () => {
  try {
    if (typeof window !== "undefined") return localStorage.getItem("talkative-theme") || "light";
  } catch {}
  return "light";
};

const ChatProvider = ({ children }) => {
const [selectedChat, setSelectedChat] = useState();
const [user, setUser] = useState();
const [socket, setSocket] = useState(null);
const [onlineUsers, setOnlineUsers] = useState({});
const [typingUsers, setTypingUsers] = useState({});
const [notifications, setNotifications] = useState([]);
const [myRooms, setMyRooms] = useState([]);
const [loadingRooms, setLoadingRooms] = useState(false);
const [connectedUsers, setConnectedUsers] = useState({});
const [mutedChats, setMutedChats] = useState([]);
const [pinnedChats, setPinnedChats] = useState([]);
const [userStatus, setUserStatus] = useState("online");
const [theme, setTheme] = useState(getInitialTheme);
const [settingsOpen, setSettingsOpen] = useState(false);
const [isOffline, setIsOffline] = useState(false);
const typingTimeoutsRef = useRef({});

  const history = useHistory();

  useEffect(() => {
    try {
      if (typeof document !== "undefined") document.documentElement.setAttribute("data-theme", theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem("talkative-theme", next);
        if (typeof document !== "undefined") document.documentElement.setAttribute("data-theme", next);
      } catch {}
      return next;
    });
  }, []);

  const updateTheme = useCallback((next) => {
    setTheme(next);
    try {
      localStorage.setItem("talkative-theme", next);
      if (typeof document !== "undefined") document.documentElement.setAttribute("data-theme", next);
    } catch {}
  }, []);

  useEffect(() => {
    const userInfo = localStorage.getItem("userInfo");
    if (!userInfo) {
      history.push("/");
      return;
    }
    const parsedUser = JSON.parse(userInfo);
    setUser(parsedUser);
    const notificationSettings =
      (typeof window !== "undefined" && (() => {
        try {
          const raw = localStorage.getItem("talkative-notification-settings");
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })()) || {};

    const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
    const newSocket = io(backendUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      randomizationFactor: 0.2,
    });

    setSocket(newSocket);

    const setupWithRetry = async (attempt = 1) => {
      if (!newSocket.connected || newSocket.disconnected) {
        if (attempt <= 3) {
          setTimeout(() => setupWithRetry(attempt + 1), attempt * 1500);
          return;
        }
      }
      if (newSocket.connected) {
        newSocket.emit("setup", parsedUser);
        if (notificationSettings.desktopNotifications) {
          await requestNotificationPermission();
        }
      }
    };

    newSocket.on("connect", () => {
      console.log("Connected to socket");
      setupWithRetry();
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      if (err.code === "NETWORK_ERROR" || err.message?.includes("Network") || err.message?.includes("offline")) {
        setIsOffline(true);
      }
    });

    newSocket.on("connect_timeout", () => {
      setIsOffline(true);
    });

    newSocket.on("connected", () => {
      console.log("Socket setup complete");
      setIsOffline(false);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      if (reason === "io server disconnect" || reason === "transport close" || reason === "ping timeout") {
        setIsOffline(true);
      }
    });

    newSocket.on("reconnect", () => {
      console.log("Socket reconnected");
      setIsOffline(false);
      if (parsedUser) newSocket.emit("setup", parsedUser);
    });

    newSocket.on("reconnect_attempt", () => {
      setIsOffline(true);
    });

    newSocket.on("reconnect_failed", () => {
      setIsOffline(true);
    });

    newSocket.on("user-status", (data) => {
      setConnectedUsers((prev) => ({ ...prev, [data.userId]: data.isOnline }));
    });

    newSocket.on("user-status-change", (data) => {
      setUserStatus(data.status || "online");
    });

    newSocket.on("random-chat-matched", (data) => {
      setNotifications((prev) => [...prev, { id: Date.now() + Math.random(), type: "match", ...data }]);
      const isActiveInChat =
        selectedChat && (selectedChat._id === data.roomId || selectedChat?._id === data.roomId);
      if (!isActiveInChat && notificationSettings.desktopNotifications && notificationSettings.matchNotifications) {
        notifyMatch(data);
      }
    });

    newSocket.on("random-chat-partner-left", (data) => {
      setNotifications((prev) => [...prev, { id: Date.now() + Math.random(), type: "partner-left", ...data }]);
      if (notificationSettings.desktopNotifications) {
        notifyPartnerLeft(data);
      }
    });

    newSocket.on("room-expiration-warning", (data) => {
      setNotifications((prev) => [...prev, { id: Date.now() + Math.random(), type: "expiration-warning", ...data }]);
      if (notificationSettings.desktopNotifications && notificationSettings.roomNotifications) {
        notifyRoomExpiryWarning(data);
      }
    });

    newSocket.on("room-expired", (data) => {
      setNotifications((prev) => [...prev, { id: Date.now() + Math.random(), type: "room-expired", ...data }]);
      setMyRooms((prev) => {
        const updated = prev.filter((room) => room._id !== data.roomId);
        if (selectedChat?._id === data.roomId) {
          setSelectedChat(null);
        }
        return updated;
      });
      if (notificationSettings.desktopNotifications && notificationSettings.roomNotifications) {
        notifyRoomExpired(data);
      }
    });

    newSocket.on("room-participants-update", (data) => {
      setOnlineUsers((prev) => ({ ...prev, [data.roomId]: data.participantCount }));
    });

    newSocket.on("user-stop-typing", (data) => {
      setTypingUsers((prev) => {
        if (typingTimeoutsRef.current[data.roomId]) {
          clearTimeout(typingTimeoutsRef.current[data.roomId]);
          delete typingTimeoutsRef.current[data.roomId];
        }
        return { ...prev, [data.roomId]: false };
      });
    });

    newSocket.on("user-typing", (data) => {
      setTypingUsers((prev) => {
        const next = { ...prev, [data.roomId]: true };
        if (typingTimeoutsRef.current[data.roomId]) {
          clearTimeout(typingTimeoutsRef.current[data.roomId]);
        }
        typingTimeoutsRef.current[data.roomId] = setTimeout(() => {
          setTypingUsers((prev2) => ({ ...prev2, [data.roomId]: false }));
          delete typingTimeoutsRef.current[data.roomId];
        }, 3000);
        return next;
      });
    });

    newSocket.on("message recieved", (newMessageRecieved) => {
      const messageNotification = {
        id: Date.now() + Math.random(),
        type: "message",
        ...newMessageRecieved,
      };
      setNotifications((prev) => [...prev, messageNotification]);

      const isFromMe = newMessageRecieved.sender?._id === parsedUser?._id;
      const isInChat = selectedChat && (newMessageRecieved.room === selectedChat._id || newMessageRecieved.chat === selectedChat._id);
      const shouldNotify = !isFromMe && !isInChat && document.visibilityState !== "visible";
      if (shouldNotify && notificationSettings.desktopNotifications && notificationSettings.messageNotifications) {
        notifyMessage({
          ...newMessageRecieved,
          recipient: { _id: parsedUser?._id },
          user: parsedUser,
        });
      }

      setMyRooms((prevRooms) => {
        const updatedRooms = [...prevRooms];
        const roomId = newMessageRecieved.chat || newMessageRecieved.room;
        const roomIndex = updatedRooms.findIndex((r) => r._id === roomId);
        if (roomIndex >= 0) {
          const room = { ...updatedRooms[roomIndex] };
          room.latestMessage = newMessageRecieved;
          room.lastMessageTime = newMessageRecieved.createdAt || new Date();
          room.unreadCount = isFromMe ? 0 : (room.unreadCount || 0) + 1;
          updatedRooms.splice(roomIndex, 1);
          updatedRooms.unshift(room);
        } else {
          updatedRooms.unshift({
            _id: roomId,
            chatName: newMessageRecieved.room?.roomName || newMessageRecieved.chat?.chatName || "Direct Chat",
            isGroupChat: false,
            roomType: newMessageRecieved.room?.roomType,
            isAnonymousRoom: !!newMessageRecieved.room,
            latestMessage: newMessageRecieved,
            lastMessageTime: newMessageRecieved.createdAt || new Date(),
            unreadCount: 1,
          });
        }
        return updatedRooms;
      });
    });

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
      Object.values(typingTimeoutsRef.current).forEach((id) => clearTimeout(id));
    };
  }, [history, selectedChat, user]);

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

  const clearNotifications = useCallback(() => setNotifications([]), []);

  const toggleMuteChat = useCallback((roomId) => {
    setMutedChats((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  }, []);

  const togglePinChat = useCallback((roomId) => {
    setPinnedChats((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  }, []);

  const setUserStatusWithSocket = useCallback(
    (status) => {
      setUserStatus(status);
      if (socket) {
        socket.emit("user-status-change", { status });
      }
    },
    [socket]
  );

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      if (!user) return { success: false, message: "Not authenticated" };
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
        const { data } = await axios.put(
          `${backendUrl}/api/auth/change-password`,
          { currentPassword, newPassword },
          {
            headers: {
              "Content-type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
          }
        );
        return { success: true, message: data.message || "Password changed successfully" };
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.message || "Failed to change password",
        };
      }
    },
    [user]
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
        typingUsers,
        notifications,
        setNotifications,
        clearNotifications,
        myRooms,
        loadingRooms,
        fetchActiveRooms,
        markRoomAsRead,
        joinRoom,
        leaveRoom,
        sendTyping,
        sendStopTyping,
        mutedChats,
        toggleMuteChat,
        pinnedChats,
        togglePinChat,
        userStatus,
        setUserStatus,
        setUserStatusWithSocket,
        changePassword,
        theme,
        toggleTheme,
        updateTheme,
        isOffline,
        settingsOpen,
        setSettingsOpen,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => useContext(ChatContext);

export default ChatProvider;
