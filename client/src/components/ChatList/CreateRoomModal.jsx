import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  ModalFooter,
  Button,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import axios from "axios";

const CreateRoomModal = ({ isOpen, onClose, user, onRoomCreated }) => {
  const [roomName, setRoomName] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleCreateRoom = async () => {
    setLoading(true);
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

      toast({
        title: "Room created",
        description: "Your room has been created successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onRoomCreated(data);
      setRoomName("");
      setTopic("");
      onClose();
    } catch (error) {
      toast({
        title: "Error creating room",
        description: error.response?.data?.message || "Failed to create room",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create New Room</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl mb={4}>
            <FormLabel>Room Name (optional)</FormLabel>
            <Input
              placeholder="Enter room name..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Topic (optional)</FormLabel>
            <Textarea
              placeholder="What's this room about?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleCreateRoom} isLoading={loading}>
            Create Room
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreateRoomModal;