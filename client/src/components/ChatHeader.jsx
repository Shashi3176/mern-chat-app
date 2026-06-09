import {
  Avatar,
  Badge,
  Box,
  Button,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider";
import { RoomParticipants, RoomTimer } from "./miscellaneous/RoomComponents";
import { AddIcon, ChatIcon, CloseIcon, RepeatIcon } from "@chakra-ui/icons";
import { useState } from "react";

const isRoomExpired = (room) => {
  if (!room) return false;
  if (room.status && room.status !== "active") return true;
  if (room.expiresAt) return new Date(room.expiresAt).getTime() <= Date.now();
  return false;
};

const getRoomType = (room) => {
  if (room?.roomType === "group") return "Group";
  if (room?.roomType === "direct" && room.roomName) return "Direct";
  return "Random";
};

const getRoomTitle = (room) => {
  if (!room) return "Anonymous Room";
  if (room.roomName) return room.roomName;
  if (room.roomType === "direct") return "Anonymous Partner";
  return "Group Room";
};

const getRoomSubtitle = (room, participantCount) => {
  if (room?.roomType === "group") return `${participantCount || 0} participants`;
  if (room?.roomType === "direct" && room.roomName) return "Direct room";
  if (room?.roomType === "direct") return "Random direct";
  return "Anonymous room";
};

const ChatHeader = ({ onFindNewChat }) => {
  const { selectedChat, leaveRoom, onlineUsers, setSelectedChat } = ChatState();
  const toast = useToast();
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

  const handleLeaveRoom = async () => {
    if (!selectedChat?._id) return;
    try {
      await leaveRoom(selectedChat._id);
      setSelectedChat(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to leave room",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleFindNewChat = async () => {
    if (!selectedChat?._id || isRoomExpired(selectedChat)) return;
    try {
      await onFindNewChat();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to find new chat",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (!selectedChat) return null;

  const expired = isRoomExpired(selectedChat);
  const roomType = getRoomType(selectedChat);
  const headerTitle = getRoomTitle(selectedChat);
  const participantCount = selectedChat.participantCount || onlineUsers[selectedChat._id] || 0;
  const isGroup = selectedChat.roomType === "group";
  const isRandomDirect = selectedChat.roomType === "direct" && !selectedChat.roomName;

  return (
    <>
      <Box
        w="100%"
        flexShrink={0}
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="white"
        className="chat-header"
      >
        <HStack justify="space-between" align="center" spacing={3} minH="72px">
          <HStack align="center" spacing={3} minW={0} className="chat-header-left">
            <Avatar
              name={headerTitle}
              size="lg"
              bg={selectedChat.roomType === "group" ? "teal.500" : "purple.500"}
              className="chat-header-avatar"
              icon={<Icon as={ChatIcon} />}
            />
            <VStack align="start" spacing={0} minW={0}>
              <Text
                fontWeight="bold"
                fontSize={{ base: "md", md: "lg" }}
                noOfLines={1}
                className="chat-header-name"
              >
                {headerTitle}
              </Text>
              <HStack spacing={2} minW={0}>
                <Badge colorScheme={roomType === "Group" ? "teal" : "purple"} className="chat-header-type">
                  {roomType}
                </Badge>
                {isGroup && (
                  <Badge colorScheme="gray" className="chat-header-participants">
                    {participantCount} participants
                  </Badge>
                )}
                <Text fontSize="xs" color="gray.500" noOfLines={1} className="chat-header-subtitle">
                  {getRoomSubtitle(selectedChat, participantCount)}
                </Text>
              </HStack>
            </VStack>
          </HStack>

          <HStack align="center" spacing={2} className="chat-header-actions">
            {selectedChat.expiresAt && (
              <Box className="room-timer-wrapper">
                <RoomTimer room={selectedChat} />
              </Box>
            )}

            {isGroup && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<AddIcon />}
                colorScheme="gray"
                onClick={() => setIsParticipantsOpen(true)}
                aria-label="View participants"
                className="header-action-button"
              >
                <Text className="header-action-label">Participants</Text>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              leftIcon={<CloseIcon />}
              colorScheme="red"
              onClick={handleLeaveRoom}
              aria-label="Leave room"
              className="header-action-button"
            >
              <Text className="header-action-label">Leave</Text>
            </Button>

            {isRandomDirect && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RepeatIcon />}
                colorScheme="blue"
                onClick={handleFindNewChat}
                isDisabled={expired}
                aria-label="Find new chat"
                className="header-action-button"
              >
                <Text className="header-action-label">New chat</Text>
              </Button>
            )}
          </HStack>
        </HStack>
      </Box>

      <Modal isOpen={isParticipantsOpen} onClose={() => setIsParticipantsOpen(false)} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Participants</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <RoomParticipants roomId={selectedChat._id} />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsParticipantsOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ChatHeader;
