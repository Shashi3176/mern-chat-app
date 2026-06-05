import { Box, Text, VStack, HStack, Badge, useToast } from "@chakra-ui/react";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ChatState } from "../Context/ChatProvider";

const RoomTimer = ({ room }) => {
  const [timeLeft, setTimeLeft] = useState("");

  const calculateTimeLeft = useCallback(() => {
    if (!room?.expiresAt) {
      setTimeLeft("2h 0m 0s");
      return;
    }
    const now = new Date();
    const expiry = new Date(room.expiresAt);
    const diff = expiry - now;

    if (diff <= 0) {
      setTimeLeft("Expired");
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
  }, [room?.expiresAt]);

  useEffect(() => {
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  return (
    <Badge colorScheme={timeLeft === "Expired" ? "red" : "orange"} p={1}>
      Expires in: {timeLeft}
    </Badge>
  );
};

const RoomParticipants = ({ roomId }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = ChatState();

  const fetchParticipants = useCallback(async () => {
    if (!roomId) return;
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get(`/api/rooms/${roomId}/participants`, config);
      setParticipants(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  }, [roomId, user?.token]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  return (
    <Box mt={2} p={2} bg="gray.50" borderRadius="md" maxH="150px" overflowY="auto">
      <Text fontSize="sm" fontWeight="bold" mb={1}>
        Participants ({participants.length})
      </Text>
      {loading ? (
        <Text fontSize="sm">Loading...</Text>
      ) : (
        <VStack align="flex-start" spacing={1}>
          {participants.map((p) => (
            <HStack key={p._id}>
              <Badge colorScheme="blue">{p.user?.anonymousName?.name || "Anonymous"}</Badge>
              <Text fontSize="sm">{p.role}</Text>
            </HStack>
          ))}
        </VStack>
      )}
    </Box>
  );
};

export { RoomTimer, RoomParticipants };