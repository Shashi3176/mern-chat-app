import { Box, Input, Spinner, Text, Button, useToast } from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ChatState } from "../../Context/ChatProvider";
import { useChatNavigation } from "../../Context/ChatNavigationContext";
import RoomListItem from "./RoomListItem.jsx";
import CreateRoomModal from "./CreateRoomModal.jsx";
import { AddIcon } from "@chakra-ui/icons";

const BrowseRoomsSection = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const toast = useToast();
  const { user, joinRoom, setSelectedChat, fetchActiveRooms } = ChatState();
  const { setActiveSection } = useChatNavigation();

  const fetchRooms = useCallback(async () => {
    if (!user) return;
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
  }, [user, search, toast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

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
      fetchActiveRooms();
      setActiveSection("myChats");
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

  const handleRoomCreated = (newRoom) => {
    joinRoom(newRoom._id);
    setSelectedChat(newRoom);
    fetchActiveRooms();
    setActiveSection("myChats");
  };

  return (
    <Box w="100%" h="100%" display="flex" flexDirection="column">
      <Box p={3} borderBottom="1px solid" borderColor="gray.200">
        <Input
          placeholder="Search rooms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="sm"
        />
      </Box>

      <Box flex="1" overflowY="auto">
        {loading ? (
          <Box textAlign="center" py={4}>
            <Spinner />
          </Box>
        ) : (
          <Box>
            {rooms.length === 0 ? (
              <Text p={4} color="gray.500" fontSize="sm" textAlign="center">
                No rooms found. Be the first to create one!
              </Text>
            ) : (
              rooms.map((room) => (
                <RoomListItem
                  key={room._id}
                  room={room}
                  onJoinRoom={handleJoinRoom}
                />
              ))
            )}
          </Box>
        )}
      </Box>

      <Box p={3} borderTop="1px solid" borderColor="gray.200">
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          w="100%"
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create Room
        </Button>
      </Box>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        user={user}
        onRoomCreated={handleRoomCreated}
      />
    </Box>
  );
};

export default BrowseRoomsSection;