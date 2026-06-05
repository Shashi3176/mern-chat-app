import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Badge,
  useToast,
  Spinner,
  Input,
  IconButton,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import axios from "axios";
import { ChatState } from "../../Context/ChatProvider";
import { AddIcon } from "@chakra-ui/icons";

const BrowseRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const toast = useToast();
  const { user, joinRoom, setSelectedChat } = ChatState();

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get(`/api/rooms/public?search=${search}`, config);
      setRooms(data);
      setLoading(false);
    } catch (error) {
      toast({
        title: "Error fetching rooms",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleJoinRoom = async (room) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      await axios.post("/api/rooms/join", { roomId: room._id }, config);
      joinRoom(room._id);
      setSelectedChat(room);
    } catch (error) {
      toast({
        title: "Error joining room",
        description: error.response?.data?.message || "Failed to join room",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const formatTimeLeft = (expiresAt) => {
    if (!expiresAt) return "2h left";
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return `${hours}h ${minutes}m left`;
  };

  const handleCreateRoom = async (roomName, topic) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.post(
        "/api/rooms/public",
        { roomName, topic },
        config
      );
      joinRoom(data._id);
      setSelectedChat(data);
    } catch (error) {
      toast({
        title: "Error creating room",
        description: error.response?.data?.message || "Failed to create room",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box w="100%" p={4}>
      <Text fontSize="xl" mb={4} fontWeight="bold">
        Browse Rooms
      </Text>

      <Input
        placeholder="Search rooms..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        mb={4}
      />

      {loading ? (
        <Box textAlign="center" py={4}>
          <Spinner />
        </Box>
      ) : (
        <VStack spacing={3} align="stretch">
          {rooms.length === 0 ? (
            <Text color="gray.500">No rooms found. Be the first to create one!</Text>
          ) : (
            rooms.map((room) => (
              <Box
                key={room._id}
                p={4}
                borderWidth="1px"
                borderRadius="lg"
                _hover={{ bg: "gray.50", cursor: "pointer" }}
                onClick={() => handleJoinRoom(room)}
              >
                <HStack justify="space-between">
                  <VStack align="flex-start" spacing={1}>
                    <Text fontWeight="bold">{room.roomName || "Unnamed Room"}</Text>
                    {room.topic && <Text fontSize="sm">{room.topic}</Text>}
                    <HStack>
                      <Badge colorScheme="blue">{room.roomType}</Badge>
                      <Badge colorScheme="green">{room.participantCount} online</Badge>
                    </HStack>
                  </VStack>
                  <Text fontSize="sm" color="gray.500">
                    {formatTimeLeft(room.expiresAt)}
                  </Text>
                </HStack>
              </Box>
            ))
          )}
        </VStack>
      )}

      <Button
        leftIcon={<AddIcon />}
        colorScheme="blue"
        mt={4}
        onClick={() => {
          const roomName = prompt("Enter room name (optional):");
          const topic = prompt("Enter topic (optional):");
          handleCreateRoom(roomName, topic);
        }}
      >
        Create Room
      </Button>
    </Box>
  );
};

export default BrowseRooms;