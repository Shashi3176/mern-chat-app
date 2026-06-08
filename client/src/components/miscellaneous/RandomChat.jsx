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
import { useState, useEffect } from "react";
import axios from "axios";
import { ChatState } from "../../Context/ChatProvider";
import { useChatNavigation } from "../../Context/ChatNavigationContext";
import { RepeatIcon } from "@chakra-ui/icons";

const RandomChat = () => {
  const [status, setStatus] = useState("available");
  const [loading, setLoading] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const toast = useToast();
  const { user, joinRoom, setSelectedChat, socket, fetchActiveRooms } = ChatState();
  const { setActiveSection } = useChatNavigation();

  const fetchStatus = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get("/api/matchmaking/random-chat/status", config);
      setStatus(data.status);

      if (data.roomId) {
        setActiveRoomId(data.roomId);
      }
    } catch (error) {
      console.error("Failed to fetch random chat status");
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);

    const handleMatch = (data) => {
      toast({
        title: "Match found!",
        description: data.message,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setActiveRoomId(data.roomId);
      fetchStatus();
    };

    const handlePartnerLeft = (data) => {
      toast({
        title: "Partner left",
        description: data.message,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      setActiveRoomId(null);
      setStatus("available");
    };

    if (socket) {
      socket.on("random-chat-matched", handleMatch);
      socket.on("random-chat-partner-left", handlePartnerLeft);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off("random-chat-matched", handleMatch);
        socket.off("random-chat-partner-left", handlePartnerLeft);
      }
    };
  }, [user, socket, toast]);

  const handleRandomChat = async () => {
    setLoading(true);
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.post(
        "/api/matchmaking/random-chat",
        {},
        config
      );

      if (data.roomId) {
        joinRoom(data.roomId);
        const roomData = await axios.get(`/api/rooms/${data.roomId}/my-room`, config);
        setSelectedChat(roomData.data);
        fetchActiveRooms();
        setActiveSection("myChats");
        setActiveRoomId(data.roomId);
        setStatus("matched");
      } else {
        setStatus("waiting");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to start random chat",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
    setLoading(false);
  };

  const handleNextChat = async () => {
    setLoading(true);
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      await axios.post("/api/matchmaking/random-chat/next", {}, config);
      setActiveRoomId(null);
      setStatus("waiting");
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to leave chat",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      await axios.post("/api/matchmaking/random-chat/cancel", {}, config);
      setStatus("available");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
    setLoading(false);
  };

  return (
    <Box w="100%" p={4}>
      <Text fontSize="xl" mb={4} fontWeight="bold">
        Random Chat
      </Text>

      <VStack spacing={4}>
        {status === "matched" && activeRoomId && (
          <>
            <Badge colorScheme="green" p={2} borderRadius="md">
              Connected to a random stranger
            </Badge>
            <Button
              leftIcon={<RepeatIcon />}
              colorScheme="blue"
              onClick={handleNextChat}
              isLoading={loading}
            >
              Find New Chat
            </Button>
          </>
        )}

        {status === "waiting" && (
          <>
            <Spinner size="lg" />
            <Text>Waiting for a partner...</Text>
            <Button colorScheme="red" onClick={handleCancel} isLoading={loading}>
              Cancel
            </Button>
          </>
        )}

        {status === "available" && (
          <Button
            colorScheme="purple"
            size="lg"
            onClick={handleRandomChat}
            isLoading={loading}
          >
            Start Random Chat
          </Button>
        )}
      </VStack>
    </Box>
  );
};

export default RandomChat;