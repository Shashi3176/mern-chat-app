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
  const [theme, setTheme] = useState(getInitialTheme);
  const [isOffline, setIsOffline] = useState(false);
  const typingTimeoutsRef = useRef({});
  const selectedChatRef = useRef();
  const userRef = useRef();
  const history = useHistory();

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const userInfo = localStorage.getItem("userInfo");
    if (!userInfo) {
      history.push("/");
      return;
    }
    const parsedUser = JSON.parse(userInfo);
    setUser((prev) => {
      if (prev && prev._id === parsedUser._id) return prev;
      return parsedUser;
    });
  }, []);

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
    } catch (error) {
      console.error("Failed to mark room as read:", error);
    }
  }, [user]);

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
        theme,
        toggleTheme,
        updateTheme,
        isOffline,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => useContext(ChatContext);

export default ChatProvider;
