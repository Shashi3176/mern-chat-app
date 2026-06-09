import { memo } from "react";
import { HStack, VStack, Box, Badge, Text, Icon } from "@chakra-ui/react";
import { ChatIcon } from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider";

const RoomListItemInner = ({ room, onJoinRoom }) => {
  const { typingUsers } = ChatState();
  const isTyping = !!typingUsers[room._id];
  const formatCreationTime = (createdAt) => {
    if (!createdAt) return "";
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Box
      py={3}
      px={4}
      cursor="pointer"
      bg="white"
      _hover={{ bg: "gray.50" }}
      transition="all 0.15s ease"
      onClick={() => onJoinRoom(room)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onJoinRoom(room)}
    >
      <HStack spacing={3} align="flex-start">
        <Box position="relative" flexShrink={0}>
          <Box
            w={12}
            h={12}
            borderRadius="full"
            bg="blue.400"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="white"
            fontSize="lg"
            fontWeight="bold"
          >
            {room.roomName?.charAt(0).toUpperCase() || <Icon as={ChatIcon} />}
          </Box>
        </Box>

        <VStack align="stretch" spacing={1} flex={1} minW={0}>
          <HStack justify="space-between" align="center" w="100%">
            <Text
              fontSize="sm"
              fontWeight="medium"
              color="gray.900"
              noOfLines={1}
            >
              {room.roomName || "Unnamed Room"}
            </Text>
            <Text fontSize="xs" color="gray.500" whiteSpace="nowrap" ml={2} flexShrink={0}>
              {formatCreationTime(room.createdAt)}
            </Text>
          </HStack>

          <HStack justify="space-between" align="center" w="100%">
            <Text
              fontSize="xs"
              color={isTyping ? "blue.500" : "gray.500"}
              fontWeight={isTyping ? "medium" : "normal"}
              fontStyle={isTyping ? "italic" : "normal"}
              noOfLines={1}
              flex={1}
              lineHeight="tight"
            >
              {isTyping ? "typing..." : (room.topic || "No topic")}
            </Text>
            <Badge colorScheme="green" fontSize="xs" minWidth="20px" textAlign="center">
              {room.participantCount || 0} online
            </Badge>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
};

const RoomListItem = memo(RoomListItemInner);
export default RoomListItem;