import { Box, Spinner, Text, Flex } from "@chakra-ui/react";
import { useEffect } from "react";
import { ChatState } from "../../Context/ChatProvider";
import { useChatItemHelpers } from "./useChatItemHelpers";
import ChatListItem from "./ChatListItem";

const ChatList = ({ onChatSelect, renderItem }) => {
  const { myRooms, loadingRooms, fetchActiveRooms, selectedChat, setSelectedChat, markRoomAsRead } = ChatState();
  const { formatTime } = useChatItemHelpers();

  useEffect(() => {
    fetchActiveRooms();
  }, [fetchActiveRooms]);

  const handleChatClick = async (chat) => {
    setSelectedChat(chat);
    if (chat.unreadCount > 0) {
      await markRoomAsRead(chat._id);
    }
    if (onChatSelect) {
      onChatSelect(chat);
    }
  };

  const isEmpty = !loadingRooms && myRooms.length === 0;

  if (loadingRooms) {
    return (
      <Flex justify="center" align="center" py={10}>
        <Spinner size="lg" color="blue.500" thickness="4px" />
      </Flex>
    );
  }

  if (isEmpty) {
    return (
      <Box py={10} textAlign="center">
        <Text color="gray.500" fontSize="sm">
          No active chats found
        </Text>
        <Text color="gray.400" fontSize="xs" mt={1}>
          Start a conversation to see it here
        </Text>
      </Box>
    );
  }

  return (
    <Box className="chat-list-container" role="list">
      {myRooms.map((chat, index) => (
        <Box key={chat._id} role="listitem" mt={index === 0 ? 0 : 0}>
          {renderItem ? renderItem(chat, handleChatClick) : (
            <ChatListItem
              chat={chat}
              isActive={selectedChat?._id === chat._id}
              onClick={() => handleChatClick(chat)}
            />
          )}
        </Box>
      ))}
    </Box>
  );
};

export default ChatList;