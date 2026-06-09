import { memo } from "react";
import { HStack, VStack, Box, Badge, Text } from "@chakra-ui/react";
import { ChatState } from "../../Context/ChatProvider";
import { useChatItemHelpers } from "./useChatItemHelpers";

const ChatListItemInner = ({ chat, isActive, onChatSelect }) => {
  const { user, typingUsers } = ChatState();
  const helpers = useChatItemHelpers();

  const displayName = chat.chatName || (!chat.isGroupChat && "Random Chat");
  const isDirect = !chat.isGroupChat;
  const isUnread = (chat.unreadCount || 0) > 0;
  const isTyping = !!typingUsers[chat._id];

  const lastMessageText = isTyping
    ? "typing..."
    : helpers.truncate(
        chat.latestMessage?.content || chat.latestMessage,
        40
      );

  return (
    <Box
      py={3}
      px={4}
      cursor="pointer"
      bg={isActive ? "blue.50" : "white"}
      borderLeft={isActive ? "4px solid" : "4px solid transparent"}
      borderColor={isActive ? "blue.500" : "transparent"}
      _hover={{ bg: isActive ? "blue.50" : "gray.50" }}
      transition="all 0.15s ease"
      onClick={onChatSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onChatSelect()}
      minH="64px"
      className="chat-list-item"
      sx={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <HStack spacing={3} align="flex-start">
        <Box position="relative" flexShrink={0}>
          <Box
            w={12}
            h={12}
            borderRadius="full"
            bg={isActive ? "blue.500" : chat.isGroupChat ? "blue.400" : "gray.300"}
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="white"
            fontSize="lg"
            fontWeight="bold"
          >
            {displayName?.charAt(0).toUpperCase() || "U"}
          </Box>
          {isDirect && (
            <Box
              position="absolute"
              bottom={1}
              right={1}
              w={3.5}
              h={3.5}
              borderRadius="full"
              bg="green.400"
              border="2px solid white"
            />
          )}
        </Box>

        <VStack align="stretch" spacing={1} flex={1} minW={0}>
          <HStack justify="space-between" align="center" w="100%">
            <Text
              fontSize="sm"
              fontWeight={isUnread ? "bold" : "medium"}
              color={isUnread ? "gray.900" : "gray.700"}
              noOfLines={1}
            >
              {displayName}
            </Text>
            <Text fontSize="xs" color="gray.500" whiteSpace="nowrap" ml={2} flexShrink={0}>
              {helpers.formatTime(chat.lastMessageTime || chat.updatedAt)}
            </Text>
          </HStack>

          <HStack justify="space-between" align="center" w="100%">
            <Text
              fontSize="xs"
              color={isTyping ? "blue.500" : isUnread ? "gray.700" : "gray.500"}
              fontWeight={isTyping ? "medium" : isUnread ? "medium" : "normal"}
              noOfLines={1}
              flex={1}
              lineHeight="tight"
              fontStyle={isTyping ? "italic" : "normal"}
            >
              {lastMessageText}
            </Text>
            {isUnread && <Badge colorScheme="red" borderRadius="full" ml={2} fontSize="xs" minWidth="20px" textAlign="center">{chat.unreadCount}</Badge>}
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
};

const ChatListItem = memo(ChatListItemInner);
export default ChatListItem;