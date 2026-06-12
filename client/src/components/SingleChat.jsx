import { Box, Spinner, Text, useToast, VStack } from "@chakra-ui/react";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { ChatState } from "../Context/ChatProvider";
import { useChatNavigation } from "../Context/ChatNavigationContext";
import ChatHeader from "./ChatHeader";
import EmptyState from "./EmptyState";
import MessageInput from "./MessageInput";
import MessagesContainerAdvanced from "./Advanced/MessagesContainerAdvanced";

const checkRoomExpired = (room) => {
  if (!room) return true;
  if (room.status && room.status !== "active") return true;
  if (room.expiresAt) return new Date(room.expiresAt).getTime() <= Date.now();
  return false;
};

const SingleChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isRoomExpired, setIsRoomExpired] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [consecutiveBlocks, setConsecutiveBlocks] = useState(0);
  const typingTimeoutRef = useRef(null);
  const toast = useToast();

  const {
    selectedChat,
    setSelectedChat,
    user,
    socket,
    typingUsers,
    joinRoom,
    sendTyping,
    sendStopTyping,
    leaveRoom,
    markRoomAsRead,
  } = ChatState();
  const { setActiveSection } = useChatNavigation();

  useEffect(() => {
    if (!selectedChat) {
      setIsRoomExpired(false);
      return;
    }

    const updateRoomExpiredState = () => {
      setIsRoomExpired(checkRoomExpired(selectedChat));
    };

    updateRoomExpiredState();
    const timer = setInterval(updateRoomExpiredState, 1000);

    return () => clearInterval(timer);
  }, [selectedChat?._id, selectedChat?.expiresAt, selectedChat?.status]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const loadMessages = async () => {
      setLoading(true);
      const fetchedMessages = await fetchMessages();
      setMessages(fetchedMessages);
      setLoading(false);
      joinRoom(selectedChat._id);
      if (selectedChat.unreadCount > 0) {
        await markRoomAsRead(selectedChat._id);
      }
    };

    loadMessages();
  }, [selectedChat?._id, joinRoom, markRoomAsRead]);

  useEffect(() => {
    if (!socket || !user || !selectedChat) return;

    const handleMessageReceived = (newMessageRecieved) => {
      const roomId =
        newMessageRecieved.room?._id ||
        newMessageRecieved.room ||
        newMessageRecieved.chat?._id ||
        newMessageRecieved.chat ||
        newMessageRecieved.roomId ||
        newMessageRecieved.chatId;

      if (roomId !== selectedChat._id) return;

      setMessages((prev) => {
        const exists = prev.some((message) => message._id === newMessageRecieved._id);
        if (exists) return prev;
        return [...prev, newMessageRecieved];
      });
    };

    socket.on("message recieved", handleMessageReceived);

    return () => {
      socket.off("message recieved", handleMessageReceived);
    };
  }, [socket, selectedChat?._id, user]);

  const fetchMessages = async () => {
    if (!selectedChat) return [];

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      let endpoint = `/api/message/${selectedChat._id}`;
      if (selectedChat.roomType === "group" || selectedChat.roomType === "direct") {
        endpoint = `/api/rooms/${selectedChat._id}/messages`;
      }

      const { data } = await axios.get(endpoint, config);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return [];
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || isRoomExpired) return;

    sendStopTyping(selectedChat._id);
    setIsSending(true);

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const payload = { content: newMessage };

      if (selectedChat.roomType === "group" || selectedChat.roomType === "direct") {
        payload.roomId = selectedChat._id;
      } else {
        payload.chatId = selectedChat._id;
      }

      const response = await axios.post("/api/message", payload, config);
      
      if (response.data?.blocked) {
        const newCount = consecutiveBlocks + 1;
        setConsecutiveBlocks(newCount);
        
        if (newCount >= 3) {
          toast({
            title: "Multiple Messages Blocked",
            description: "Multiple messages have been blocked. Please review our community guidelines.",
            status: "warning",
            duration: 8000,
            isClosable: true,
            position: "top",
          });
        } else {
          toast({
            title: "Message Not Sent",
            description: "Your message couldn't be sent because it may violate our community guidelines. Please be respectful.",
            status: "warning",
            duration: 5000,
            isClosable: true,
            position: "top",
          });
        }
        setIsSending(false);
        return false;
      }
      
      setConsecutiveBlocks(0);
      setMessages((prev) => [...prev, response.data]);
      if (socket) {
        socket.emit("new message", response.data);
      }
      setNewMessage("");
      setIsSending(false);
      return true;
    } catch (error) {
      const isBlocked = error.response?.data?.blocked;
      const isApiError = error.response?.status === 503;
      
      if (isBlocked) {
        const newCount = consecutiveBlocks + 1;
        setConsecutiveBlocks(newCount);
        
        if (newCount >= 3) {
          toast({
            title: "Multiple Messages Blocked",
            description: "Multiple messages have been blocked. Please review our community guidelines.",
            status: "warning",
            duration: 8000,
            isClosable: true,
            position: "top",
          });
        } else {
          toast({
            title: "Message Not Sent",
            description: "Your message couldn't be sent because it may violate our community guidelines. Please be respectful.",
            status: "warning",
            duration: 5000,
            isClosable: true,
            position: "top",
          });
        }
      } else if (isApiError) {
        toast({
          title: "Unable to Send",
          description: "Unable to verify message. Please try again.",
          status: "warning",
          duration: 5000,
          isClosable: true,
          position: "top",
        });
      } else {
        toast({
          title: "Error Occured!",
          description: "Failed to send the Message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
      setIsSending(false);
      return false;
    }
  };

  const handleFindNewChat = async () => {
    if (!selectedChat?._id || isRoomExpired) return;

    try {
      await leaveRoom(selectedChat._id);

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      await axios.post("/api/matchmaking/random-chat", {}, config);
      setMessages([]);
      setNewMessage("");
      setSelectedChat(null);
      setActiveSection("randomChat");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to leave chat or start new search",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const sendTypingWithDebounce = () => {
    if (isRoomExpired || !selectedChat?._id) return;
    sendTyping(selectedChat._id);
  };

  const typingHandler = (event) => {
    if (isRoomExpired) return;
    setNewMessage(event.target.value);
    sendTypingWithDebounce();
  };

  const handleBrowseRooms = () => {
    setActiveSection("browseRooms");
  };

  const handleRandomChat = () => {
    setActiveSection("randomChat");
  };

  if (!selectedChat) {
    return (
      <EmptyState
        onBrowseRooms={handleBrowseRooms}
        onRandomChat={handleRandomChat}
      />
    );
  }

  const currentChatTyping = !!typingUsers[selectedChat._id];

  if (currentChatTyping && typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }

  return (
    <VStack className="single-chat" h="100%" w="100%" spacing={0}>
      <ChatHeader onFindNewChat={handleFindNewChat} />

      <Box className="single-chat-body">
        {loading ? (
          <Box className="messages-loading">
            <Spinner size="xl" />
            <Text color="gray.500">Loading messages</Text>
          </Box>
        ) : (
          <MessagesContainerAdvanced
            messages={messages}
            roomType={selectedChat.roomType}
            loading={loading}
          />
        )}
      </Box>

      <Box className="message-input-shell">
        <MessageInput
          value={newMessage}
          onChange={typingHandler}
          onSend={sendMessage}
          isDisabled={loading || !selectedChat}
          isExpired={isRoomExpired}
          isTyping={currentChatTyping}
          placeholder="Type a message..."
          isSending={isSending}
        />
      </Box>
    </VStack>
  );
};

export default SingleChat;
