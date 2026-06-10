import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Badge,
  useToast,
  Spinner,
  Icon,
} from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ChatState } from "../Context/ChatProvider.jsx";
import { useChatNavigation } from "../Context/ChatNavigationContext.jsx";
import { RepeatIcon } from "@chakra-ui/icons";

const RandomChatSection = () => {
  const [status, setStatus] = useState("available");
  const [loading, setLoading] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [partnerInfo, setPartnerInfo] = useState(null);
  const toast = useToast();
  const {
    user,
    joinRoom,
    setSelectedChat,
    setMyRooms,
    socket,
    fetchActiveRooms,
    leaveRoom,
  } = ChatState();
  const { setActiveSection } = useChatNavigation();

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get("/api/matchmaking/random-chat/status", config);
      setStatus(data.status);
      if (data.roomId) {
        setActiveRoomId(data.roomId);
        if (data.status === "matched" && data.partnerInfo) {
          handleMatchFromStatus(data);
        }
      } else {
        setPartnerInfo(null);
      }
    } catch (error) {
      console.error("Failed to fetch random chat status");
    }
  }, [user]);

  const handleMatchFromStatus = useCallback(
    async (data) => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        joinRoom(data.roomId);
        const { data: roomData } = await axios.get(`/api/rooms/${data.roomId}/my-room`, config);
        setSelectedChat(roomData);
        fetchActiveRooms();
        setActiveSection("myChats");
        setPartnerInfo({ id: data.partnerId, name: data.partnerName });
        setStatus("matched");
      } catch (error) {
        console.error("Failed to set up matched chat from status", error);
      }
    },
    [user, joinRoom, setSelectedChat, fetchActiveRooms, setActiveSection]
  );

  useEffect(() => {
    if (!user) return;
    fetchStatus();

    const handleMatch = async (data) => {
      toast({
        title: "Match found!",
        description: data.message,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        joinRoom(data.roomId);
        const { data: roomData } = await axios.get(`/api/rooms/${data.roomId}/my-room`, config);
        setSelectedChat(roomData);
        fetchActiveRooms();
        setActiveSection("myChats");
        setPartnerInfo({ id: data.partnerId, name: data.partnerName });
        setStatus("matched");
      } catch (error) {
        console.error("Failed to set up matched chat from WebSocket", error);
      }
    };

    const handlePartnerLeft = (data) => {
      toast({
        title: "Partner left",
        description: data.message,
        status: "info",
        duration: 5000,
        isClosable: true,
      });
      if (activeRoomId) {
        leaveRoom(activeRoomId);
      }
      setMyRooms((prevRooms) => prevRooms.filter((room) => room._id !== data.roomId));
      setActiveRoomId(null);
      setPartnerInfo(null);
      setStatus("available");
      setSelectedChat(null);
    };

    if (socket) {
      socket.on("random-chat-matched", handleMatch);
      socket.on("random-chat-partner-left", handlePartnerLeft);
    }

    return () => {
      if (socket) {
        socket.off("random-chat-matched", handleMatch);
        socket.off("random-chat-partner-left", handlePartnerLeft);
      }
    };
  }, [user, socket, toast, activeRoomId, leaveRoom, setMyRooms, setSelectedChat, setActiveSection, joinRoom, fetchActiveRooms]);

  const handleRandomChat = async () => {
    setLoading(true);
    try {
      const config = {
        headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` },
      };
      await axios.post("/api/matchmaking/random-chat", {}, config);
      setStatus("waiting");
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to start random chat",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setStatus("available");
    }
    setLoading(false);
  };

  const handleNextChat = async () => {
    try {
      const config = { headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` } };
      await axios.post("/api/matchmaking/random-chat/next", {}, config);
      setActiveRoomId(null);
      setPartnerInfo(null);
      setSelectedChat(null);
      await handleRandomChat();
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to leave chat",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setStatus("available");
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const config = { headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` } };
      await axios.post("/api/matchmaking/random-chat/cancel", {}, config);
      setStatus("available");
      setActiveRoomId(null);
      setPartnerInfo(null);
      setSelectedChat(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setStatus("available");
    }
    setLoading(false);
  };

  return (
    <VStack spacing={4} w="100%">
      {status === "available" && (
        <>
          <Text fontSize="md" mb={2} colorScheme="gray">
            Start a random chat with an anonymous partner.
          </Text>
          <Button width="full" colorScheme="purple" onClick={handleRandomChat} isLoading={loading}>
            Start Random Chat
          </Button>
        </>
      )}
      {status === "waiting" && (
        <>
          <HStack align="center" spacing={3}>
            <Spinner size="sm" />
            <Text>Searching for partner...</Text>
          </HStack>
          <Button width="full" colorScheme="red" onClick={handleCancel} isLoading={loading}>
            Cancel
          </Button>
        </>
      )}
      {status === "matched" && activeRoomId && partnerInfo && (
        <>
          <Badge colorScheme="green" p={2} borderRadius="md">
            Connected with {partnerInfo.name}
          </Badge>
          <Button
            width="full"
            leftIcon={<RepeatIcon />}
            colorScheme="blue"
            onClick={handleNextChat}
            isLoading={loading}
          >
            Find New Chat
          </Button>
        </>
      )}
    </VStack>
  );
};

export default RandomChatSection;
